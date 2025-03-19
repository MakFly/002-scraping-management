import { Worker } from 'bullmq';
import { scraperService } from '../services/ScraperService';
import { logger } from '../config/logger';
import { redisConnection } from '../config/redis';
/**
 * Worker pour exécuter les tâches de scraping avec BullMQ
 */
export const createScrapeWorker = () => {
    logger.info('Démarrage du worker de scraping...');
    const worker = new Worker('scrape-queue', async (job) => {
        logger.info(`Processing scrape job ${job.id} for source: ${job.data.source}`);
        try {
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
            // Traitement additionnel si nécessaire
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
        }
        catch (error) {
            logger.error(`Erreur lors du traitement du job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
            // En cas d'erreur, on renvoie un résultat structuré avec l'erreur
            // pour que le client puisse le traiter facilement
            throw new Error(`Échec du scraping: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, {
        connection: redisConnection,
        concurrency: 2, // Limiter la concurrence pour éviter la surcharge
        limiter: {
            max: 5, // 5 jobs max
            duration: 60000 // Par minute
        },
        removeOnComplete: {
            count: 100, // Garder les 100 derniers jobs terminés
        },
        removeOnFail: {
            count: 100, // Garder les 100 derniers jobs échoués
        }
    });
    // Gestion des événements du worker
    worker.on('completed', (job) => {
        logger.info(`Job ${job.id} completed successfully`);
    });
    worker.on('failed', (job, error) => {
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
        await scraperService.cleanup();
    });
    process.on('SIGINT', async () => {
        logger.info('SIGINT reçu, fermeture gracieuse du worker...');
        await worker.close();
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
