/* eslint-disable no-underscore-dangle */
import fs from 'fs';
import path from 'path';
import * as openpgp from 'openpgp';

const globalVars = async (): Promise<void> => {
  const publicKeyClientArmored = await fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'keys', 'client.cpu'),
    'utf-8'
  );
  const [publicKeyClient] = (
    await openpgp.key.readArmored(publicKeyClientArmored)
  ).keys;

  const privateKeyServerArmored = await fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'keys', 'server.cpr'),
    'utf-8'
  );
  const {
    keys: [privateKeyServer]
  } = await openpgp.key.readArmored(privateKeyServerArmored);
  await privateKeyServer.decrypt(process.env.PGP_SERVER_TOKEN || '');

  global.__PUBLIC_KEY_CLIENT__ = publicKeyClient;
  global.__PRIVATE_KEY_SERVER__ = privateKeyServer;
};

export default globalVars;
