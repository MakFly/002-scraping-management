import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createScrapeQueueRouter } from './scrapeQueue.routes';
import { createUIRouter } from './ui.routes';
import { productChecker } from '../utils/productChecker';
import { scraperService } from '../services/ScraperService';
// Création du router principal
export const createRouter = () => {
    const app = new Hono();
    // Middleware CORS
    app.use('*', cors({
        origin: '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['Content-Length', 'X-Request-Id'],
        maxAge: 86400,
    }));
    // Endpoint de santé
    app.get('/health', (c) => {
        return c.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    });
    // Test du service de scraping
    app.get('/test-scraper', async (c) => {
        try {
            const testUrl = 'https://www.amazon.fr';
            const isOk = await scraperService.testConnection(testUrl);
            return c.json({
                status: isOk ? 'ok' : 'error',
                message: isOk ? 'Connexion au service de scraping réussie' : 'Erreur de connexion au service de scraping',
                testedUrl: testUrl,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            return c.json({
                status: 'error',
                message: `Erreur lors du test du scraper: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });
    // Nouvel endpoint pour vérifier un produit
    app.post('/check-product', async (c) => {
        try {
            const body = await c.req.json();
            const { url } = body;
            if (!url) {
                return c.json({
                    success: false,
                    message: 'URL manquante',
                    timestamp: new Date().toISOString(),
                }, 400);
            }
            // Vérifier si l'URL est valide
            try {
                new URL(url);
            }
            catch (e) {
                return c.json({
                    success: false,
                    message: 'URL invalide',
                    timestamp: new Date().toISOString(),
                }, 400);
            }
            // Vérifier le produit
            const result = await productChecker.checkProduct(url);
            return c.json({
                success: !result.error,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            return c.json({
                success: false,
                message: `Erreur lors de la vérification du produit: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString(),
            }, 500);
        }
    });
    // Ajouter les sous-routers
    app.route('/api/scrape', createScrapeQueueRouter());
    app.route('/ui', createUIRouter());
    return app;
};
