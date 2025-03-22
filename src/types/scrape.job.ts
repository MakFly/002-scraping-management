import { ScrapeJob } from '../queues/scrape.queue';

export interface ScrapeJobResult {
  success: boolean;
  message: string;
  jobId?: string;
  data?: ScrapeJob;
  state?: string;
  progress?: any;
  result?: any;
  failedReason?: string;
  timestamp: string;
  statusCode: number;
}

export interface JobsListResult {
  success: boolean;
  jobs?: any[];
  message?: string;
  timestamp: string;
  statusCode: number;
}

export interface IScrapeJobService {
  createJob(data: ScrapeJob): Promise<ScrapeJobResult>;
  getJob(jobId: string): Promise<ScrapeJobResult>;
  getAllJobs(): Promise<JobsListResult>;
}

export default IScrapeJobService; 