import { v4 as uuid } from 'uuid';
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

const conversation = (server: Server): void => {
  const io = require('socket.io')({
    path: '/conversation',
    cors: {
      origin: '*'
    }
  }) as socketIo.Server;

  console.log('Started monit listening!');

  io.attach(server)
    .use(verifySocker)
    .on('connection', (socket: SocketAuth) => {
      const socketQuery = socket.handshake.query as SocketQuery;

      console.log(`Client entrou conversation [id=${socket.id}]`);
      socket.join(socketQuery.userName);

      Redis.hmset(`Users:${socketQuery.userName}:data`, {
        lastAccess: new Date().getTime()
      });

      Redis.keys(
        `Message:to:${socketQuery.userName}:from:*`,
        (err, keys: string[]) => {
          keys.forEach(key => {
            Redis.hmget(key, 'id', 'message', (errGet, data) => {
              socket.emit('message:receive', { id: data[0], message: data[1] });
            });
          });
        }
      );

      socket.on('disconnect', () => {
        console.log(`Client saiu [id=${socket.id}]`);
      });

      socket.on(
        'message:new',
        async ({ to, message }, timestamp = 1000): Promise<void | boolean> => {
          console.time('New Message');
          const id = uuid();

          const publicKeyTo = (
            await new Promise<string[]>(resolve => {
              Redis.hmget(`Users:${to}:data`, 'publicKey', (err, data) =>
                resolve(data)
              );
            })
          )[0];

          const { data: messageToSend } = await openpgp.encrypt({
            message: openpgp.message.fromText(
              JSON.stringify({
                itsMine: false,
                contact: socketQuery.userName,
                message
              })
            ),
            publicKeys: (await openpgp.key.readArmored(publicKeyTo)).keys,
            privateKeys: [globalAny.__PRIVATE_KEY_SERVER__]
          });

          Redis.hmset(`Message:to:${to}:from:${socketQuery.userName}:${id}`, {
            id,
            message: messageToSend,
            dateSended: new Date().getTime()
          });

          socket.to(to).emit('message:receive', { id, message: messageToSend });
          console.timeEnd('New Message');
          return true;
        }
      );

      socket.on(
        'message:new:received',
        async (messageReceived, timestamp = 1000): Promise<void | boolean> => {
          const publicKeyUser = await new Promise(resolve => {
            Redis.hmget(
              `Users:${socketQuery.userName}:data`,
              'publicKey',
              (err, data) => resolve(data[0])
            );
          });

          const decrypted = await openpgp.decrypt({
            message: await openpgp.message.readArmored(messageReceived),
            publicKeys: (await openpgp.key.readArmored(publicKeyUser)).keys,
            privateKeys: [globalAny.__PRIVATE_KEY_SERVER__]
          });

          if (!decrypted.signatures[0].valid) {
            return false;
          }

          const message: { id: string; to: string; from: string } = JSON.parse(
            decrypted.data
          );

          Redis.del(
            `Message:to:${message.to}:from:${message.from}:${message.id}`
          );

          return true;
        }
      );
    });
};

export default conversation;
