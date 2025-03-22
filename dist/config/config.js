// import sources from "./sources.json";
import { config as dotenvConfig } from "dotenv";
dotenvConfig();
export const config = {
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
    },
    server: {
        port: parseInt(process.env.PORT || "3000"),
    },
    // sources: sources.sources,
    log: {
        level: process.env.LOG_LEVEL || "info",
    },
    scrape: {
        timeout: parseInt(process.env.SCRAPE_TIMEOUT || "30000", 10),
        userAgent: process.env.USER_AGENT ||
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
    request: {
        timeout: parseInt(process.env.REQUEST_TIMEOUT || "5000", 10),
    },
    queue: {
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || "2", 10),
    },
};
export default config;
