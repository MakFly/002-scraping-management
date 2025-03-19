export class ScrapeController {
    constructor(jobService, rateLimiter) {
        this.jobService = jobService;
        this.rateLimiter = rateLimiter;
    }
    async createScrapeJob(c) {
        try {
            const clientIP = c.req.header('x-forwarded-for') || 'unknown';
            // Apply rate limiting
            if (!this.rateLimiter.checkRateLimit(clientIP)) {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Rate limit exceeded. Please try again later.',
                    timestamp: new Date().toISOString()
                }), { status: 429, headers: { 'Content-Type': 'application/json' } });
            }
            // Access validated data - using type assertions to fix the 'never' type issue
            // @ts-ignore - Workaround for the zValidator 'never' type issue
            const data = c.req.valid('json');
            const result = await this.jobService.createJob(data);
            return new Response(JSON.stringify({
                success: result.success,
                message: result.message,
                jobId: result.jobId,
                data: result.data,
                timestamp: result.timestamp
            }), { status: result.statusCode, headers: { 'Content-Type': 'application/json' } });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const status = error instanceof Error && error.message.includes('validation') ? 400 : 500;
            return new Response(JSON.stringify({
                success: false,
                message: errorMessage,
                timestamp: new Date().toISOString()
            }), { status, headers: { 'Content-Type': 'application/json' } });
        }
    }
    async getScrapeJob(c) {
        const jobId = c.req.param('id');
        const result = await this.jobService.getJob(jobId);
        return new Response(JSON.stringify({
            success: result.success,
            jobId: result.jobId,
            state: result.state,
            progress: result.progress,
            data: result.data,
            result: result.result,
            failedReason: result.failedReason,
            timestamp: result.timestamp,
            message: result.message
        }), { status: result.statusCode, headers: { 'Content-Type': 'application/json' } });
    }
    async getAllScrapeJobs(c) {
        const result = await this.jobService.getAllJobs();
        return new Response(JSON.stringify({
            success: result.success,
            jobs: result.jobs,
            message: result.message,
            timestamp: result.timestamp
        }), { status: result.statusCode, headers: { 'Content-Type': 'application/json' } });
    }
}
export default ScrapeController;
