import { Worker, Job } from 'bullmq';
import { ScrapeJob } from '../queues/scrape.queue';
import { scraperService } from '../services/ScraperService';
import { logger } from '../config/logger';
import { redisConnection } from '../config/redis';
import { Server } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '../types/socketio';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Worker pour exécuter les tâches de scraping avec BullMQ
 */
export const createScrapeWorker = () => {
  logger.info('Démarrage du worker de scraping...');
  const prisma = new PrismaClient();

  const worker = new Worker<ScrapeJob>(
    'scrape-queue', 
    async (job: Job<ScrapeJob>) => {
      logger.info(`Processing scrape job ${job.id} for source: ${job.data.source}`);
      
      try {
        // Créer une entrée dans l'historique et mettre à jour le statut du job
        const historyEntry = await prisma.scrapeJobHistory.create({
          data: {
            jobId: job.data.jobId,
            status: 'running',
            startTime: new Date(),
            itemsScraped: 0,
            errors: [],
            logs: []
          }
        });

        await prisma.scrapeJob.update({
          where: { id: job.data.jobId },
          data: { status: 'running' }
        });

        // Mise à jour initiale de la progression
        await job.updateProgress(10);
        await job.log('Initialisation du scraping...');
        
        // Exécuter le scraping avec le service
        const startTime = Date.now();
        await job.updateProgress(30);
        await job.log('Scraping en cours...');
        
        const result = await scraperService.scrape(job.data);
        
        // Mise à jour finale de la progression
        await job.updateProgress(90);
        await job.log(`Scraping terminé avec ${result.items.length} résultats en ${Date.now() - startTime}ms`);
        
        // Mettre à jour l'historique et le statut du job comme complété
        await prisma.scrapeJobHistory.update({
          where: { id: historyEntry.id },
          data: {
            status: 'completed',
            endTime: new Date(),
            itemsScraped: result.items.length,
            logs: [],
            results: result
          } as Prisma.ScrapeJobHistoryUpdateInput
        });

        await prisma.scrapeJob.update({
          where: { id: job.data.jobId },
          data: { status: 'completed' }
        });

        await job.updateProgress(100);
        await job.log('Traitement terminé');
        
        return {
          success: true,
          result,
          stats: {
            itemCount: result.items.length,
            scraperUsed: result.metadata.scraperUsed,
            executionTimeMs: result.metadata.executionTimeMs
          }
        };
      } catch (error) {
        logger.error(`Erreur lors du traitement du job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
        
        // Mettre à jour l'historique et le statut du job en cas d'erreur
        if (job.data.jobId) {
          await prisma.scrapeJob.update({
            where: { id: job.data.jobId },
            data: { status: 'failed' }
          });

          await prisma.scrapeJobHistory.updateMany({
            where: { 
              jobId: job.data.jobId,
              endTime: null
            },
            data: {
              status: 'failed',
              endTime: new Date(),
              errors: [error instanceof Error ? error.message : String(error)]
            }
          });
        }
        
        throw new Error(`Échec du scraping: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 60000
      },
      removeOnComplete: {
        count: 100,
      },
      removeOnFail: {
        count: 100,
      }
    }
  );
  
  // Gestion des événements du worker
  worker.on('completed', async (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });
  
  worker.on('failed', async (job, error) => {
    logger.error(`Job ${job?.id} failed: ${error.message}`);
  });
  
  worker.on('error', (error) => {
    logger.error(`Worker error: ${error.message}`);
  });
  
  worker.on('stalled', (jobId) => {
    logger.warn(`Job ${jobId} is stalled`);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM reçu, fermeture gracieuse du worker...');
    await worker.close();
    await prisma.$disconnect();
    await scraperService.cleanup();
  });
  
  process.on('SIGINT', async () => {
    logger.info('SIGINT reçu, fermeture gracieuse du worker...');
    await worker.close();
    await prisma.$disconnect();
    await scraperService.cleanup();
  });
  
  return worker;
};

// Si ce fichier est exécuté directement, démarrer le worker
if (require.main === module) {
  createScrapeWorker();
  logger.info('Worker de scraping démarré en mode standalone');
}

export default createScrapeWorker;

export class ScrapeWorker {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private jobId: string;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>, jobId: string) {
    this.io = io;
    this.jobId = jobId;
  }

  private emitProgress(progress: number, status: string, data?: any) {
    const event = {
      jobId: this.jobId,
      progress,
      status,
      timestamp: new Date().toISOString(),
      data
    };

    // Émettre aux abonnés spécifiques du job
    this.io.to(`job:${this.jobId}`).emit('job:progress', event);
    // Émettre à tous les écouteurs globaux
    this.io.emit('scraping:update', event);
  }

  private emitError(error: string, details?: any) {
    const event = {
      jobId: this.jobId,
      error,
      details,
      timestamp: new Date().toISOString()
    };

    this.io.to(`job:${this.jobId}`).emit('job:error', event);
    this.io.emit('scraping:error', event);
  }

  private emitComplete(success: boolean, stats: any) {
    const event = {
      jobId: this.jobId,
      result: { success, stats },
      timestamp: new Date().toISOString()
    };

    this.io.to(`job:${this.jobId}`).emit('job:complete', event);
    this.io.emit('scraping:complete', event);
  }

  async execute() {
    try {
      // Exemple de progression
      this.emitProgress(0, 'Initialisation du scraping');
      
      // Simulation d'étapes de scraping
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.emitProgress(30, 'Connexion au site');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.emitProgress(60, 'Extraction des données');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.emitProgress(90, 'Traitement des données');
      
      // Simulation de complétion
      this.emitComplete(true, {
        itemsScraped: 100,
        duration: '3s'
      });
      
    } catch (error) {
      this.emitError(error instanceof Error ? error.message : 'Une erreur est survenue');
      throw error;
    }
  }
}