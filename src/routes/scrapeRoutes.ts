import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ScrapeController } from '../controllers/ScrapeController';

// Validation schemas
const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10),
});

const createJobSchema = z.object({
  source: z.string(),
  query: z.string().optional(),
  pageCount: z.number().int().min(1).max(10).default(1),
  zip: z.string().optional(),
  zipr: z.string().optional()
});

// Create router
const router = new Hono();
const controller = new ScrapeController();

// List jobs with pagination
router.get('/api/v1/scraping/jobs', zValidator('query', paginationSchema), (c) => controller.getAllScrapeJobs(c));

// Create new job
router.post('/api/v1/scraping/jobs', zValidator('json', createJobSchema), (c) => controller.createScrapeJob(c));

// Get job details
router.get('/api/v1/scraping/jobs/:id', (c) => controller.getScrapeJob(c));

// Run job manually
router.post('/api/v1/scraping/jobs/:id/run', (c) => controller.runScrapeJob(c));

// Get global stats
router.get('/api/v1/scraping/stats', (c) => controller.getStats(c));

export default router;
