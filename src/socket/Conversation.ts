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

      console.log(`Client entrou [id=${socket.id}]`);
      socket.join(`sala-1`);

      messages.forEach(message => {
        socket.emit('message:receive', message);
      });

      socket.on('disconnect', () => {
        console.log(`Client saiu [id=${socket.id}]`);
      });

      socket.on(
        'message:new',
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

          messages.push(message);

          socket.emit('message:receive', message);

          socket.to('sala-1').emit('message:receive', message);

          return true;
        }
      );
    });
};

export default conversation;
