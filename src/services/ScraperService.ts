import { ScrapeJob } from '../queues/scrape.queue';
import { ScrapeStrategy, ScrapedData, ScraperType } from '../types/scraper.types';
import { logger } from '../config/logger';
import { domainRegistry } from './scrapers/DomainRegistry';
import { cheerioStrategy } from './scrapers/CheerioStrategy';
import { puppeteerStrategy } from './scrapers/PuppeteerStrategy';
import { leboncoinStrategy } from './scrapers/LeboncoinStrategy';
import { WebSocketService } from './WebSocketService';

/**
 * Service principal de scraping qui orchestre les différentes stratégies
 * Implémente une approche progressive avec fallback automatique
 */
export class ScraperService {
  private strategies: Map<ScraperType | string, ScrapeStrategy> = new Map();
  private wsService: WebSocketService;
  
  // Cache des stratégies optimales par domaine pour les prochaines requêtes
  private domainStrategyCache: Map<string, ScraperType | string> = new Map();

  constructor() {
    // Enregistrer les stratégies disponibles
    this.strategies.set(ScraperType.CHEERIO, cheerioStrategy);
    this.strategies.set(ScraperType.PUPPETEER, puppeteerStrategy);
    this.strategies.set('leboncoin', leboncoinStrategy);
    this.wsService = WebSocketService.getInstance();
  }

  /**
   * Méthode principale pour effectuer le scraping
   * Choisit automatiquement la meilleure stratégie
   */
  public async scrape(job: ScrapeJob): Promise<ScrapedData> {
    // Envoyer l'événement de début avec 0% de progression
    this.reportProgress(job.jobId, 0, job.source);

    // Si c'est une source Leboncoin, utiliser directement la stratégie Leboncoin
    if (job.source === 'leboncoin') {
      logger.info('Utilisation de la stratégie API Leboncoin');
      const strategy = this.getStrategy('leboncoin');
      
      // Mettre à jour le progrès à 10% pour indiquer que le job a commencé
      this.reportProgress(job.jobId, 10, job.source);
      
      const result = await strategy.scrape(job);
      
      // Mettre à jour le progrès à 100%
      this.reportProgress(job.jobId, 100, job.source, result.items.length);
      
      return result;
    }

    // Pour les autres sources, utiliser la logique existante
    const domain = this.normalizeDomain(job.source);
    const domainConfig = domainRegistry.getConfig(domain);
    
    if (!domainConfig) {
      logger.warn(`Aucune configuration trouvée pour le domaine: ${domain}, utilisation de la configuration générique`);
    }
    
    // Vérifier si on a déjà une stratégie optimale en cache pour ce domaine
    let strategyType = this.domainStrategyCache.get(domain);
    
    if (!strategyType) {
      // Si pas en cache, utiliser la stratégie par défaut de la configuration du domaine
      strategyType = domainConfig?.requiresJavaScript 
        ? ScraperType.PUPPETEER 
        : ScraperType.CHEERIO;
    }
    
    logger.info(`Stratégie initiale pour ${domain}: ${strategyType}`);
    
    // Progression plus graduelle pour AutoScout24
    if (job.source === 'autoscout24') {
      this.reportProgress(job.jobId, 5, job.source);
      
      // Si la stratégie est Puppeteer, on prépare un listener pour reporter la progression par page
      if (strategyType === ScraperType.PUPPETEER) {
        const totalPages = job.pageCount || 1;
        const progressPerPage = Math.floor(80 / totalPages); // 80% répartis sur toutes les pages
        
        // Ajouter un événement pour suivre la progression page par page
        const puppeteerStrategy = this.getStrategy(ScraperType.PUPPETEER) as any;
        if (puppeteerStrategy.onPageScraped) {
          puppeteerStrategy.onPageScraped = (pageNum: number, totalPages: number) => {
            const progressValue = 10 + (pageNum * progressPerPage);
            this.reportProgress(job.jobId, Math.min(90, progressValue), job.source);
          };
        }
      }
    } else {
      this.reportProgress(job.jobId, 20, job.source);
    }
    
    // Tentative avec la première stratégie
    try {
      const strategy = this.getStrategy(strategyType);
      
      if (job.source === 'autoscout24') {
        this.reportProgress(job.jobId, 10, job.source);
      } else {
        this.reportProgress(job.jobId, 40, job.source);
      }
      
      const result = await strategy.scrape(job);
      
      if (job.source === 'autoscout24') {
        this.reportProgress(job.jobId, 95, job.source, result.items.length);
      } else {
        this.reportProgress(job.jobId, 80, job.source, result.items.length);
      }
      
      // Si la stratégie initiale est Cheerio et n'a pas donné de résultats satisfaisants,
      // basculer vers Puppeteer
      if (
        strategyType === ScraperType.CHEERIO && 
        this.needsJavaScriptRendering(result)
      ) {
        logger.info(`Basculement vers Puppeteer pour ${domain} après un résultat insatisfaisant avec Cheerio`);
        
        // Mettre à jour le cache pour les prochaines requêtes
        this.domainStrategyCache.set(domain, ScraperType.PUPPETEER);
        
        // Réessayer avec Puppeteer
        this.reportProgress(job.jobId, 60, job.source);
        const puppeteerStrategy = this.getStrategy(ScraperType.PUPPETEER);
        const puppeteerResult = await puppeteerStrategy.scrape(job);
        this.reportProgress(job.jobId, 100, job.source, puppeteerResult.items.length);
        
        return puppeteerResult;
      }
      
      // La stratégie a fonctionné, la mettre en cache
      this.domainStrategyCache.set(domain, strategyType);
      this.reportProgress(job.jobId, 100, job.source, result.items.length);
      
      return result;
    } catch (error) {
      logger.error(`Erreur avec la stratégie ${strategyType} pour ${domain}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Si l'échec est avec Cheerio, tenter avec Puppeteer
      if (strategyType === ScraperType.CHEERIO) {
        logger.info(`Basculement vers Puppeteer pour ${domain} après une erreur avec Cheerio`);
        
        // Mettre à jour le cache pour les prochaines requêtes
        this.domainStrategyCache.set(domain, ScraperType.PUPPETEER);
        
        // Réessayer avec Puppeteer
        this.reportProgress(job.jobId, 60, job.source);
        const puppeteerStrategy = this.getStrategy(ScraperType.PUPPETEER);
        const result = await puppeteerStrategy.scrape(job);
        this.reportProgress(job.jobId, 100, job.source, result.items.length);
        
        return result;
      }
      
      // Si l'échec est déjà avec Puppeteer ou une autre stratégie, relancer l'erreur
      throw error;
    }
  }

  /**
   * Obtient une stratégie de scraping par son type
   */
  private getStrategy(type: ScraperType | string): ScrapeStrategy {
    const strategy = this.strategies.get(type);
    
    if (!strategy) {
      throw new Error(`Stratégie non disponible: ${type}`);
    }
    
    return strategy;
  }

  /**
   * Détermine si les résultats obtenus nécessitent JavaScript
   * (utilisé pour décider de basculer vers Puppeteer)
   */
  private needsJavaScriptRendering(result: ScrapedData): boolean {
    // Pas d'items trouvés
    if (result.items.length === 0) {
      return true;
    }
    
    // Trop peu d'items trouvés (peut indiquer que le contenu est généré par JS)
    if (result.items.length < 3) {
      return true;
    }
    
    // Les items semblent incomplets
    const incompleteItems = result.items.filter(item => {
      // Considérer un item comme incomplet s'il manque des données essentielles
      // comme le titre ou l'URL
      return !item.title || !item.url;
    });
    
    // Si plus de 50% des items sont incomplets, on considère que JS est nécessaire
    if (incompleteItems.length > result.items.length / 2) {
      return true;
    }
    
    return false;
  }

  /**
   * Normalise un nom de domaine
   */
  private normalizeDomain(domain: string): string {
    let normalizedDomain = domain.toLowerCase();
    
    // Supprimer le protocole s'il existe
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '');
    
    // Supprimer www. si présent
    normalizedDomain = normalizedDomain.replace(/^www\./, '');
    
    // Supprimer tout ce qui suit le premier slash
    normalizedDomain = normalizedDomain.split('/')[0];
    
    return normalizedDomain;
  }

  /**
   * Nettoie les ressources (à appeler lors de l'arrêt de l'application)
   */
  public async cleanup(): Promise<void> {
    // Nettoyer les ressources des stratégies
    const puppeteerStrategy = this.strategies.get(ScraperType.PUPPETEER);
    if (puppeteerStrategy && 'cleanup' in puppeteerStrategy) {
      await (puppeteerStrategy as any).cleanup();
    }
    
    // Vider le cache
    this.domainStrategyCache.clear();
  }

  /**
   * Rapporte la progression du scraping
   */
  private reportProgress(jobId: number, progress: number, source: string, itemsScraped: number = 0) {
    const data = {
      jobId: jobId.toString(),
      progress,
      status: progress === 100 ? 'completed' : 'running',
      timestamp: new Date().toISOString(),
      data: {
        source,
        progress,
        itemsScraped
      }
    };
    
    logger.info(`Sending progress update: ${JSON.stringify(data)}`);
    
    // Émettre via WebSocket
    this.wsService.emitToAll('scraping:update', data);
    
    // Émettre aussi à la room spécifique du job
    this.wsService.emitToJob(jobId, {
      type: 'job_update',
      ...data
    });
    
    logger.info(`Progress update for job ${jobId}: ${progress}%, items: ${itemsScraped}`);
  }
}

// Exporter une instance singleton
export const scraperService = new ScraperService(); 