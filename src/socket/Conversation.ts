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

      console.log(`Client entrou conversation [id=${socket.id}]`);
      socket.join(socketQuery.userName);

      Redis.hmset(`Users:${socketQuery.userName}:data`, {
        conversation: socket.id,
        lastAccess: new Date().getTime()
      });

      messages.forEach(message => {
        socket.emit('message:receive', message);
      });

      socket.on('disconnect', () => {
        console.log(`Client saiu [id=${socket.id}]`);
      });

      socket.on(
        'message:new',
        async ({ to, message }, timestamp = 1000): Promise<void | boolean> => {
          const privateKeyServer = await fs.readFileSync(
            'keys/server.cpr',
            'utf-8'
          );
          const {
            keys: [privateKey]
          } = await openpgp.key.readArmored(privateKeyServer);
          await privateKey.decrypt(process.env.PGP_SERVER_TOKEN || '');

          const keyUser = (
            await new Promise<string[]>(resolve => {
              Redis.hmget(
                `Users:${socketQuery.userName}:data`,
                'publicKey',
                (err, data) => resolve(data)
              );
            })
          )[0];

          const { data: returnMessage } = await openpgp.encrypt({
            message: openpgp.message.fromText(
              JSON.stringify({
                itsMine: true,
                contact: to,
                message
              })
            ),
            publicKeys: (await openpgp.key.readArmored(keyUser)).keys,
            privateKeys: [privateKey]
          });

          socket.emit('message:receive', returnMessage);

          const keyUserTo = (
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
            publicKeys: (await openpgp.key.readArmored(keyUserTo)).keys,
            privateKeys: [privateKey]
          });
          socket.to(to).emit('message:receive', messageToSend);

          return true;
        }
      );
    });
};

export default conversation;
