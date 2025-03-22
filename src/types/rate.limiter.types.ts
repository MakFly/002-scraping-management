export interface RateLimitConfig {
  limit: number;
  interval: number;
  windowCleanup: number;
}

export interface IRateLimiterService {
  checkRateLimit(key: string): boolean;
}

export default IRateLimiterService; 