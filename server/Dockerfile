FROM node:12-alpine

RUN mkdir -p /home/node/chatSecret/node_modules && mkdir -p /home/node/chatSecret/dist && chown -R node:node /home/node/chatSecret

WORKDIR /home/node/chatSecret

COPY package.json yarn.* ./

USER node

RUN yarn

COPY --chown=node:node . .

RUN yarn build

RUN yarn install --production

EXPOSE 3000

CMD ["node", "dist/index.js"]
