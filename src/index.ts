import { createApp } from './server/app';
import { createHttpServer } from './server/http';
import { createScrapeWorker } from './workers/scrapeWorker';
import { logger } from './config/logger';
import { scraperService } from './services/ScraperService';

const port = process.env.PORT || 3000;

// Create application and get components
const { app, scrapeQueue, basePath } = createApp();

// Create HTTP server
const server = createHttpServer(app);

// Start the scrape worker with the advanced scraping system
const worker = createScrapeWorker();

// Handle graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await worker.close();
    await scrapeQueue.close();
    await scraperService.cleanup(); // Nettoyer les ressources du scraper (fermer les navigateurs Puppeteer)
    
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
server.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
    logger.info(`Bull Board is available at http://localhost:${port}${basePath}`);
});
