/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import cors from 'cors';
import { Server } from 'http';
import 'dotenv/config';
import path from 'path';

import socker from './socket';
import routes from './routes';
import globalVars from './config/global';

const app = express();
globalVars();
app.use(cors());
app.use(express.json());

const http = new Server(app);

const portOfApplication = 3000;

socker(http);

routes(app);

app.get('/', (req: any, res: any) => {
  res.sendFile(path.resolve('./static/client.html'));
});

export default async (): Promise<void> => {
  http.listen(portOfApplication, () => {
    console.log(`listening on *:${portOfApplication}`);
  });
};
