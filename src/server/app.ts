import { Hono } from "hono";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { Queue, Worker } from "bullmq";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "../config/config";
import { createScrapeRoutes } from "../routes/scrapeRoutes";
import { createSwaggerRoute } from "../routes/swaggerRoute";
import { loggerMiddleware } from "../middleware/loggerMiddleware";
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { logger } from '../config/logger';

// Create Hono application
export const createApp = () => {
  // Créer l'application principale
  const app = new Hono();

  // Middlewares
  app.use('*', cors());
  app.use('*', prettyJSON());
  app.use('*', async (c, next) => {
    logger.info(`${c.req.method} ${c.req.url}`);
    await next();
  });

  // Setup Bull Queue
  const scrapeQueue = new Queue("scrape-queue", { connection: config.redis });

  // Créer routes API
  app.get("/", (c) => c.text("Bienvenue sur l'API de scraping !"));
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Routes API explicitement sous /api
  const scrapeRouter = createScrapeRoutes(scrapeQueue);
  app.route("/api", scrapeRouter);

  // Setup Swagger OpenAPI Documentation
  const swaggerRouter = createSwaggerRoute();
  app.route('', swaggerRouter);

  // Configure Bull Board - placer à la fin pour éviter les conflits de routes
  const serverAdapter = new HonoAdapter(serveStatic);
  const basePath = "/ui";
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: [new BullMQAdapter(scrapeQueue)],
    serverAdapter,
    options: {
      uiConfig: {
        pollingInterval: {
          forceInterval: 10000, // Rafraîchir toutes les 10 secondes au lieu de la valeur par défaut
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
