import { z } from 'zod';
import { ScrapeJobSchema } from '../queues/scrapeQueue';

// Job Status Enum
export const JobStatusEnum = z.enum(['pending', 'active', 'completed', 'failed']).openapi({
  example: 'pending'
});
export type JobStatus = z.infer<typeof JobStatusEnum>;

// Reuse the existing ScrapeJobSchema from the queue
export const ScrapeJobRequestSchema = ScrapeJobSchema.openapi({
  example: {
    source: 'autoscout24',
    query: 'bmw',
    pageCount: 5,
    zip: '10115',
    zipr: '50'
  }
});
export type ScrapeJobRequest = z.infer<typeof ScrapeJobRequestSchema>;

// Response schema based on actual controller responses
export const ScrapeJobResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  jobId: z.string().optional(),
  data: ScrapeJobRequestSchema.optional(),
  state: z.string().optional(),
  progress: z.any().optional(),
  result: z.any().optional(),
  failedReason: z.string().optional(),
  timestamp: z.string(),
  statusCode: z.number().optional(),
}).openapi({
  example: {
    success: true,
    message: 'Job created successfully',
    jobId: '123e4567-e89b-12d3-a456-426614174000',
    data: {
      source: 'autoscout24',
      query: 'bmw',
      pageCount: 5
    },
    state: 'active',
    timestamp: '2023-01-01T00:00:00.000Z'
  }
});
export type ScrapeJobResponse = z.infer<typeof ScrapeJobResponseSchema>;

// Jobs List Response Schema (for GET /scrape)
export const JobsListResponseSchema = z.object({
  success: z.boolean(),
  jobs: z.array(z.any()).optional(),
  message: z.string().optional(),
  timestamp: z.string(),
  statusCode: z.number().optional()
}).openapi({
  example: {
    success: true,
    jobs: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        data: {
          source: 'autoscout24',
          query: 'bmw'
        },
        state: 'completed',
        progress: 100,
        timestamp: '2023-01-01T00:00:00.000Z'
      }
    ],
    message: 'Jobs retrieved successfully',
    timestamp: '2023-01-01T00:00:00.000Z'
  }
}); 