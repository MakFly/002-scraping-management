export interface ProgressEvent {
  jobId: string;
  progress: number;
  status: string;
  timestamp: string;
  data?: any;
}

export interface ErrorEvent {
  jobId: string;
  error: string;
  details?: any;
  timestamp: string;
}

export interface CompleteEvent {
  jobId: string;
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
  jobId: string;
  timestamp: string;
}

export type ServerToClientEvents = {
  'welcome': (event: WelcomeEvent) => void;
  'subscribed': (event: SubscriptionEvent) => void;
  'unsubscribed': (event: SubscriptionEvent) => void;
  'job:progress': (event: ProgressEvent) => void;
  'job:error': (event: ErrorEvent) => void;
  'job:complete': (event: CompleteEvent) => void;
  'scraping:update': (event: ProgressEvent) => void;
  'scraping:error': (event: ErrorEvent) => void;
  'scraping:complete': (event: CompleteEvent) => void;
}

export type ClientToServerEvents = {
  'subscribe': (jobId: string) => void;
  'unsubscribe': (jobId: string) => void;
} 