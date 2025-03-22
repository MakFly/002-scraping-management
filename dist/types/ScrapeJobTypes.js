import { z } from 'zod';
// Enums
export const JobStatusEnum = z.enum([
    'idle',
    'running',
    'completed',
    'failed',
    'cancelled'
]);
// Base schemas
export const ScrapeJobRequestSchema = z.object({
    name: z.string(),
    target: z.string().url(),
    schedule: z.string().optional(),
    config: z.record(z.any())
});
export const ScrapeJobResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: JobStatusEnum,
    target: z.string(),
    config: z.record(z.any()),
    schedule: z.string().optional(),
    nextScheduledRun: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const JobHistoryEntrySchema = z.object({
    startTime: z.string(),
    endTime: z.string().optional(),
    status: z.string(),
    itemsScraped: z.number(),
    errors: z.array(z.string()).optional(),
});
export const JobDetailsSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: JobStatusEnum,
    target: z.string(),
    config: z.record(z.any()),
    schedule: z.string().optional(),
    nextScheduledRun: z.string().optional(),
    history: z.array(JobHistoryEntrySchema),
    createdAt: z.string(),
    updatedAt: z.string()
});
// Pagination
export const PaginationSchema = z.object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(10)
});
export const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().nullable(),
    count: z.number()
});
// Stats
export const StatsSchema = z.object({
    totalJobs: z.number(),
    activeJobs: z.number(),
    completedToday: z.number(),
    failedToday: z.number(),
    totalItemsScraped: z.number()
});
// WebSocket Events
export const WebSocketEventSchema = z.object({
    type: z.enum(['job_started', 'job_completed', 'job_failed', 'item_scraped']),
    jobId: z.string(),
    timestamp: z.string(),
    data: z.record(z.any())
});
export const JobsListResponseSchema = z.object({
    items: z.array(ScrapeJobResponseSchema),
    pageInfo: z.object({
        hasNextPage: z.boolean(),
        nextCursor: z.string().nullable(),
        count: z.number(),
    }),
});
