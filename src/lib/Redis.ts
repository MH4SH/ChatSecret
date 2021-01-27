import redis from 'redis';
import configRedis from '../config/redis';

export default redis.createClient({ url: configRedis.url });
