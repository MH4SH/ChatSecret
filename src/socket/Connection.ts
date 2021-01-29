import { Server } from 'http';
import * as socketIo from 'socket.io';
import * as openpgp from 'openpgp';
import fs from 'fs';

import { verifySocker, SocketAuth } from '../middlewares/auth';

export interface SocketQuery {
  storeId: string;
  userName: string;
}

const messages: string[] = [];

const connection = (server: Server): void => {
  const io = require('socket.io')({
    path: '/communication',
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

      socket.on('message:new', async (message, timestamp = 1000) => {
        const publicKeyClient = await fs.readFileSync(
          'keys/client.cpu',
          'utf-8'
        );
        const privateKeyServer = await fs.readFileSync(
          'keys/server.cpr',
          'utf-8'
        );

        const objectMessage = {
          message,
          userName: socketQuery.userName
        };

        const {
          keys: [privateKey]
        } = await openpgp.key.readArmored(privateKeyServer);
        await privateKey.decrypt(process.env.PGP_SERVER_TOKEN || '');

        const publicKeys = await Promise.all(
          [publicKeyClient].map(async key => {
            return (await openpgp.key.readArmored(key)).keys[0];
          })
        );

        const { data: newMessage } = await openpgp.encrypt({
          message: openpgp.message.fromText(JSON.stringify(objectMessage)),
          publicKeys,
          privateKeys: [privateKey]
        });

        messages.push(newMessage);

        socket.emit('message:receive', newMessage);

        socket.to('sala-1').emit('message:receive', newMessage);
      });
    });
};

export default connection;
