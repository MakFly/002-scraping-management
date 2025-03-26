import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ScrapeController } from '../controllers/scrape.controller';

// Validation schemas
const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  includeResults: z.coerce.boolean().default(false),
});

const createJobSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('leboncoin'),
    params: z.object({
      filters: z.object({
        category: z.object({
          id: z.string()
        }),
        enums: z.object({
          ad_type: z.array(z.string()),
          u_car_brand: z.array(z.string()).optional()
        }),
        location: z.record(z.any())
      }),
      limit: z.number(),
      limit_alu: z.number(),
      sort_by: z.string(),
      sort_order: z.enum(['desc', 'asc']),
      offset: z.number(),
      extend: z.boolean(),
      listing_source: z.string()
    }),
    pagination: z.number().int().min(1).optional()
  }),
  z.object({
    source: z.literal('autoscout24'),
    query: z.string().optional(),
    pageCount: z.number().int().min(1).max(10).default(1),
    zip: z.string().optional(),
    zipr: z.string().optional()
  }),
  z.object({
    source: z.literal('ebay'),
    query: z.string().optional(),
    pageCount: z.number().int().min(1).max(10).default(1),
  })
]);

// Create router
const router = new Hono();
const controller = new ScrapeController();

// SSE endpoint for real-time updates
router.get('/api/v1/scraping/events', (c) => controller.subscribeToEvents(c));

// List jobs with pagination (for dashboard)
router.get('/api/v1/scraping/jobs', zValidator('query', paginationSchema), (c) => controller.getAllScrapeJobs(c));

// Get all jobs for history (with pagination and optional results)
router.get('/api/v1/scraping/jobs/history', zValidator('query', paginationSchema), (c) => controller.getAllJobsHistory(c));

// Get detailed results for a specific history entry
router.get('/api/v1/scraping/jobs/history/:historyId/results', (c) => controller.getJobHistoryResults(c));

// Get job details
router.get('/api/v1/scraping/jobs/:id', (c) => controller.getScrapeJob(c));

// Create new job
router.post('/api/v1/scraping/jobs', zValidator('json', createJobSchema), (c) => controller.createScrapeJob(c));

// Run job manually
router.post('/api/v1/scraping/jobs/:id/run', (c) => controller.runScrapeJob(c));

// Get global stats
router.get('/api/v1/scraping/stats', (c) => controller.getStats(c));

export default router;
