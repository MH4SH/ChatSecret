import { Server } from 'http';

import Conversation from './Conversation';
import Connection from './Connection';

const socker = (server: Server): void => {
  Conversation(server);
  Connection(server);
};

export default socker;
