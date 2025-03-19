// import sources from "./sources.json";
import { config as dotenvConfig } from "dotenv";
dotenvConfig();
/**
 * Configuration globale de l'application
 */
export const config = {
    // Port du serveur
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    // Niveau de journalisation
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    // Configuration Redis
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    // Configuration des queues Bull
    SCRAPE_QUEUE_NAME: 'scrape-queue',
    SCRAPE_QUEUE_CONCURRENCY: process.env.SCRAPE_QUEUE_CONCURRENCY ? parseInt(process.env.SCRAPE_QUEUE_CONCURRENCY) : 2,
    // Configuration de Bull Board
    BULL_BOARD_ENABLED: process.env.BULL_BOARD_ENABLED !== 'false',
    BULL_BOARD_PATH: '/ui/queues',
    // Configuration du scraping
    DEFAULT_SCRAPE_TIMEOUT: process.env.DEFAULT_SCRAPE_TIMEOUT ? parseInt(process.env.DEFAULT_SCRAPE_TIMEOUT) : 30000,
    MAX_RETRIES: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : 3,
    // Configuration des services
    PRODUCT_CHECKER_TIMEOUT: process.env.PRODUCT_CHECKER_TIMEOUT ? parseInt(process.env.PRODUCT_CHECKER_TIMEOUT) : 30000,
};
export default config;
