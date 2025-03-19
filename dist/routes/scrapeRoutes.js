import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ScrapeJobSchema } from '../queues/scrapeQueue';
import { ScrapeJobService } from '../services/ScrapeJobService';
import { RateLimiterService } from '../services/RateLimiterService';
import { ScrapeController } from '../controllers/ScrapeController';
import rateLimitConfig from '../config/rateLimit';
const scrapeRoutes = new Hono();
export const createScrapeRoutes = (scrapeQueue) => {
    // Initialize services
    const rateLimiter = new RateLimiterService(rateLimitConfig);
    const jobService = new ScrapeJobService(scrapeQueue);
    // Initialize controller with dependencies
    const scrapeController = new ScrapeController(jobService, rateLimiter);
    // Define routes
    scrapeRoutes.post('/scrape', zValidator('json', ScrapeJobSchema), (c) => scrapeController.createScrapeJob(c));
    scrapeRoutes.get('/scrape/:id', (c) => scrapeController.getScrapeJob(c));
    scrapeRoutes.get('/scrape', (c) => scrapeController.getAllScrapeJobs(c));
    return scrapeRoutes;
};
// Export default routes
export default scrapeRoutes;
