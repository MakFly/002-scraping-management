# BullMQ with Hono.js: Task Queue Integration Guide

## Overview
BullMQ is a Redis-based queue for Node.js that enables robust background job processing. This guide demonstrates how to integrate BullMQ with Hono.js for efficient task queue management.

## Installation

```bash
pnpm add bullmq ioredis
```

## Basic Setup Example

```typescript
import { Hono } from 'hono'
import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'

// Initialize Hono app
const app = new Hono()

// Redis connection
const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
})

// Create a queue
const emailQueue = new Queue('email-queue', { connection })

// Create a worker
const worker = new Worker('email-queue', async job => {
    console.log(`Processing job ${job.id}:`, job.data)
    // Email sending logic here
    return { success: true, messageId: 'some-id' }
}, { connection })

// Error handling for worker
worker.on('completed', job => console.log(`Job ${job.id} completed`))
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed: ${err.message}`))

// API endpoint to add jobs to queue
app.post('/api/send-email', async (c) => {
    const data = await c.req.json()
    
    const job = await emailQueue.add('send-email', {
        to: data.to,
        subject: data.subject,
        body: data.body
    })
    
    return c.json({ success: true, jobId: job.id }, 202)
})

// Get job status
app.get('/api/job/:id', async (c) => {
    const jobId = c.req.param('id')
    const job = await emailQueue.getJob(jobId)
    
    if (!job) return c.json({ error: 'Job not found' }, 404)
    
    const state = await job.getState()
    return c.json({ id: job.id, state, data: job.data })
})

export default app
```

## Production Example

Here's a more comprehensive example for production use:

```typescript
// src/queues/email-queue.ts
import { Queue } from 'bullmq'
import { redisConnection } from '../config/redis'

export interface EmailJob {
    to: string
    subject: string
    body: string
    attachments?: Array<{filename: string, content: string}>
}

export const emailQueue = new Queue<EmailJob>('email', { 
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200      // Keep last 200 failed jobs
    }
})

// src/workers/email-worker.ts
import { Worker } from 'bullmq'
import { redisConnection } from '../config/redis'
import { EmailJob } from '../queues/email-queue'
import { logger } from '../utils/logger'

export const startEmailWorker = () => {
    const worker = new Worker<EmailJob>('email', async (job) => {
        logger.info(`Processing email job ${job.id} to ${job.data.to}`)
        
        // Process email job
        // Add your email sending logic
        
        return { sent: true, timestamp: new Date().toISOString() }
    }, { 
        connection: redisConnection,
        concurrency: 10,  // Process 10 jobs concurrently
        limiter: {
            max: 100,       // Max 100 jobs
            duration: 60000 // per minute
        }
    })

    // Monitor events
    worker.on('completed', job => logger.info(`Job ${job.id} completed`))
    worker.on('failed', (job, err) => logger.error(`Job ${job.id} failed: ${err.message}`))

    return worker
}

// src/index.ts
import app from './app'
import { startEmailWorker } from './workers/email-worker'

// Start worker
const emailWorker = startEmailWorker()

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    await emailWorker.close()
    process.exit(0)
})

export default {
    port: 3000,
    fetch: app.fetch
}
```

## Advanced Features

### Scheduled Jobs

```typescript
// Schedule a job to run after delay
await emailQueue.add('delayed-email', data, { delay: 60000 }) // Run after 1 minute

// Recurring jobs
await emailQueue.add('newsletter', data, {
    repeat: {
        pattern: '0 9 * * 1' // Every Monday at 9am
    }
})
```

### Job Priorities

```typescript
// Higher priority jobs are processed first (lower number = higher priority)
await emailQueue.add('urgent-email', data, { priority: 1 })
await emailQueue.add('normal-email', data, { priority: 5 })
```

## Best Practices

1. **Separate workers from API servers** - Run queue workers on separate processes/containers
2. **Implement proper error handling** - Retry strategies, monitoring failed jobs
3. **Monitor queue health** - Use Bull-Board or other monitoring tools
4. **Handle graceful shutdowns** - Close workers properly before terminating
5. **Set appropriate job retention policies** - Don't keep all completed jobs forever
6. **Use job lifecycles** - Progress updates, custom events, etc.

## Additional Resources

- Consider using `@bull-board/api` for queue visualization
- Implement rate limiting for external API calls in your workers
- Set up proper logging and alerting for failed jobs

For more examples and details, refer to [BullMQ Documentation](https://docs.bullmq.io/) and [Hono.js Documentation](https://hono.dev).