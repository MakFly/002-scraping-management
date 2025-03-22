import { Hono } from "hono";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { Queue, Worker } from "bullmq";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "../config/config";
import scrapeRoutes from "../routes/scrape.routes";
import { createSwaggerRoute } from "../routes/swagger.route";
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { logger } from '../config/logger';
import { errorMiddleware } from '../middleware/errorMiddleware';

// Create Hono application
export const createApp = () => {
  // Créer l'application principale
  const app = new Hono();

  // Middlewares
  app.use('*', cors());
  app.use('*', prettyJSON());
  app.use('*', errorMiddleware);
  app.use('*', async (c, next) => {
    if (!c.req.url.includes('/dashboard')) { // Ne pas logger les requêtes du dashboard
      logger.info(`${c.req.method} ${c.req.url}`);
    }
    await next();
  });

  // Setup Bull Queue
  const scrapeQueue = new Queue("scrape-queue", { connection: config.redis });

  // Créer routes API
  app.get("/", (c) => c.text("Bienvenue sur l'API de scraping !"));
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Routes API explicitement sous /api
  app.route("/api", scrapeRoutes);

  // Setup Swagger OpenAPI Documentation
  const swaggerRouter = createSwaggerRoute();
  app.route('/docs', swaggerRouter);

  // Configure Bull Board
  const serverAdapter = new HonoAdapter(serveStatic);
  const basePath = "/dashboard";
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: [new BullMQAdapter(scrapeQueue)],
    serverAdapter,
    options: {
      uiConfig: {
        pollingInterval: {
          forceInterval: 10000,
        },
      },
    },
  });

  // Register Bull Board plugin
  app.route(basePath, serverAdapter.registerPlugin());

  // Static files
  app.use("/static/*", serveStatic({ root: "./public" }));

  return {
    app,
    scrapeQueue,
    basePath,
  };
};
