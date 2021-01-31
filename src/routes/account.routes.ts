/* eslint-disable consistent-return */
import { Response, Router } from 'express';
import * as openpgp from 'openpgp';
import fs from 'fs';

import Redis from '../lib/Redis';

const Account = Router();

Account.post('/', async (request, response) => {
  const { user, key: keyEncrypted } = request.body;

  try {
    const publicKeyClient = await fs.readFileSync('keys/client.cpu', 'utf-8');
    const privateKeyServer = await fs.readFileSync('keys/server.cpr', 'utf-8');

    const {
      keys: [privateKey]
    } = await openpgp.key.readArmored(privateKeyServer);
    console.log(process.env.PGP_SERVER_TOKEN || '');
    await privateKey.decrypt(process.env.PGP_SERVER_TOKEN || '');

    const key = await openpgp.decrypt({
      message: await openpgp.message.readArmored(keyEncrypted),
      publicKeys: (await openpgp.key.readArmored(publicKeyClient)).keys,
      privateKeys: [privateKey]
    });

    if (!key.signatures[0].valid) {
      return response.status(400).json({
        status: 'error',
        messageCode: '2',
        message: 'Assinatura PGP inválida!'
      });
    }

    const publicKey = (await openpgp.key.readArmored(key.data)).keys[0];

    console.log(publicKey.getUserIds());

    if (
      publicKey.getUserIds()[0] !==
      `${user} <${user}.user@chatsecret.mh4sh.dev>`
    ) {
      return response.status(400).json({
        status: 'error',
        messageCode: '2',
        message: 'Assinatura PGP inválida!'
      });
    }

    const hasUser = await new Promise(resolve => {
      Redis.hmget(`Users:${user}:data`, 'status', (err, data) =>
        resolve(data[0])
      );
    });

    if (hasUser !== null) {
      return response.status(400).json({
        status: 'error',
        messageCode: '1',
        message: 'Usuário já esta em uso!'
      });
    }

    Redis.hmset(`Users:${user}:data`, {
      user,
      emailId: `${user} <${user}.user@chatsecret.mh4sh.dev>`,
      status: 'active',
      publicKey: key.data,
      lastAccess: new Date().getTime()
    });

    return response.status(201).json({});
  } catch (err) {
    return response.status(400).json({ error: JSON.stringify(err) });
  }
});

export default Account;
