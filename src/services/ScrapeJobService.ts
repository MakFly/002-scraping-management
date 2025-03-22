import { PrismaClient, ScrapeJobHistory } from '@prisma/client';
import { Queue } from 'bullmq';
import { ScrapeJobRequest } from '../types/scrape.job.types';
import { logger } from '../config/logger';
import redisConnection from '@/config/redis';

export class ScrapeJobService {
  private prisma: PrismaClient;
  private queue: Queue;

  constructor() {
    this.prisma = new PrismaClient();
    this.queue = new Queue('scrape-queue', { connection: redisConnection });
  }

  async createJob(data: ScrapeJobRequest) {
    try {
      const job = await this.prisma.scrapeJob.create({
        data: {
          source: data.source,
          query: data.source === 'autoscout24' ? 'default' : data.query || '',
          pageCount: data.pageCount,
          status: 'idle'
        }
      });

      // Add job to BullMQ queue
      await this.queue.add('scrape-job', {
        source: data.source,
        query: data.query,
        pageCount: data.pageCount,
        jobId: job.id,
        zip: data.zip,
        zipr: data.zipr
      });

      // Update job status to queued
      await this.prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'queued' }
      });

      return {
        success: true,
        message: 'Job created and queued successfully',
        jobId: job.id,
        data: {
          source: job.source,
          query: job.query,
          pageCount: job.pageCount
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error creating job:', error);
      throw error;
    }
  }

  async getJob(jobId: string) {
    const job = await this.prisma.scrapeJob.findUnique({
      where: { id: parseInt(jobId) },
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
      source: job.source,
      query: job.query,
      pageCount: job.pageCount,
      status: job.status,
      history: job.history?.map((h: any) => ({
        startTime: h.startTime,
        endTime: h.endTime,
        status: h.status,
        itemsScraped: h.itemsScraped,
        errors: h.errors,
        logs: h.logs,
        results: h.results
      })),
      timestamp: new Date().toISOString()
    };
  }

  async runJob(jobId: string) {
    const job = await this.prisma.scrapeJob.findUnique({
      where: { id: parseInt(jobId) }
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
      source: job.source,
      query: job.query,
      pageCount: job.pageCount
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
      where: { id: parseInt(jobId) },
      data: { status: 'running' }
    });

    return {
      success: true,
      jobId: job.id,
      startTime: new Date().toISOString(),
      status: 'running' as const
    };
  }

  async getAllJobs(cursor?: string, limit: number = 10) {
    const take = Math.min(limit, 100);

    const jobs = await this.prisma.scrapeJob.findMany({
      take: take + 1,
      ...(cursor ? {
        cursor: {
          id: parseInt(cursor)
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
    const nextCursor = hasNextPage ? items[items.length - 1].id.toString() : null;

    return {
      items: items.map(job => ({
        id: job.id,
        source: job.source,
        query: job.query,
        pageCount: job.pageCount,
        status: job.status,
        lastRun: job.history[0]?.startTime || null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString()
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

    const [
      totalJobs,
      activeJobs,
      completedToday,
      failedToday,
      totalScraped
    ] = await Promise.all([
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

  async saveResults(jobId: number, results: any[]) {
    try {
      // Créer une entrée dans l'historique
      const history = await this.prisma.scrapeJobHistory.create({
        data: {
          jobId: jobId,
          status: 'completed',
          startTime: new Date(),
          endTime: new Date(),
          itemsScraped: results.length,
          errors: [],
          logs: [JSON.stringify(results)]
        }
      });

      // Mettre à jour le statut du job
      await this.prisma.scrapeJob.update({
        where: { id: jobId },
        data: { status: 'completed' }
      });

      return history;
    } catch (error) {
      logger.error('Error saving results:', error);
      throw error;
    }
  }
} 