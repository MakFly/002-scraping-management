import { logger } from '../config/logger';
export class RateLimiterService {
    constructor(config) {
        this.rateLimiter = new Map();
        this.config = config;
    }
    checkRateLimit(key) {
        const now = Date.now();
        // Cleanup expired entries
        this.cleanupExpiredEntries(now);
        const clientData = this.rateLimiter.get(key) || { count: 0, timestamp: now };
        // Reset counter if interval exceeded
        if (now - clientData.timestamp > this.config.interval) {
            clientData.count = 1;
            clientData.timestamp = now;
        }
        else {
            clientData.count++;
        }
        this.rateLimiter.set(key, clientData);
        const isWithinLimit = clientData.count <= this.config.limit;
        if (!isWithinLimit) {
            logger.warn(`Rate limit exceeded for: ${key}`);
        }
        return isWithinLimit;
    }
    cleanupExpiredEntries(now) {
        for (const [key, data] of this.rateLimiter.entries()) {
            if (now - data.timestamp > this.config.windowCleanup) {
                this.rateLimiter.delete(key);
            }
        }
    }
}
export default RateLimiterService;
