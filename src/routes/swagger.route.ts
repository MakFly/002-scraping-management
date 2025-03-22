import { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { swaggerUI } from '@hono/swagger-ui';
import { 
  JobStatusEnum, 
  ScrapeJobRequestSchema, 
  ScrapeJobResponseSchema, 
  JobsListResponseSchema,
  JobStatus
} from '../types/scrape.job.types';

// Create an OpenAPI Hono instance
export const createSwaggerRoute = () => {
  const app = new OpenAPIHono();

  // Define API documentation tags
  const tags = ['Scraping Jobs', 'Statistics', 'Monitoring'];

  // Common schemas
  const PaginationSchema = z.object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(10),
  });

  const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().nullable(),
    count: z.number(),
  });

  const JobHistoryEntrySchema = z.object({
    startTime: z.string(),
    endTime: z.string(),
    status: z.string(),
    itemsScraped: z.number(),
    errors: z.array(z.string()).optional(),
  });

  const StatsSchema = z.object({
    totalJobs: z.number(),
    activeJobs: z.number(),
    completedToday: z.number(),
    failedToday: z.number(),
    totalItemsScraped: z.number(),
  });

  // GET /api/v1/scraping/jobs
  const listJobsRoute = createRoute({
    method: 'get',
    path: '/api/v1/scraping/jobs',
    tags: ['Scraping Jobs'],
    request: {
      query: PaginationSchema,
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              items: z.array(ScrapeJobResponseSchema),
              pageInfo: PageInfoSchema,
            }),
          },
        },
        description: 'List of scraping jobs with pagination',
      },
    },
  });

  // POST /api/v1/scraping/jobs
  const createJobRoute = createRoute({
    method: 'post',
    path: '/api/v1/scraping/jobs',
    tags: ['Scraping Jobs'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              name: z.string(),
              target: z.string(),
              schedule: z.string().optional(),
              config: z.record(z.any()),
            }),
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: ScrapeJobResponseSchema,
          },

        },
        description: 'Job created successfully',
      },
    },
  });

  // GET /api/v1/scraping/jobs/:id
  const getJobRoute = createRoute({
    method: 'get',
    path: '/api/v1/scraping/jobs/{id}',
    tags: ['Scraping Jobs'],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              ...ScrapeJobResponseSchema.shape,
              history: z.array(JobHistoryEntrySchema),
            }),
          },

        },
        description: 'Job details with history',
      },
    },
  });

  // POST /api/v1/scraping/jobs/:id/run
  const runJobRoute = createRoute({
    method: 'post',
    path: '/api/v1/scraping/jobs/{id}/run',
    tags: ['Scraping Jobs'],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              jobId: z.string(),
              startTime: z.string(),
              status: z.literal('running'),
            }),
          },

        },
        description: 'Job started successfully',
      },
    },
  });

  // GET /api/v1/scraping/stats
  const getStatsRoute = createRoute({
    method: 'get',
    path: '/api/v1/scraping/stats',
    tags: ['Statistics'],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: StatsSchema,
          },
        },
        description: 'Global scraping statistics',
      },
    },
  });

  // Register routes
  app.openapi(listJobsRoute, (c) => c.json({
    items: [],
    pageInfo: {
      hasNextPage: false,
      nextCursor: null,
      count: 0,
    },
  }));

  app.openapi(createJobRoute, (c) => c.json({
    query: '',
    id: 'example-id',
    source: 'example-source',
    pageCount: 0,
    name: 'Example Job',
    status: JobStatusEnum.enum.idle,
    target: 'https://example.com',
    config: {},
    nextScheduledRun: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, 201));

  app.openapi(getJobRoute, (c) => c.json({
    query: '',
    id: c.req.param('id'),
    source: 'example-source',
    pageCount: 0,
    name: 'Example Job',
    status: JobStatusEnum.enum.idle,
    target: 'https://example.com',
    config: {},
    nextScheduledRun: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: []
  }));

  app.openapi(runJobRoute, (c) => c.json({
    jobId: c.req.param('id'),
    startTime: new Date().toISOString(),
    status: 'running' as const
  }));

  app.openapi(getStatsRoute, (c) => c.json({
    totalJobs: 0,
    activeJobs: 0,
    completedToday: 0,
    failedToday: 0,
    totalItemsScraped: 0,
  }));

  // Generate OpenAPI documentation
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      title: 'Scraping Management API',
      version: '1.0.0',
      description: 'API for managing web scraping jobs with real-time monitoring',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  });

  // Serve Swagger UI
  app.get('/swagger', swaggerUI({ url: '/doc' }));

  return app;
};





