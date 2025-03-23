import { createApp } from "./server/app";
import { createScrapeWorker } from "./workers/scrapeWorker";
import { logger } from "./config/logger";
import { scraperService } from "./services/ScraperService";
import { cors } from "hono/cors";
import { createSwaggerRoute } from "./routes/swagger.route";
import { createHttpServer } from './server/http';
import { WebSocketService } from './services/WebSocketService';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';

const port = Number(process.env.PORT) || 3000;

// Create application and get components
const { app, scrapeQueue, basePath } = createApp();

// Create HTTP server manually instead of using 'serve'
const httpServer = createServer();

// Initialize WebSocket Service with the HTTP server
const wsService = WebSocketService.initialize({ server: httpServer });

// CORS middleware for Hono app
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Routes
app.route('/', createSwaggerRoute());

// Import routes after WebSocket initialization
import scrapeRoutes from "./routes/scrape.route";
app.route('/', scrapeRoutes);

// Get health
app.get('/health', (c) => c.json({ status: 'ok' }));

// Connect Hono app to the HTTP server
httpServer.on('request', async (req, res) => {
  try {
    // Convert Node.js request to Fetch request
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    // Create headers from request
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
    });
    
    // Handle request body for POST/PUT requests
    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
      }
      if (chunks.length > 0) {
        body = Buffer.concat(chunks);
      }
    }
    
    const fetchRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body
    });
    
    // Process with Hono
    const response = await app.fetch(fetchRequest);
    
    // Write response back
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    // Stream the response body
    if (response.body) {
      const buffer = await response.arrayBuffer();
      res.end(Buffer.from(buffer));
    } else {
      res.end();
    }
  } catch (error) {
    logger.error('Request handling error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Initialize worker
const worker = createScrapeWorker();

// Start the server
httpServer.listen(port, () => {
  const baseUrl = `http://localhost:${port}`;
  logger.info(`
🚀 Scraping API démarrée avec succès
-------------------------------------------
📚 Documentation    : ${baseUrl}/docs
📊 Dashboard       : ${baseUrl}${basePath}
🔌 WebSocket       : ${baseUrl}/socket.io
-------------------------------------------`);
});

// Handle graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  await worker.close();
  await scrapeQueue.close();
  await scraperService.cleanup();
  
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, wsService };

