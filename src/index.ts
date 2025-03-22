import { createApp } from "./server/app";
import { createScrapeWorker } from "./workers/scrapeWorker";
import { logger } from "./config/logger";
import { scraperService } from "./services/ScraperService";
import { configureSocketIO } from "./config/socketio";
import { cors } from "hono/cors";
import { createSwaggerRoute } from "./routes/swagger.route";
import scrapeRoutes from "./routes/scrape.routes";
import { WebSocketService } from './services/WebSocketService';
import { serve } from '@hono/node-server'

const port = Number(process.env.PORT) || 3000;

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

// Create HTTP server with Hono
const server = serve({
  fetch: app.fetch,
  port
});

// Initialize services
export const wsService = new WebSocketService(server);
const worker = createScrapeWorker();
const io = configureSocketIO(server);

// Handle graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await worker.close();
    await scrapeQueue.close();
    await scraperService.cleanup();
    
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Single startup message
// logger.info(`
// 🚀 Scraping API démarrée avec succès
// -------------------------------------------
// 📚 Documentation    : http://localhost:${port}/docs
// 📊 Dashboard       : http://localhost:${port}${basePath}
// 🔌 WebSocket       : ws://localhost:${port}
// -------------------------------------------`);

export { app, io };

