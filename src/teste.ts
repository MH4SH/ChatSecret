// import * as openpgp from 'openpgp';
// import 'dotenv/config';
// import fs from 'fs';

// setInterval(() => console.log('Log'), 1000 * 60);

// // const users = {
// //   marcon: {
// //     name: 'Server',
// //     email: 'server@chatsecret.mh4sh.dev',
// //     senha: process.env.PGP_SERVER_TOKEN || '',
// //     privateKey: '',
// //     publicKey: ''
// //   },
// //   murillo: {
// //     name: 'Client',
// //     email: 'client@chatsecret.mh4sh.dev',
// //     senha: process.env.PGP_APP_TOKEN || '',
// //     privateKey: '',
// //     publicKey: ''
// //   }
// // };

// // (async () => {
// //   const marconKeys = await openpgp.generateKey({
// //     numBits: 4096,
// //     passphrase: users.marcon.senha,
// //     userIds: [{ name: users.marcon.name, email: users.marcon.email }]
// //   });

// //   fs.writeFile('keys/server.cpu', marconKeys.publicKeyArmored, err => {
// //     if (err) throw err;
// //     console.log('O arquivo foi criado!');
// //   });
// //   fs.writeFile('keys/server.cpr', marconKeys.privateKeyArmored, err => {
// //     if (err) throw err;
// //     console.log('O arquivo foi criado!');
// //   });

// //   console.log(users.marcon);

// //   users.marcon.privateKey = marconKeys.privateKeyArmored;
// //   users.marcon.publicKey = marconKeys.publicKeyArmored;

// //   const murilloKeys = await openpgp.generateKey({
// //     numBits: 4096,
// //     passphrase: users.murillo.senha,
// //     userIds: [{ name: users.murillo.name, email: users.murillo.email }]
// //   });

// //   users.murillo.privateKey = murilloKeys.privateKeyArmored;
// //   users.murillo.publicKey = murilloKeys.publicKeyArmored;

// //   fs.writeFile('keys/client.cpu', murilloKeys.publicKeyArmored, err => {
// //     if (err) throw err;
// //     console.log('O arquivo foi criado!');
// //   });
// //   fs.writeFile('keys/client.cpr', murilloKeys.privateKeyArmored, err => {
// //     if (err) throw err;
// //     console.log('O arquivo foi criado!');
// //   });
// // })();

// let messageToMurillo = '';

// (async () => {
//   const publicKeyClient = await fs.readFileSync('keys/client.cpu', 'utf-8');
//   const privateKeyServer = await fs.readFileSync('keys/server.cpr', 'utf-8');

//   const {
//     keys: [privateKey]
//   } = await openpgp.key.readArmored(privateKeyServer);
//   await privateKey.decrypt(process.env.PGP_SERVER_TOKEN || '');

//   const publicKeys = await Promise.all(
//     [publicKeyClient].map(async key => {
//       return (await openpgp.key.readArmored(key)).keys[0];
//     })
//   );

//   const { data: encrypted } = await openpgp.encrypt({
//     message: openpgp.message.fromText('Hello, World!'),
//     publicKeys,
//     privateKeys: [privateKey]
//   });

//   messageToMurillo = encrypted;
//   console.log(messageToMurillo);
// })();

// (async () => {
//   const {
//     keys: [privateKey]
//   } = await openpgp.key.readArmored(client.clientPrivateKey);
//   await privateKey.decrypt(
//     '6b657920646520617574656e74696361c3a7c3a36f2064612061706c696361c3a7c3a36f'
//   );

//   const decrypted = await openpgp.decrypt({
//     message: await openpgp.message.readArmored(client.message), // parse armored message
//     publicKeys: (await openpgp.key.readArmored(client.serverPublicKey)).keys, // for verification (optional)
//     privateKeys: [privateKey] // for decryption
//   });
//   console.log(decrypted.data, decrypted);
// })();
