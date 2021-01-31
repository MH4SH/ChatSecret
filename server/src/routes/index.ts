import { Application } from 'express';

import AccountRoute from './account.routes';

export default (app: Application): void => {
  app.use('/account', AccountRoute);
};
