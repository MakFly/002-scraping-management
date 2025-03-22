import puppeteer from 'puppeteer';
import { ScraperType } from '../../types/Scraper';
import { logger } from '../../config/logger';
import { domainRegistry } from './DomainRegistry';
import { getExtractor } from './extractors';
/**
 * Stratégie de scraping utilisant Puppeteer pour le contenu dynamique
 * Optimisée pour les sites avec JavaScript complexe
 */
export class PuppeteerStrategy {
    constructor(options = {}) {
        this.browser = null;
        this.options = {
            timeout: 30000,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            retries: 2,
            ...options
        };
    }
    getType() {
        return ScraperType.PUPPETEER;
    }
    /**
     * Effectue le scraping avec Puppeteer
     */
    async scrape(job) {
        const startTime = Date.now();
        logger.info(`Début du scraping avec Puppeteer pour ${job.source}`);
        let browser = null;
        let page = null;
        try {
            // Récupérer la configuration du domaine
            const domainConfig = domainRegistry.getConfig(job.source);
            if (!domainConfig) {
                throw new Error(`Aucune configuration trouvée pour le domaine: ${job.source}`);
            }
            // Sélectionner l'extracteur spécifique à la source
            const extractor = getExtractor(job.source);
            // Lancer le navigateur
            browser = await this.getBrowser();
            // Déterminer le nombre de pages à scraper
            const pageCount = job.pageCount || 1;
            let allItems = [];
            let pageTitle = '';
            // Itérer sur les pages
            for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
                // Construire l'URL avec paramètre de page si nécessaire
                const url = extractor.buildUrl(job.source, job.query || '', currentPage, job);
                logger.info(`Scraping de la page ${currentPage}/${pageCount} pour ${job.source}: ${url}`);
                // Créer une nouvelle page (ou réutiliser celle existante)
                if (!page) {
                    page = await browser.newPage();
                    await this.setupPage(page);
                }
                // Naviguer vers l'URL
                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: this.options.timeout
                });
                // Attendre que le contenu soit chargé
                await this.waitForContent(page, domainConfig.selectors);
                // Extraire les données
                if (currentPage === 1) {
                    pageTitle = await page.title();
                }
                // Utiliser l'extracteur pour obtenir les éléments
                const items = await extractor.extractItems(page, domainConfig.selectors);
                allItems = [...allItems, ...items];
                // Si c'est la dernière page, on sort de la boucle
                if (currentPage === pageCount) {
                    break;
                }
                // Utiliser la gestion de pagination spécifique à l'extracteur si disponible
                if (extractor.handlePagination && extractor.handlePagination(currentPage, pageCount, job)) {
                    // Ajouter un délai entre les pages
                    if (currentPage < pageCount) {
                        // Utiliser des délais spécifiques au domaine si disponibles
                        const minDelay = domainConfig.options?.puppeteerOptions?.delayBetweenPages?.min || 1500;
                        const maxDelay = domainConfig.options?.puppeteerOptions?.delayBetweenPages?.max || 2500;
                        const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
                        await this.delay(delay);
                    }
                    continue;
                }
                // Sinon, utiliser la méthode standard pour les autres sites avec le bouton "suivant"
                const nextPageSelector = domainConfig.selectors.nextPage;
                if (!nextPageSelector) {
                    logger.info(`Pas de sélecteur "nextPage" défini pour ${job.source}, arrêt de la pagination`);
                    break;
                }
                const hasNextPage = await page.$(nextPageSelector)
                    .then(element => !!element)
                    .catch(() => false);
                if (!hasNextPage) {
                    logger.info(`Pas de bouton "suivant" trouvé sur la page ${currentPage}, arrêt de la pagination`);
                    break;
                }
                // Ajouter un délai entre les pages
                if (currentPage < pageCount) {
                    // Utiliser des délais spécifiques au domaine si disponibles
                    const minDelay = domainConfig.options?.puppeteerOptions?.delayBetweenPages?.min || 1000;
                    const maxDelay = domainConfig.options?.puppeteerOptions?.delayBetweenPages?.max || 2000;
                    const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
                    await this.delay(delay);
                }
            }
            logger.info(`Scraping Puppeteer terminé pour ${job.source}, ${allItems.length} items trouvés sur ${pageCount} page(s)`);
            return {
                title: pageTitle,
                items: allItems,
                metadata: {
                    source: job.source,
                    query: job.query,
                    timestamp: new Date().toISOString(),
                    scraperUsed: this.getType(),
                    executionTimeMs: Date.now() - startTime,
                    pagesScraped: pageCount
                }
            };
        }
        catch (error) {
            logger.error(`Erreur lors du scraping Puppeteer pour ${job.source}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
        finally {
            // Fermer la page
            if (page) {
                await page.close().catch(e => logger.warn(`Erreur lors de la fermeture de la page: ${e}`));
            }
            // Ne pas fermer le navigateur ici pour permettre sa réutilisation
            // Il sera fermé automatiquement lors de la fin du processus ou par une méthode cleanup explicite
        }
    }
    /**
     * Obtient une instance de navigateur (réutilisée si possible)
     */
    async getBrowser() {
        if (!this.browser || !this.browser.isConnected()) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                ],
                defaultViewport: {
                    width: 1920,
                    height: 1080
                }
            });
        }
        return this.browser;
    }
    /**
     * Configure la page pour le scraping
     */
    async setupPage(page) {
        // Configuration de l'user agent
        await page.setUserAgent(this.options.userAgent || '');
        // Intercepter les requêtes pour bloquer les ressources inutiles
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const resourceType = request.resourceType();
            const blockedTypes = ['image', 'font', 'media'];
            if (blockedTypes.includes(resourceType)) {
                request.abort();
            }
            else {
                request.continue();
            }
        });
        // Configuration des timeouts
        page.setDefaultTimeout(this.options.timeout || 30000);
        page.setDefaultNavigationTimeout(this.options.timeout || 30000);
        // Configurer les en-têtes HTTP
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        });
    }
    /**
     * Attend que le contenu soit chargé sur la page
     */
    async waitForContent(page, selectors) {
        try {
            // Attendre le conteneur principal des résultats
            await page.waitForSelector(selectors.container, {
                timeout: this.options.timeout
            });
            // Récupérer le domaine depuis l'URL actuelle
            const domain = new URL(page.url()).hostname;
            // Récupérer la configuration du domaine
            const domainConfig = domainRegistry.getConfig(domain);
            // Simuler un scroll pour charger le contenu lazy-loaded
            await this.autoScroll(page, domainConfig?.options?.puppeteerOptions);
            // Attendre un court moment pour que tout le contenu soit rendu
            await this.delay(1000);
        }
        catch (error) {
            logger.warn(`Timeout en attendant le contenu: ${error}`);
            // On continue quand même, peut-être que certains éléments sont disponibles
        }
    }
    /**
     * Effectue un défilement automatique pour charger le contenu lazy-loaded
     */
    async autoScroll(page, options) {
        // Valeurs par défaut
        const distance = options?.scrollDistance || 100;
        const maxScrolls = options?.maxScrolls || 80;
        const scrollDelay = options?.scrollDelay || 200;
        const pauseAfterScroll = options?.pauseAfterScroll || 1000;
        await page.evaluate(async (params) => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let scrollCount = 0;
                const timer = setInterval(() => {
                    // Calculer la hauteur de scroll
                    const scrollHeight = document.body.scrollHeight;
                    // Défiler
                    window.scrollBy(0, params.distance);
                    totalHeight += params.distance;
                    scrollCount++;
                    // Arrêter si on a atteint le bas de la page, le nombre max de scrolls, ou après un certain nombre de pixels
                    if (totalHeight >= scrollHeight || scrollCount >= params.maxScrolls || totalHeight > 8000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, params.scrollDelay);
            });
        }, { distance, maxScrolls, scrollDelay });
        // Attendre un moment après le défilement pour que tout soit bien chargé
        await this.delay(pauseAfterScroll);
    }
    /**
     * Ferme le navigateur (à appeler lors du nettoyage)
     */
    async cleanup() {
        if (this.browser && this.browser.isConnected()) {
            await this.browser.close();
            this.browser = null;
        }
    }
    // Dans les méthodes où nous utilisons page.waitForTimeout, utiliser setTimeout avec Promise
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// Exporter une instance par défaut
export const puppeteerStrategy = new PuppeteerStrategy();
