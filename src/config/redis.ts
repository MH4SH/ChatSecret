export default {
    url: process.env.REDIS_URL
        ? process.env.REDIS_URL
        : `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
};
