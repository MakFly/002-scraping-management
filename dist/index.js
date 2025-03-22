import { createApp } from "./server/app";
import { createScrapeWorker } from "./workers/scrapeWorker";
import { logger } from "./config/logger";
import { scraperService } from "./services/ScraperService";
import { configureSocketIO } from "./config/socketio";
import { cors } from "hono/cors";
import { createSwaggerRoute } from "./routes/swaggerRoute";
import scrapeRoutes from "./routes/scrapeRoutes";
import { WebSocketService } from './services/WebSocketService';
import { createServer } from 'http';
const port = process.env.PORT || 3000;
// Create application and get components
const { app, scrapeQueue, basePath } = createApp();
// CORS middleware
app.use('*', cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
// Routes
app.route('/', createSwaggerRoute());
app.route('/', scrapeRoutes);
// Get health
app.get('/health', (c) => c.json({ status: 'ok' }));
// Create HTTP server
const server = createServer();
// Initialize WebSocket service
export const wsService = new WebSocketService(server);
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
const io = configureSocketIO(server);
export { app, io };
