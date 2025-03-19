import { serve } from '@hono/node-server';
import { createScrapeWorker } from './workers/scrapeWorker';
import { logger } from './config/logger';
import { scraperService } from './services/ScraperService';
import { createRouter } from './routes/routes';
import { config } from './config/config';
// Instancier le router principal
const app = createRouter();
// Démarrer le worker de scraping
const scrapeWorker = createScrapeWorker();
// Configuration du signal pour l'arrêt propre
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Démarrer le serveur
const port = config.PORT || 3000;
serve({
    fetch: app.fetch,
    port
});
logger.info(`Serveur démarré sur le port ${port}`);
if (config.BULL_BOARD_ENABLED) {
    logger.info(`Bull Board UI disponible sur http://localhost:${port}/ui/queues`);
}
/**
 * Arrêt propre du processus
 */
async function shutdown() {
    logger.info('Arrêt du serveur en cours...');
    // Fermer le worker de scraping
    if (scrapeWorker) {
        await scrapeWorker.close();
    }
    // Nettoyer les ressources du service de scraping
    await scraperService.cleanup();
    logger.info('Serveur arrêté proprement');
    process.exit(0);
}
