import { Server } from 'http';

import Conversation from './Conversation';

const socker = (server: Server): void => {
  Conversation(server);
};

export default socker;
