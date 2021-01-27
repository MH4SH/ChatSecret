import { Server } from 'http';
import * as socketIo from 'socket.io';

import { verifySocker, SocketAuth } from '../middlewares/auth';

export interface SocketQuery {
  storeId: string;
  userName: string;
}

interface Message {
  message: string;
  userName: string;
}

const messages: Message[] = [];

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
        const newMessage = { message, userName: socketQuery.userName };
        messages.push(newMessage);

        socket.emit('message:receive', newMessage);

        socket.to('sala-1').emit('message:receive', newMessage);
      });
    });
};

export default connection;
