import { ScrapeJob } from '../queues/scrape.queue';
import { ScrapeStrategy, ScrapedData, ScraperType } from '../types/Scraper';
import { logger } from '../config/logger';
import { domainRegistry } from './scrapers/DomainRegistry';
import { cheerioStrategy } from './scrapers/CheerioStrategy';
import { puppeteerStrategy } from './scrapers/PuppeteerStrategy';

/**
 * Service principal de scraping qui orchestre les différentes stratégies
 * Implémente une approche progressive avec fallback automatique
 */
export class ScraperService {
  private strategies: Map<ScraperType, ScrapeStrategy> = new Map();
  
  // Cache des stratégies optimales par domaine pour les prochaines requêtes
  private domainStrategyCache: Map<string, ScraperType> = new Map();

  constructor() {
    // Enregistrer les stratégies disponibles
    this.strategies.set(ScraperType.CHEERIO, cheerioStrategy);
    this.strategies.set(ScraperType.PUPPETEER, puppeteerStrategy);
  }

  /**
   * Méthode principale pour effectuer le scraping
   * Choisit automatiquement la meilleure stratégie
   */
  public async scrape(job: ScrapeJob): Promise<ScrapedData> {
    // Normaliser le domaine
    const domain = this.normalizeDomain(job.source);
    
    // Récupérer la configuration du domaine
    const domainConfig = domainRegistry.getConfig(domain);
    
    if (!domainConfig) {
      throw new Error(`Aucune configuration trouvée pour le domaine: ${domain}`);
    }
    
    // Vérifier si on a déjà une stratégie optimale en cache pour ce domaine
    let strategyType = this.domainStrategyCache.get(domain);
    
    if (!strategyType) {
      // Si pas en cache, utiliser la stratégie par défaut de la configuration du domaine
      strategyType = domainConfig.requiresJavaScript 
        ? ScraperType.PUPPETEER 
        : ScraperType.CHEERIO;
    }
    
    logger.info(`Stratégie initiale pour ${domain}: ${strategyType}`);
    
    // Tentative avec la première stratégie
    try {
      const strategy = this.getStrategy(strategyType);
      const result = await strategy.scrape(job);
      
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
        const puppeteerStrategy = this.getStrategy(ScraperType.PUPPETEER);
        return await puppeteerStrategy.scrape(job);
      }
      
      // La stratégie a fonctionné, la mettre en cache
      this.domainStrategyCache.set(domain, strategyType);
      
      return result;
    } catch (error) {
      logger.error(`Erreur avec la stratégie ${strategyType} pour ${domain}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Si l'échec est avec Cheerio, tenter avec Puppeteer
      if (strategyType === ScraperType.CHEERIO) {
        logger.info(`Basculement vers Puppeteer pour ${domain} après une erreur avec Cheerio`);
        
        // Mettre à jour le cache pour les prochaines requêtes
        this.domainStrategyCache.set(domain, ScraperType.PUPPETEER);
        
        // Réessayer avec Puppeteer
        const puppeteerStrategy = this.getStrategy(ScraperType.PUPPETEER);
        return await puppeteerStrategy.scrape(job);
      }
      
      // Si l'échec est déjà avec Puppeteer ou une autre stratégie, relancer l'erreur
      throw error;
    }
  }

  /**
   * Obtient une stratégie de scraping par son type
   */
  private getStrategy(type: ScraperType): ScrapeStrategy {
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
}

// Exporter une instance singleton
export const scraperService = new ScraperService(); 