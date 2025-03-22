import { Context } from 'hono';
import { ScrapeJobService } from '../services/ScrapeJobService';
import { ScrapeJobRequest } from '../types/ScrapeJobTypes';

export class ScrapeController {
  private jobService: ScrapeJobService;

  constructor() {
    this.jobService = new ScrapeJobService();
  }

  public async createScrapeJob(c: Context): Promise<Response> {
    try {
      const data = await c.req.json() as ScrapeJobRequest;
      const result = await this.jobService.createJob(data);
      return c.json(result, 201);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const status = error instanceof Error && error.message.includes('validation') ? 400 : 500;
      
      return c.json({
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString()
      }, status);
    }
  }

  public async getScrapeJob(c: Context): Promise<Response> {
    try {
      const jobId = c.req.param('id');
      const result = await this.jobService.getJob(jobId);
      
      if (!result.success) {
        return c.json(result, 404);
      }

      return c.json(result);
    } catch (error) {
      return c.json({
        success: false,
        message: 'Error retrieving job',
        timestamp: new Date().toISOString()
      }, 500);
    }
  }

  public async runScrapeJob(c: Context): Promise<Response> {
    try {
      const jobId = c.req.param('id');
      const result = await this.jobService.runJob(jobId);
      
      if (!result.success) {
        return c.json(result, 404);
      }

      return c.json(result);
    } catch (error) {
      return c.json({
        success: false,
        message: 'Error running job',
        timestamp: new Date().toISOString()
      }, 500);
    }
  }

  public async getAllScrapeJobs(c: Context): Promise<Response> {
    try {
      const { cursor, limit = 10 } = c.req.query();
      const result = await this.jobService.getAllJobs(cursor, parseInt(limit as string));
      return c.json(result);
    } catch (error) {
      return c.json({
        success: false,
        message: 'Error retrieving jobs',
        timestamp: new Date().toISOString()
      }, 500);
    }
  }

  public async getStats(c: Context): Promise<Response> {
    try {
      const stats = await this.jobService.getStats();
      return c.json(stats);
    } catch (error) {
      return c.json({
        success: false,
        message: 'Error retrieving stats',
        timestamp: new Date().toISOString()
      }, 500);
    }
  }
} 