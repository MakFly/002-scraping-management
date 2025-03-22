export const rateLimitConfig = {
    limit: 5, // 5 requests max
    interval: 10000, // Over a 10-second period
    windowCleanup: 60000 // Clean entries older than 1 minute
};
export default rateLimitConfig;
