import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
export class ScrapeJobService {
    constructor() {
        this.prisma = new PrismaClient();
        this.queue = new Queue('scrape');
    }
    async createJob(data) {
        const job = await this.prisma.scrapeJob.create({
            data: {
                name: data.name,
                target: data.target,
                schedule: data.schedule,
                config: data.config,
                status: 'idle',
                nextScheduledRun: data.schedule ? new Date() : null
            }
        });
        return {
            success: true,
            message: 'Job created successfully',
            jobId: job.id,
            data: {
                name: job.name,
                target: job.target,
                config: job.config
            },
            timestamp: new Date().toISOString()
        };
    }
    async getJob(jobId) {
        const job = await this.prisma.scrapeJob.findUnique({
            where: { id: jobId },
            include: {
                history: {
                    orderBy: {
                        startTime: 'desc'
                    },
                    take: 50
                }
            }
        });
        if (!job) {
            return {
                success: false,
                message: 'Job not found',
                timestamp: new Date().toISOString()
            };
        }
        return {
            success: true,
            message: 'Job retrieved successfully',
            jobId: job.id,
            name: job.name,
            status: job.status,
            target: job.target,
            config: job.config,
            schedule: job.schedule,
            history: job.history.map(h => ({
                startTime: h.startTime,
                endTime: h.endTime,
                status: h.status,
                itemsScraped: h.itemsScraped,
                errors: h.errors
            })),
            timestamp: new Date().toISOString()
        };
    }
    async runJob(jobId) {
        const job = await this.prisma.scrapeJob.findUnique({
            where: { id: jobId }
        });
        if (!job) {
            return {
                success: false,
                message: 'Job not found',
                timestamp: new Date().toISOString()
            };
        }
        // Add job to queue
        await this.queue.add('scrape', {
            jobId: job.id,
            target: job.target,
            config: job.config
        });
        // Create history entry
        await this.prisma.scrapeJobHistory.create({
            data: {
                jobId: job.id,
                status: 'running',
                startTime: new Date(),
                itemsScraped: 0,
                errors: [],
                logs: []
            }
        });
        // Update job status
        await this.prisma.scrapeJob.update({
            where: { id: jobId },
            data: { status: 'running' }
        });
        return {
            success: true,
            jobId: job.id,
            startTime: new Date().toISOString(),
            status: 'running'
        };
    }
    async getAllJobs(cursor, limit = 10) {
        const take = Math.min(limit, 100);
        const jobs = await this.prisma.scrapeJob.findMany({
            take: take + 1,
            ...(cursor ? {
                cursor: {
                    id: cursor
                },
                skip: 1
            } : {}),
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                history: {
                    orderBy: {
                        startTime: 'desc'
                    },
                    take: 1
                }
            }
        });
        const hasNextPage = jobs.length > take;
        const items = hasNextPage ? jobs.slice(0, take) : jobs;
        const nextCursor = hasNextPage ? items[items.length - 1].id : null;
        return {
            items: items.map(job => ({
                id: job.id,
                name: job.name,
                status: job.status,
                lastRun: job.history[0]?.startTime || null,
                nextRun: job.schedule ? job.nextScheduledRun : null,
                type: job.schedule ? 'scheduled' : 'manual',
                target: job.target,
                config: job.config
            })),
            pageInfo: {
                hasNextPage,
                nextCursor,
                count: items.length
            }
        };
    }
    async getStats() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [totalJobs, activeJobs, completedToday, failedToday, totalScraped] = await Promise.all([
            this.prisma.scrapeJob.count(),
            this.prisma.scrapeJob.count({
                where: { status: 'running' }
            }),
            this.prisma.scrapeJobHistory.count({
                where: {
                    status: 'completed',
                    startTime: { gte: startOfDay }
                }
            }),
            this.prisma.scrapeJobHistory.count({
                where: {
                    status: 'failed',
                    startTime: { gte: startOfDay }
                }
            }),
            this.prisma.scrapeJobHistory.aggregate({
                _sum: {
                    itemsScraped: true
                }
            })
        ]);
        return {
            totalJobs,
            activeJobs,
            completedToday,
            failedToday,
            totalItemsScraped: totalScraped._sum.itemsScraped || 0
        };
    }
}
