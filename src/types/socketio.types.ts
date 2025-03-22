export interface ProgressEvent {
  jobId: number | string;
  progress: number;
  status: string;
  timestamp: string;
  data?: any;
}

export interface ErrorEvent {
  jobId: number | string;
  error: string;
  details?: any;
  timestamp: string;
}

export interface CompleteEvent {
  jobId: number | string;
  result: {
    success: boolean;
    stats: any;
  };
  timestamp: string;
}

export interface WelcomeEvent {
  message: string;
  timestamp: string;
}

export interface SubscriptionEvent {
  jobId: number | string;
  timestamp: string;
}

export interface LogEvent {
  jobId: number | string;
  log: string;
  timestamp: string;
}

export interface JobStatusEvent {
  jobId: number | string;
  status: string;
  timestamp: string;
  message?: string;
  error?: string;
  result?: any;
  data?: any;
}

export type ServerToClientEvents = {
  'welcome': (event: WelcomeEvent) => void;
  'subscribed': (event: SubscriptionEvent) => void;
  'unsubscribed': (event: SubscriptionEvent) => void;
  'job_update': (event: JobStatusEvent) => void;
  'job_completed': (event: JobStatusEvent) => void;
  'job_failed': (event: JobStatusEvent) => void;
  'job_running': (event: JobStatusEvent) => void;
  'job_started': (event: JobStatusEvent) => void;
  'job_log': (event: LogEvent) => void;
  'job:progress': (event: ProgressEvent) => void;
  'job:error': (event: ErrorEvent) => void;
  'job:complete': (event: CompleteEvent) => void;
  'scraping:update': (event: ProgressEvent) => void;
  'scraping:error': (event: ErrorEvent) => void;
  'scraping:complete': (event: CompleteEvent) => void;
}

export type ClientToServerEvents = {
  'subscribe': (jobId: number | string) => void;
  'unsubscribe': (jobId: number | string) => void;
} 