import { Queue, Job } from 'bullmq';
import { ScrapeJob } from '../queues/scrapeQueue';
import { logger } from '../config/logger';
import { IScrapeJobService, ScrapeJobResult, JobsListResult } from '../types/ScrapeJob';

export class ScrapeJobService implements IScrapeJobService {
  private queue: Queue<ScrapeJob>;

  constructor(queue: Queue<ScrapeJob>) {
    this.queue = queue;
  }

  public async createJob(data: ScrapeJob): Promise<ScrapeJobResult> {
    try {
      // Check if similar job exists
      const activeJobs = await this.queue.getJobs(['active', 'waiting']);
      const similarJob = activeJobs.find(job => 
        job.data.source === data.source && 
        job.data.query === data.query
      );
      
      if (similarJob) {
        logger.info(`Similar job ${similarJob.id} already exists for source: ${data.source}`);
        return {
          success: true,
          message: 'A similar job is already being processed',
          jobId: similarJob.id,
          data,
          timestamp: new Date().toISOString(),
          statusCode: 202
        };
      }
      
      // Add slight random delay to avoid exactly simultaneous submissions
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      // Generate custom job ID
      const jobId = `${data.source}-${data.query || 'no-query'}-${Date.now()}`;
      
      const job = await this.queue.add('scrape', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        jobId // Set the custom job ID here
      });

      logger.info(`Created scrape job ${job.id} for source: ${data.source}`);

      return {
        success: true,
        message: 'Scrape job created successfully',
        jobId: job.id,
        data,
        timestamp: new Date().toISOString(),
        statusCode: 202
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error(`Error creating job: ${errorMessage}`);
      
      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        statusCode: 500
      };
    }
  }

  public async getJob(jobId: string): Promise<ScrapeJobResult> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        return {
          success: false,
          message: 'Job not found',
          jobId,
          timestamp: new Date().toISOString(),
          statusCode: 404
        };
      }

      const [state, progress] = await Promise.all([
        job.getState(),
        job.progress()
      ]);

      return {
        success: true,
        jobId: job.id,
        state,
        progress,
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        timestamp: new Date().toISOString(),
        statusCode: 200
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error(`Error fetching job ${jobId}: ${errorMessage}`);
      
      return {
        success: false,
        message: errorMessage,
        jobId,
        timestamp: new Date().toISOString(),
        statusCode: 500
      };
    }
  }

  public async getAllJobs(): Promise<JobsListResult> {
    try {
      const jobs = await this.queue.getJobs(['waiting', 'active', 'completed', 'failed']);
      
      const jobsData = await Promise.all(
        jobs.map(async (job) => ({
          jobId: job.id,
          state: await job.getState(),
          progress: await job.progress(),
          data: job.data,
          result: job.returnvalue,
          failedReason: job.failedReason,
          timestamp: job.timestamp
        }))
      );

      return {
        success: true,
        jobs: jobsData,
        timestamp: new Date().toISOString(),
        statusCode: 200
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error(`Error fetching all jobs: ${errorMessage}`);
      
      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        statusCode: 500
      };
    }
  }
}

export default ScrapeJobService; 