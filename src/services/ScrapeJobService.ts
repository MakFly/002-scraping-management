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
      source: job.source,
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

  async getStats(timeRange: string = '7d') {
    try {
      // Déterminer la plage de dates en fonction du timeRange
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'all':
          startDate = new Date(0); // Début de l'époque Unix
          break;
        default:
          startDate.setDate(startDate.getDate() - 7); // Par défaut 7 jours
      }

      // Requêtes pour obtenir les statistiques
      const [
        totalJobs,
        completedJobs,
        failedJobs,
        pendingJobs,
        activeScrapers,
        totalDataPoints,
        jobExecutions,
        lastJob
      ] = await Promise.all([
        // Total des jobs
        this.prisma.scrapeJob.count(),
        
        // Jobs complétés dans la période
        this.prisma.scrapeJob.count({
          where: { 
            status: 'completed',
            updatedAt: { gte: startDate }
          }
        }),
        
        // Jobs échoués dans la période
        this.prisma.scrapeJob.count({
          where: { 
            status: 'failed',
            updatedAt: { gte: startDate }
          }
        }),
        
        // Jobs en attente
        this.prisma.scrapeJob.count({
          where: { 
            status: { in: ['pending', 'queued', 'idle'] }
          }
        }),
        
        // Scrapers actifs (jobs en cours d'exécution)
        this.prisma.scrapeJob.count({
          where: { status: 'running' }
        }),
        
        // Nombre total de données récupérées
        this.prisma.scrapeJobHistory.aggregate({
          where: { startTime: { gte: startDate } },
          _sum: { itemsScraped: true }
        }),
        
        // Exécutions pour calculer le temps moyen
        this.prisma.scrapeJobHistory.findMany({
          where: {
            status: 'completed',
            startTime: { gte: startDate },
            endTime: { not: null }
          },
          select: {
            startTime: true,
            endTime: true
          }
        }),
        
        // Dernier job exécuté
        this.prisma.scrapeJob.findFirst({
          where: {
            status: { in: ['completed', 'failed'] }
          },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        })
      ]);

      // Calculer le taux de réussite
      const totalExecuted = completedJobs + failedJobs;
      const successRate = totalExecuted > 0 
        ? (completedJobs / totalExecuted) * 100 
        : 0;

      // Calculer le temps moyen par job
      let avgTimePerJob = 0;
      if (jobExecutions.length > 0) {
        const totalDuration = jobExecutions.reduce((acc, job) => {
          if (job.endTime && job.startTime) {
            return acc + (job.endTime.getTime() - job.startTime.getTime());
          }
          return acc;
        }, 0);
        avgTimePerJob = totalDuration / jobExecutions.length / 1000; // en secondes
      }

      return {
        totalJobs,
        completedJobs,
        failedJobs,
        pendingJobs,
        successRate,
        totalDataPoints: totalDataPoints._sum.itemsScraped || 0,
        activeScrapers,
        avgTimePerJob,
        lastJobTime: lastJob?.updatedAt?.toISOString() || null
      };
    } catch (error) {
      logger.error('Error fetching stats:', error);
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        pendingJobs: 0,
        successRate: 0,
        totalDataPoints: 0,
        activeScrapers: 0,
        avgTimePerJob: 0,
        lastJobTime: null
      };
    }
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

  /**
   * Get all jobs history with pagination
   * @param cursor Optional cursor for pagination
   * @param limit Number of items per page (max 100)
   * @param includeResults Whether to include results in the response
   * @returns Paginated jobs history
   */
  public async getAllJobsHistory(cursor?: string, limit: number = 10, includeResults: boolean = false): Promise<any> {
    try {
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
          id: 'desc'
        },
        include: {
          history: {
            orderBy: {
              startTime: 'desc'
            },
            take: 5, // Limit history entries per job
            select: {
              id: true,
              status: true,
              startTime: true,
              endTime: true,
              itemsScraped: true,
              errors: true,
              logs: includeResults // Only include logs if requested
            }
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
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          history: job.history.map(h => ({
            id: h.id,
            status: h.status,
            startTime: h.startTime,
            endTime: h.endTime,
            itemsScraped: h.itemsScraped,
            errors: h.errors,
            ...(includeResults ? { results: h.logs } : {})
          }))
        })),
        pageInfo: {
          hasNextPage,
          nextCursor,
          count: items.length
        }
      };
    } catch (error) {
      logger.error('Error fetching jobs history:', error);
      throw new Error('Failed to fetch jobs history');
    }
  }

  /**
   * Get detailed results for a specific job history entry
   * @param historyId The ID of the history entry
   * @returns Detailed results for the history entry
   */
  public async getJobHistoryResults(historyId: number): Promise<any> {
    try {
      const history = await this.prisma.scrapeJobHistory.findUnique({
        where: { id: historyId },
        select: {
          id: true,
          jobId: true,
          status: true,
          startTime: true,
          endTime: true,
          itemsScraped: true,
          errors: true,
          logs: true,
          results: true
        }
      });

      if (!history) {
        throw new Error('History entry not found');
      }

      return {
        id: history.id,
        jobId: history.jobId,
        status: history.status,
        startTime: history.startTime,
        endTime: history.endTime,
        itemsScraped: history.itemsScraped,
        errors: history.errors,
        results: history.results
      };
    } catch (error) {
      logger.error('Error fetching job history results:', error);
      throw new Error('Failed to fetch job history results');
    }
  }
} 