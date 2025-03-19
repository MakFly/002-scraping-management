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
} from '../types/ScrapeJobTypes';

// Create an OpenAPI Hono instance
export const createSwaggerRoute = () => {
  const app = new OpenAPIHono();

  // Define API documentation tags
  const tags = ['Scraping'];

  // Define API routes with OpenAPI metadata that match the actual routes
  const createScrapeJobRoute = createRoute({
    method: 'post',
    path: '/api/scrape',
    tags,
    request: {
      body: {
        content: {
          'application/json': {
            schema: ScrapeJobRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: ScrapeJobResponseSchema,
          },
        },
        description: 'Scraping job created successfully',
      },
      400: {
        content: {
          'application/json': {
            schema: ScrapeJobResponseSchema,
          },
        },
        description: 'Invalid request parameters',
      },
      429: {
        content: {
          'application/json': {
            schema: ScrapeJobResponseSchema,
          },
        },
        description: 'Rate limit exceeded',
      },
      500: {
        content: {
          'application/json': {
            schema: ScrapeJobResponseSchema,
          },
        },
        description: 'Server error',
      },
    },
  });

  const getScrapeJobRoute = createRoute({
    method: 'get',
    path: '/api/scrape/{id}',
    tags,
    request: {
      params: z.object({
        id: z.string().openapi({
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'The job ID to fetch',
        }),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: ScrapeJobResponseSchema,
          },
        },
        description: 'Scraping job details',
      },
      404: {
        content: {
          'application/json': {
            schema: ScrapeJobResponseSchema,
          },
        },
        description: 'Job not found',
      },
      500: {
        content: {
          'application/json': {
            schema: ScrapeJobResponseSchema,
          },
        },
        description: 'Server error',
      },
    },
  });

  const getAllScrapeJobsRoute = createRoute({
    method: 'get',
    path: '/api/scrape',
    tags,
    request: {
      query: z.object({
        status: z.string().optional().openapi({
          example: 'completed',
          description: 'Filter jobs by status',
        }),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: JobsListResponseSchema,
          },
        },
        description: 'List of scraping jobs',
      },
      500: {
        content: {
          'application/json': {
            schema: JobsListResponseSchema,
          },
        },
        description: 'Server error',
      },
    },
  });

  // Register routes (these don't handle the actual logic, just document the API)
  app.openapi(createScrapeJobRoute, (c) => {
    return c.json(
      {
        success: true,
        message: 'Job created successfully',
        jobId: 'example-id',
        data: {
          source: 'autoscout24',
          query: 'bmw',
          pageCount: 5
        },
        timestamp: new Date().toISOString()
      },
      200
    );
  });

  app.openapi(getScrapeJobRoute, (c) => {
    return c.json(
      {
        success: true,
        message: 'Job retrieved successfully',
        jobId: c.req.param('id'),
        state: 'pending',
        progress: 0,
        result: undefined,
        failedReason: '',
        timestamp: new Date().toISOString()
      },
      200
    );
  });
  
  app.openapi(getAllScrapeJobsRoute, (c) => {
    return c.json(
      {
        success: true,
        message: 'Jobs retrieved successfully',
        jobs: [
          {
            id: 'example-id',
            data: {
              source: 'autoscout24',
              query: 'bmw'
            },
            state: 'completed',
            progress: 100,
            timestamp: new Date().toISOString()
          }
        ],
        timestamp: new Date().toISOString()
      },
      200
    );
  });

  // Generate OpenAPI documentation
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      title: 'Web Scraping API Documentation',
      version: '1.0.0',
      description: 'API for managing web scraping tasks with Hono.js and BullMQ',
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
