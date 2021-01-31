import { Server } from 'http';
import * as socketIo from 'socket.io';
import * as openpgp from 'openpgp';
import fs from 'fs';
import Redis from '../lib/Redis';

import { verifySocker, SocketAuth } from '../middlewares/auth';

export interface SocketQuery {
  userName: string;
}
const globalAny: any = global;

const connection = (server: Server): void => {
  const io = require('socket.io')({
    path: '/connection',
    cors: {
      origin: '*'
    }
  }) as socketIo.Server;

  console.log('Started monit listening!');

  io.attach(server)
    // .use(verifySocker)
    .on('connection', (socket: SocketAuth) => {
      const socketQuery = socket.handshake.query as SocketQuery;

      console.log(`Client entrou connection [id=${socket.id}]`);
      socket.join(socketQuery.userName);

      Redis.hmset(`Users:${socketQuery.userName}:data`, {
        lastAccess: new Date().getTime()
      });

      Redis.keys(
        `Contact:add:${socketQuery.userName}:per:*`,
        (err, keys: string[]) => {
          keys.forEach(key => {
            Redis.hmget(key, 'contact', (errGet, data) => {
              socket.emit('contact:new', data[0]);
            });
          });
        }
      );

      /**
       * Verify is Online
       */

      socket.on(
        'contact:add',
        async (contactEncrypted, timestamp = 1000): Promise<void | boolean> => {
          const publicKeyUser = (
            await new Promise<string[]>(resolve => {
              Redis.hmget(
                `Users:${socketQuery.userName}:data`,
                'publicKey',
                (err, data) => resolve(data)
              );
            })
          )[0];

          const decrypted = await openpgp.decrypt({
            message: await openpgp.message.readArmored(contactEncrypted),
            publicKeys: (await openpgp.key.readArmored(publicKeyUser)).keys,
            privateKeys: [globalAny.__PRIVATE_KEY_SERVER__]
          });

          if (!decrypted.signatures[0].valid) {
            return false;
          }

          const contact = JSON.parse(decrypted.data);

          const [publicKeyDestination] = await new Promise<string[]>(
            resolve => {
              Redis.hmget(
                `Users:${contact.user}:data`,
                'publicKey',
                (err, data) => resolve(data)
              );
            }
          );

          if (publicKeyDestination === null) {
            const { data: errorContact } = await openpgp.encrypt({
              message: openpgp.message.fromText(
                JSON.stringify({
                  status: 'error',
                  messageCode: '3',
                  message: 'Contato não existe!',
                  contact: contact.user
                })
              ),
              publicKeys: (await openpgp.key.readArmored(publicKeyUser)).keys,
              privateKeys: [globalAny.__PRIVATE_KEY_SERVER__]
            });

            socket.emit('contact:error', errorContact);
          }

          const { data: newContact } = await openpgp.encrypt({
            message: openpgp.message.fromText(JSON.stringify(contact)),
            publicKeys: (await openpgp.key.readArmored(publicKeyDestination))
              .keys,
            privateKeys: [globalAny.__PRIVATE_KEY_SERVER__]
          });

          Redis.hmset(
            `Contact:add:${contact.user}:per:${socketQuery.userName}`,
            {
              contact: newContact,
              dateStart: new Date().getTime()
            }
          );

          socket.to(contact.user).emit('contact:new', newContact);

          return true;
        }
      );

      socket.on(
        'contact:add:received',
        async (contactReceived, timestamp = 1000): Promise<void | boolean> => {
          try {
            const publicKeyUser = await new Promise(resolve => {
              Redis.hmget(
                `Users:${socketQuery.userName}:data`,
                'publicKey',
                (err, data) => resolve(data[0])
              );
            });

            const decrypted = await openpgp.decrypt({
              message: await openpgp.message.readArmored(contactReceived),
              publicKeys: (await openpgp.key.readArmored(publicKeyUser)).keys,
              privateKeys: [globalAny.__PRIVATE_KEY_SERVER__]
            });

            if (!decrypted.signatures[0].valid) {
              return false;
            }

            const contact: { to: string; from: string } = JSON.parse(
              decrypted.data
            );

            Redis.del(`Contact:add:${contact.to}:per:${contact.from}`);

            return true;
          } catch (err) {
            console.log(err);
          }
        }
      );
    });
};

export default connection;
