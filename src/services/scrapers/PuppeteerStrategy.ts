import puppeteer, { Browser, Page } from 'puppeteer';
import { ScrapeJob as BullScrapeJob } from '../../queues/scrapeQueue';
import { ScrapeStrategy, ScrapedData, ScrapedItem, ScraperType, ScraperOptions, ExtendedScrapeJob } from '../../types/Scraper';
import { logger } from '../../config/logger';
import { domainRegistry } from './DomainRegistry';

/**
 * Stratégie de scraping utilisant Puppeteer pour le contenu dynamique
 * Optimisée pour les sites avec JavaScript complexe
 */
export class PuppeteerStrategy implements ScrapeStrategy {
  private options: ScraperOptions;
  private browser: Browser | null = null;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      retries: 2,
      ...options
    };
  }

  public getType(): ScraperType {
    return ScraperType.PUPPETEER;
  }

  /**
   * Effectue le scraping avec Puppeteer
   */
  public async scrape(job: ExtendedScrapeJob): Promise<ScrapedData> {
    const startTime = Date.now();
    logger.info(`Début du scraping avec Puppeteer pour ${job.source}`);
    
    let browser: Browser | null = null;
    let page: Page | null = null;
    
    try {
      // Récupérer la configuration du domaine
      const domainConfig = domainRegistry.getConfig(job.source);
      
      if (!domainConfig) {
        throw new Error(`Aucune configuration trouvée pour le domaine: ${job.source}`);
      }
      
      // Lancer le navigateur
      browser = await this.getBrowser();
      
      // Déterminer le nombre de pages à scraper
      const pageCount = job.pageCount || 1;
      let allItems: ScrapedItem[] = [];
      let pageTitle = '';
      
      // Itérer sur les pages
      for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
        // Construire l'URL avec paramètre de page si nécessaire
        const url = this.buildUrl(job.source, job.query || '', currentPage, job);
        
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
        
        // Traitement spécifique par domaine
        let items;
        if (job.source.includes('ebay')) {
          items = await this.extractEbayItems(page, domainConfig.selectors);
        } else if (job.source.includes('autoscout24')) {
          items = await this.extractAutoScout24Items(page, domainConfig.selectors);
        } else {
          items = await this.extractItems(page, domainConfig.selectors);
        }
        
        allItems = [...allItems, ...items];
        
        // Si c'est la dernière page, on sort de la boucle
        if (currentPage === pageCount) {
          break;
        }
        
        // Gestion spéciale pour AutoScout24 - on ne cherche pas de bouton suivant, on modifie directement l'URL
        if (job.source.includes('autoscout24')) {
          // On passe à la page suivante en modifiant l'URL directement
          logger.info(`AutoScout24: pagination par URL pour la page ${currentPage + 1}`);
          
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
        
        // Pour les autres sites, on cherche un bouton "suivant"
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
    } catch (error) {
      logger.error(`Erreur lors du scraping Puppeteer pour ${job.source}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
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
  private async getBrowser(): Promise<Browser> {
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
  private async setupPage(page: Page): Promise<void> {
    // Configuration de l'user agent
    await page.setUserAgent(this.options.userAgent || '');
    
    // Intercepter les requêtes pour bloquer les ressources inutiles
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const blockedTypes = ['image', 'font', 'media'];
      
      if (blockedTypes.includes(resourceType)) {
        request.abort();
      } else {
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
   * Construit l'URL de recherche à partir du domaine et de la requête
   */
  private buildUrl(domain: string, query: string = '', page: number = 1, job?: ExtendedScrapeJob): string {
    // Si le domaine contient déjà http:// ou https://, on l'utilise tel quel
    if (domain.startsWith('http')) {
      // Ajouter le paramètre de recherche si nécessaire
      if (query) {
        const url = new URL(domain);
        url.searchParams.set('q', query);
        if (page > 1) {
          url.searchParams.set('page', page.toString());
        }
        return url.toString();
      }
      return domain;
    }
    
    // Pour eBay, s'assurer que le domaine est complet
    if (domain === 'ebay') {
      domain = 'ebay.fr'; // Par défaut on utilise ebay.fr si seulement "ebay" est spécifié
    }
    
    // Récupérer la configuration du domaine pour les options spécifiques
    const domainConfig = domainRegistry.getConfig(domain);
    
    // URL spécifique pour AutoScout24 (traitement prioritaire)
    if (domain.includes('autoscout24')) {
      // Pour AutoScout24, la query est optionnelle, on utilise l'URL par défaut si aucune query
      if (!query && domainConfig?.options?.defaultSearchUrl) {
        let defaultUrl = String(domainConfig.options.defaultSearchUrl);
        
        // Ajouter le code postal et le rayon si fournis
        if (job?.zip) {
          if (defaultUrl.includes('?')) {
            defaultUrl += `&zip=${job.zip}`;
          } else {
            defaultUrl += `?zip=${job.zip}`;
          }
          // Ajouter le rayon de recherche si fourni
          if (job?.zipr) {
            defaultUrl += `&zipr=${job.zipr}`;
          }
        }
        
        // Si on doit paginer, remplacer le paramètre de page
        if (page > 1) {
          return defaultUrl.replace(/([&?])page=\d+/, `$1page=${page}`);
        }
        
        logger.info(`Utilisation de l'URL par défaut pour AutoScout24: ${defaultUrl}`);
        return defaultUrl;
      }
      
      // Si une query est fournie, l'ajouter à l'URL
      const baseUrl = `https://${domain}`;
      if (query) {
        let url = `${baseUrl}/lst?q=${encodeURIComponent(query)}`;
        
        // Ajouter les paramètres de localisation si fournis
        if (job?.zip) {
          url += `&zip=${job.zip}`;
          if (job?.zipr) {
            url += `&zipr=${job.zipr}`;
          }
        }
        
        // Ajouter le numéro de page
        if (page > 1) {
          url += `&page=${page}`;
        }
        
        logger.info(`URL de recherche construite pour AutoScout24: ${url}`);
        return url;
      }
      
      // Si on arrive ici, c'est qu'il n'y a ni query ni defaultSearchUrl
      // On utilise alors la baseUrl depuis la configuration
      if (domainConfig?.options?.baseUrl) {
        logger.info(`Utilisation de baseUrl pour AutoScout24: ${domainConfig.options.baseUrl}`);
        return String(domainConfig.options.baseUrl);
      }
      
      // Dernier recours: retourner le domaine avec https://
      const fullUrl = `https://www.${domain}/lst`;
      logger.info(`Utilisation de l'URL générée pour AutoScout24: ${fullUrl}`);
      return fullUrl;
    }
    
    // Sinon, on construit l'URL avec https://
    const baseUrl = `https://${domain}`;
    
    // Si le domaine a une configuration spécifique avec une baseUrl
    if (domainConfig?.options?.baseUrl) {
      if (!query) {
        const baseUrlStr = String(domainConfig.options.baseUrl);
        return baseUrlStr;
      }
      
      // Si nous avons une defaultSearchUrl, l'utiliser comme base
      if (domainConfig.options.defaultSearchUrl && !query.startsWith('http')) {
        const defaultUrlStr = String(domainConfig.options.defaultSearchUrl);
        // Remplacer le paramètre de page dans l'URL par défaut
        if (page > 1) {
          return defaultUrlStr.replace(/([&?])page=\d+/, `$1page=${page}`);
        }
        return defaultUrlStr;
      }
    }
    
    // Si query est une URL complète, l'utiliser directement
    if (query.startsWith('http')) return query;
    
    // Pattern pour les URLs de recherche selon le domaine avec pagination
    if (domain.includes('amazon')) {
      const url = `${baseUrl}/s?k=${encodeURIComponent(query)}`;
      return page > 1 ? `${url}&page=${page}` : url;
    } else if (domain.includes('ebay')) {
      const url = `${baseUrl}/sch/i.html?_nkw=${encodeURIComponent(query)}`;
      return page > 1 ? `${url}&_pgn=${page}` : url;
    } else if (domain.includes('google')) {
      const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
      return page > 1 ? `${url}&start=${(page-1)*10}` : url;
    }
    
    // Format générique pour les autres domaines
    const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
    return page > 1 ? `${url}&page=${page}` : url;
  }

  /**
   * Attend que le contenu soit chargé sur la page
   */
  private async waitForContent(page: Page, selectors: any): Promise<void> {
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
      
    } catch (error) {
      logger.warn(`Timeout en attendant le contenu: ${error}`);
      // On continue quand même, peut-être que certains éléments sont disponibles
    }
  }

  /**
   * Extrait les items à partir de la page avec Puppeteer
   */
  private async extractItems(page: Page, selectors: any): Promise<ScrapedItem[]> {
    return page.evaluate((selectors) => {
      const items: ScrapedItem[] = [];
      
      // Trouver tous les conteneurs d'items
      const containers = document.querySelectorAll(selectors.container);
      
      containers.forEach((container) => {
        const item: any = {};
        
        // Extraire les différentes données pour chaque item
        if (selectors.title) {
          const titleElement = container.querySelector(selectors.title);
          if (titleElement) {
            item.title = titleElement.textContent?.trim();
          }
        }
        
        if (selectors.description) {
          const descElement = container.querySelector(selectors.description);
          if (descElement) {
            item.description = descElement.textContent?.trim();
          }
        }
        
        if (selectors.price) {
          const priceElement = container.querySelector(selectors.price);
          if (priceElement) {
            item.price = priceElement.textContent?.trim();
          }
        }
        
        if (selectors.url) {
          const urlElement = container.querySelector(selectors.url);
          if (urlElement && urlElement instanceof HTMLAnchorElement) {
            item.url = urlElement.href;
          }
        }
        
        if (selectors.image) {
          const imgElement = container.querySelector(selectors.image);
          if (imgElement && imgElement instanceof HTMLImageElement) {
            item.image = imgElement.src || imgElement.dataset.src;
          }
        }
        
        // Vérifier que l'item a au moins un champ non vide
        if (Object.values(item).some(value => value)) {
          items.push(item);
        }
      });
      
      return items;
    }, selectors);
  }

  /**
   * Effectue un défilement automatique pour charger le contenu lazy-loaded
   */
  private async autoScroll(page: Page, options?: any): Promise<void> {
    // Valeurs par défaut
    const distance = options?.scrollDistance || 100;
    const maxScrolls = options?.maxScrolls || 80;
    const scrollDelay = options?.scrollDelay || 200;
    const pauseAfterScroll = options?.pauseAfterScroll || 1000;

    await page.evaluate(async (params) => {
      await new Promise<void>((resolve) => {
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
   * Extraction spéciale pour eBay
   */
  private async extractEbayItems(page: Page, selectors: any): Promise<ScrapedItem[]> {
    return page.evaluate((selectors) => {
      const items: any[] = [];
      
      // Pour eBay, nous devons chercher les éléments parents
      const containers = document.querySelectorAll('.s-item');
      
      containers.forEach((container) => {
        const item: any = {};
        
        // Extraction du titre
        if (selectors.title) {
          const titleElement = container.querySelector(selectors.title);
          if (titleElement) {
            item.title = titleElement.textContent?.trim();
          }
        }
        
        // Extraction du prix
        if (selectors.price) {
          const priceElement = container.querySelector(selectors.price);
          if (priceElement) {
            const priceText = priceElement.textContent?.trim();
            if (priceText) {
              // Nettoyage du prix
              const cleaned = priceText.replace(/[^\d.,]/g, '').trim();
              const normalized = cleaned.replace(',', '.');
              // Tentative de conversion en nombre
              const number = parseFloat(normalized);
              item.price = isNaN(number) ? priceText : number;
            }
          }
        }
        
        // Extraction de l'URL
        if (selectors.url) {
          const urlElement = container.querySelector(selectors.url);
          if (urlElement && urlElement instanceof HTMLAnchorElement) {
            item.url = urlElement.href;
          }
        }
        
        // Extraction de l'image
        if (selectors.image) {
          const imgElement = container.querySelector(selectors.image);
          if (imgElement && imgElement instanceof HTMLImageElement) {
            // eBay utilise souvent srcset ou data-src
            item.image = imgElement.src || imgElement.dataset.src;
            
            // Si srcset est présent, prendre la première URL
            if (!item.image && imgElement.srcset) {
              const firstSrc = imgElement.srcset.split(',')[0];
              if (firstSrc) {
                item.image = firstSrc.trim().split(' ')[0];
              }
            }
          }
        }
        
        // Ne garder que les éléments qui ont au moins l'URL ou le titre
        if (item.url || item.title) {
          items.push(item);
        }
      });
      
      return items;
    }, selectors);
  }

  /**
   * Extraction spécifique pour AutoScout24
   */
  private async extractAutoScout24Items(page: Page, selectors: any): Promise<ScrapedItem[]> {
    return page.evaluate((selectors) => {
      const items: any[] = [];
      
      // Trouver tous les conteneurs d'articles
      const containers = document.querySelectorAll(selectors.container);
      
      containers.forEach((container) => {
        const item: any = {};
        
        // Extraction du titre (avec fallback)
        if (selectors.title) {
          const titleElement = container.querySelector(selectors.title) || container.querySelector(selectors.fallbackTitle);
          if (titleElement) {
            item.title = titleElement.textContent?.trim();
            
            // Récupérer également l'URL du véhicule si c'est un lien
            if (titleElement.tagName === 'A' && titleElement instanceof HTMLAnchorElement) {
              item.url = titleElement.href;
            }
          }
        }
        
        // Extraction du prix (avec fallback)
        if (selectors.price) {
          const priceElement = container.querySelector(selectors.price) || container.querySelector(selectors.fallbackPrice);
          if (priceElement) {
            const priceText = priceElement.textContent?.trim();
            if (priceText) {
              // Nettoyage du prix
              const cleaned = priceText.replace(/[^\d.,]/g, '').trim();
              const normalized = cleaned.replace(',', '.');
              // Tentative de conversion en nombre
              const number = parseFloat(normalized);
              item.price = isNaN(number) ? priceText : number;
            }
          }
        }
        
        // Extraction de l'URL si pas déjà extraite via le titre
        if (selectors.url && !item.url) {
          const urlElement = container.querySelector('a');
          if (urlElement && urlElement instanceof HTMLAnchorElement) {
            item.url = urlElement.href;
          }
        }
        
        // Extraction de l'image
        if (selectors.image) {
          const imgElement = container.querySelector(selectors.image);
          if (imgElement && imgElement instanceof HTMLImageElement) {
            item.image = imgElement.src || imgElement.dataset.src;
            
            // Si srcset est présent, prendre la première URL
            if (!item.image && imgElement.srcset) {
              const firstSrc = imgElement.srcset.split(',')[0];
              if (firstSrc) {
                item.image = firstSrc.trim().split(' ')[0];
              }
            }
          }
        }
        
        // Extraction du kilométrage
        if (selectors.mileage) {
          const mileageElement = container.querySelector(selectors.mileage);
          if (mileageElement) {
            const mileageText = mileageElement.textContent?.trim();
            if (mileageText) {
              // Nettoyage du kilométrage
              const cleaned = mileageText.replace(/[^\d.,]/g, '').trim();
              const normalized = cleaned.replace(',', '.');
              const number = parseFloat(normalized);
              item.mileage = isNaN(number) ? mileageText : number;
            }
          }
        }
        
        // Extraction de la description
        if (selectors.description) {
          const descElement = container.querySelector(selectors.description);
          if (descElement) {
            item.description = descElement.textContent?.trim();
          }
        }
        
        // Extraction de la ville/emplacement
        if (selectors.city) {
          // Si city est un tableau de sélecteurs, essayer chacun jusqu'à trouver quelque chose
          if (Array.isArray(selectors.city)) {
            for (const citySelector of selectors.city) {
              const cityElement = container.querySelector(citySelector);
              if (cityElement && cityElement.textContent?.trim()) {
                item.city = cityElement.textContent.trim();
                break;
              }
            }
          } else {
            const cityElement = container.querySelector(selectors.city);
            if (cityElement) {
              item.city = cityElement.textContent?.trim();
            }
          }
        }
        
        // Ne garder que les éléments qui ont au moins l'URL ou le titre
        if (item.url || item.title) {
          items.push(item);
        }
      });
      
      return items;
    }, selectors);
  }

  /**
   * Ferme le navigateur (à appeler lors du nettoyage)
   */
  public async cleanup(): Promise<void> {
    if (this.browser && this.browser.isConnected()) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Dans les méthodes où nous utilisons page.waitForTimeout, utiliser setTimeout avec Promise
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exporter une instance par défaut
export const puppeteerStrategy = new PuppeteerStrategy(); 