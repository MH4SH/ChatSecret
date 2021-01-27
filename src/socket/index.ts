import { Server } from 'http';

import Connection from './Connection';

const socker = (server: Server): void => {
  Connection(server);
};

export default socker;
