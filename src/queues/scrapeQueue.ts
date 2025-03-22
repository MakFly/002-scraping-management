import { Queue, QueueEvents } from 'bullmq';
import { z } from 'zod';
import { redisConnection } from '../config/redis';
import { logger } from '../config/logger';

export const ScrapeJobSchema = z.object({
    source: z.string(),
    query: z.string().optional(),
    pageCount: z.number().optional().default(1),
    // Nouveaux paramètres spécifiques pour AutoScout24
    zip: z.string().optional(), // Code postal
    zipr: z.string().optional(), // Rayon autour du code postal
    jobId: z.number() // Add jobId field
});

export type ScrapeJob = z.infer<typeof ScrapeJobSchema>;

export const scrapeQueue = new Queue<ScrapeJob>('scrape-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
    }
});

// Setup QueueEvents for event handling (recommended approach)
const queueEvents = new QueueEvents('scrape-queue', {
    connection: redisConnection
});

// Queue events are properly typed in QueueEvents class
scrapeQueue.on('error', (error: Error) => {
    logger.error(`Scrape Queue Error: ${error.message}`);
});

// Use QueueEvents for job lifecycle events
queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Job ${jobId} failed in queue: ${failedReason}`);
});

queueEvents.on('stalled', ({ jobId }) => {
    logger.warn(`Job ${jobId} is stalled in queue`);
});

queueEvents.on('completed', ({ jobId }) => {
    logger.info(`Job ${jobId} completed in queue`);
});

export default scrapeQueue;