import { Context } from 'hono';
import { ScrapeJobService } from '../services/ScrapeJobService';
import { ScrapeJobRequest } from '../types/scrape.job.types';
import { LeboncoinExtractor } from '../services/scrapers/extractors/specificsExtractors/LeboncoinExtractor';
import { LeboncoinScrapeRequest } from '../types/leboncoin.types';
import { WebSocketService } from '../services/WebSocketService';
import { EventService } from '../services/EventService';
import { logger } from '../config/logger';

export class ScrapeController {
  private jobService: ScrapeJobService;
  private leboncoinExtractor: LeboncoinExtractor;
  private wsService: WebSocketService;
  private eventService: EventService;

  constructor() {
    this.jobService = new ScrapeJobService();
    this.leboncoinExtractor = new LeboncoinExtractor();
    this.wsService = WebSocketService.getInstance();
    this.eventService = EventService.getInstance();
  }

  public async createScrapeJob(c: Context): Promise<Response> {
    try {
      const body = await c.req.json();
      
      // Si c'est une requête Leboncoin
      if (body.source === 'leboncoin') {
        const leboncoinRequest = body as LeboncoinScrapeRequest;
        const pageCount = leboncoinRequest.pagination || 1;
        
        // Créer un job de scraping
        const job = await this.jobService.createJob({
          source: 'leboncoin',
          query: JSON.stringify(leboncoinRequest.params),
          pageCount
        });

        if (job.success && job.jobId) {
          const jobData = {
            type: 'job_created',
            jobId: job.jobId.toString(),
            timestamp: new Date().toISOString(),
            data: {
              source: 'leboncoin',
              status: 'pending',
              ...job
            }
          };
          
          // Émettre un événement via WebSocket
          this.wsService.emitToAll('job_created', jobData);
          
          // Émettre directement via SSE (pour assurer la distribution)
          this.eventService.sendEvent('job_created', jobData);
          
          logger.info(`🔔 New job created and broadcasted: ${job.jobId}`);
        }

        return c.json(job, job.success ? 201 : 400);
      }

      // Pour les autres sources
      const result = await this.jobService.createJob(body as ScrapeJobRequest);
      
      if (result.success && result.jobId) {
        const jobData = {
          type: 'job_created',
          jobId: result.jobId.toString(),
          timestamp: new Date().toISOString(),
          data: {
            source: body.source,
            status: 'pending',
            ...result
          }
        };
        
        // Émettre un événement via WebSocket
        this.wsService.emitToAll('job_created', jobData);
        
        // Émettre directement via SSE (pour assurer la distribution)
        this.eventService.sendEvent('job_created', jobData);
        
        logger.info(`🔔 New job created and broadcasted: ${result.jobId}`);
      }

      return c.json(result, result.success ? 201 : 400);
    } catch (error) {
      console.error('Error creating job:', error);
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

      // Émettre également via EventService pour garantir la notification
      this.eventService.sendEvent('job_started', {
        type: 'job_started',
        jobId: jobId,
        timestamp: new Date().toISOString(),
        data: {
          status: 'running',
          message: 'Job démarré manuellement'
        }
      });

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

  public async subscribeToEvents(c: Context): Promise<Response> {
    try {
      // Set SSE headers
      c.header('Content-Type', 'text/event-stream');
      c.header('Cache-Control', 'no-cache');
      c.header('Connection', 'keep-alive');
      c.header('X-Accel-Buffering', 'no'); // Désactiver la mise en mémoire tampon pour Nginx
      c.header('Access-Control-Allow-Origin', '*'); // CORS pour SSE
      
      // Create a unique client ID
      const clientId = Math.random().toString(36).substring(7);
      
      logger.info(`🔌 New SSE client connecting: ${clientId}`);
      
      // Créer un corps de réponse en streaming
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      
      // Create a new client with a stream writer
      const client = {
        id: clientId,
        send: (data: string) => {
          writer.write(new TextEncoder().encode(data));
        }
      };
      
      // Add client to the event service
      this.eventService.addClient(client);
      
      // Écrire un commentaire et un message de connexion en début pour forcer la connexion
      writer.write(new TextEncoder().encode(`: SSE connection established\n\n`));
      writer.write(new TextEncoder().encode(`event: connected\ndata: {"clientId":"${clientId}","timestamp":"${new Date().toISOString()}"}\n\n`));
      
      // Envoyer la liste des jobs actuels
      const jobs = await this.jobService.getAllJobs();
      if (jobs && jobs.items) {
        const initialData = {
          type: 'initial_data',
          timestamp: new Date().toISOString(),
          data: jobs.items
        };
        client.send(`event: initial_data\ndata: ${JSON.stringify(initialData)}\n\n`);
        logger.info(`📊 Sent initial data to client ${clientId} with ${jobs.items.length} jobs`);
      }
      
      // Envoyer un ping régulier pour maintenir la connexion ouverte
      const pingInterval = setInterval(() => {
        try {
          client.send(`: ping ${new Date().toISOString()}\n\n`);
        } catch (err) {
          logger.error(`Error sending ping to client ${clientId}:`, err);
          clearInterval(pingInterval);
          this.eventService.removeClient(client);
        }
      }, 30000);
      
      // Handle client disconnection
      c.req.raw.signal.addEventListener('abort', () => {
        logger.info(`🔌 SSE client disconnecting: ${clientId}`);
        clearInterval(pingInterval);
        this.eventService.removeClient(client);
        writer.close().catch(err => logger.error('Error closing writer:', err));
      });
      
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      logger.error('Error in SSE connection:', error);
      return c.json({ 
        success: false, 
        message: 'Failed to establish SSE connection' 
      }, 500);
    }
  }
} 