import { Server } from 'http';
import * as socketIo from 'socket.io';
import * as openpgp from 'openpgp';
import fs from 'fs';
import Redis from '../lib/Redis';

import { verifySocker, SocketAuth } from '../middlewares/auth';

export interface SocketQuery {
  userName: string;
}

const messages: string[] = [];

const connection = (server: Server): void => {
  const io = require('socket.io')({
    path: '/connection',
    cors: {
      origin: '*'
    }
  }) as socketIo.Server;

  console.log('Started monit listening!');

  io.attach(server)
    .use(verifySocker)
    .on('connection', (socket: SocketAuth) => {
      const socketQuery = socket.handshake.query as SocketQuery;

      console.log(`Client entrou connection [id=${socket.id}]`);

      Redis.hmset(`Users:${socketQuery.userName}:data`, {
        connection: socket.id,
        lastAccess: new Date().getTime()
      });

      /**
       * Add Contact
       *  * Ver se o usuário existe
       *  * Esperar ele aceitar
       *  * Gerar key para conversa e enviar publicKey
       *  * Ao Receber key do outro user, gerar a sua e enviar.
       *
       * Verify is Online
       */

      socket.on(
        'contact:add',
        async (message, timestamp = 1000): Promise<void | boolean> => {
          const privateKeyServer = await fs.readFileSync(
            'keys/server.cpr',
            'utf-8'
          );

          const publicKey = await new Promise(resolve => {
            Redis.hmget(
              `Users:${socketQuery.userName}:data`,
              'publicKey',
              (err, data) => resolve(data[0])
            );
          });

          const {
            keys: [privateKey]
          } = await openpgp.key.readArmored(privateKeyServer);
          await privateKey.decrypt(process.env.PGP_SERVER_TOKEN || '');

          const decrypted = await openpgp.decrypt({
            message: await openpgp.message.readArmored(message),
            publicKeys: (await openpgp.key.readArmored(publicKey)).keys,
            privateKeys: [privateKey]
          });

          if (!decrypted.signatures[0].valid) {
            return false;
          }

          const contact = JSON.parse(decrypted.data);

          const [publicKeyDestination, socketIdConnection] = await new Promise<
            string[]
          >(resolve => {
            Redis.hmget(
              `Users:${contact.user}:data`,
              'publicKey',
              'connection',
              (err, data) => resolve(data)
            );
          });

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
              publicKeys: (await openpgp.key.readArmored(publicKeyDestination))
                .keys,
              privateKeys: [privateKey]
            });

            socket.emit('contact:error', errorContact);
          }

          const { data: newContact } = await openpgp.encrypt({
            message: openpgp.message.fromText(JSON.stringify(contact)),
            publicKeys: (await openpgp.key.readArmored(publicKeyDestination))
              .keys,
            privateKeys: [privateKey]
          });

          Redis.hmset(
            `Contact:add:${contact.user}:per:${socketQuery.userName}`,
            {
              contact: newContact,
              dateStart: new Date().getTime()
            }
          );

          socket.to(socketIdConnection).emit('contact:new', newContact);

          return true;
        }
      );

      socket.on(
        'contact:add:received',
        async (message, timestamp = 1000): Promise<void | boolean> => {
          const privateKeyServer = await fs.readFileSync(
            'keys/server.cpr',
            'utf-8'
          );

          const publicKey = await new Promise(resolve => {
            Redis.hmget(
              `Users:${socketQuery.userName}:data`,
              'publicKey',
              (err, data) => resolve(data[0])
            );
          });

          const {
            keys: [privateKey]
          } = await openpgp.key.readArmored(privateKeyServer);
          await privateKey.decrypt(process.env.PGP_SERVER_TOKEN || '');

          const decrypted = await openpgp.decrypt({
            message: await openpgp.message.readArmored(message),
            publicKeys: (await openpgp.key.readArmored(publicKey)).keys,
            privateKeys: [privateKey]
          });

          if (!decrypted.signatures[0].valid) {
            return false;
          }

          const contact: { to: string; from: string } = JSON.parse(
            decrypted.data
          );

          Redis.del(`Contact:add:${contact.to}:per:${contact.from}`);

          return true;
        }
      );
    });
};

export default connection;
