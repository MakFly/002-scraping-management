import { Redis } from 'ioredis';
import { logger } from './logger';

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
        if (times > 3) {
            logger.error('Redis connection failed');
            return null;
        }
        return Math.min(times * 500, 2000);
    }
};

export const redisConnection = new Redis(redisConfig);

redisConnection.on('error', (error) => {
    logger.error(`Redis Error: ${error.message}`);
});

redisConnection.on('connect', () => {
    logger.info('Redis connected successfully');
});

export default redisConnection;