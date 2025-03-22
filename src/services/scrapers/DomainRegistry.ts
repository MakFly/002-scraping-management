import { DomainConfig, DomainRegistry, ScraperType } from '../../types/Scraper';
import { logger } from '../../config/logger';

/**
 * Registre des configurations de scraping par domaine
 * Permet de centraliser et gérer les configurations pour différents sites web
 */
export class ScraperDomainRegistry implements DomainRegistry {
  private domains: Map<string, DomainConfig> = new Map();

  constructor() {
    // Ajouter quelques configurations par défaut
    this.registerDefaultDomains();
  }

  /**
   * Récupère la configuration pour un domaine spécifique
   */
  public getConfig(domain: string): DomainConfig | null {
    // Normaliser le domaine (enlever www., etc.)
    const normalizedDomain = this.normalizeDomain(domain);
    
    // Essayer d'abord une correspondance exacte
    if (this.domains.has(normalizedDomain)) {
      logger.info(`Configuration de scraping trouvée pour ${domain}`);
      return this.domains.get(normalizedDomain) || null;
    }
    
    // Vérifier si c'est un cas de domaine sans extension (.com, .fr, etc.)
    // Pour certains domaines connus, essayer d'ajouter l'extension
    if (normalizedDomain === 'autoscout24') {
      const withExtension = 'autoscout24.fr';
      if (this.domains.has(withExtension)) {
        logger.info(`Domaine sans extension détecté, utilisation de la configuration de ${withExtension} pour ${domain}`);
        return this.domains.get(withExtension) || null;
      }
    }
    
    if (normalizedDomain === 'ebay') {
      const withExtension = 'ebay.fr';
      if (this.domains.has(withExtension)) {
        logger.info(`Domaine sans extension détecté, utilisation de la configuration de ${withExtension} pour ${domain}`);
        return this.domains.get(withExtension) || null;
      }
    }
    
    // Essayer de trouver une correspondance partielle (sous-domaine)
    for (const [key, config] of this.domains.entries()) {
      if (normalizedDomain.endsWith(`.${key}`) || normalizedDomain.includes(key)) {
        logger.info(`Utilisation de la configuration de ${key} pour ${domain}`);
        return config;
      }
    }
    
    // Aucune configuration trouvée
    logger.warn(`Aucune configuration de scraping trouvée pour ${domain}, utilisation de la configuration générique`);
    return this.getGenericConfig(domain);
  }

  /**
   * Enregistre une nouvelle configuration de domaine
   */
  public registerDomain(config: DomainConfig): void {
    const normalizedDomain = this.normalizeDomain(config.domain);
    this.domains.set(normalizedDomain, config);
    logger.info(`Configuration de scraping enregistrée pour ${normalizedDomain}`);
  }

  /**
   * Liste tous les domaines configurés
   */
  public listDomains(): string[] {
    return Array.from(this.domains.keys());
  }

  /**
   * Normalise un nom de domaine pour la correspondance
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
   * Enregistre les configurations par défaut
   */
  private registerDefaultDomains(): void {
    // Amazon
    this.registerDomain({
      domain: 'amazon.fr',
      selectors: {
        container: '.s-result-item',
        title: '.a-text-normal',
        description: '.a-size-base',
        price: '.a-price .a-offscreen',
        url: '.a-link-normal',
        image: '.s-image',
      },
      requiresJavaScript: true,
      defaultStrategy: ScraperType.PUPPETEER,
    });

    // eBay - Configuration par défaut avec le domaine incorrect
    this.registerDomain({
      domain: 'ebay.com',
      selectors: {
        container: '.s-item__info',
        title: '.s-item__title',
        price: '.s-item__price',
        url: '.s-item__link',
        image: '.s-item__image-img',
        nextPage: '.pagination__next',  // Sélecteur pour la pagination
      },
      requiresJavaScript: false,
      defaultStrategy: ScraperType.CHEERIO,
    });
    
    // eBay France - Ajout de la configuration spécifique
    this.registerDomain({
      domain: 'ebay.fr',
      selectors: {
        container: '.s-item__info',
        title: '.s-item__title',
        price: '.s-item__price',
        url: '.s-item__link',
        image: '.s-item__image-img',
        nextPage: '.pagination__next',  // Sélecteur pour la pagination
      },
      requiresJavaScript: false,
      defaultStrategy: ScraperType.CHEERIO,
    });
    
    // AutoScout24 - Site de vente de voitures
    this.registerDomain({
      domain: 'autoscout24.fr',
      selectors: {
        container: 'article',
        title: '.ListItem_title__znV2I',
        price: '[data-testid="regular-price"]',
        url: 'a.ListItem_title__znV2I',
        image: 'img.CardImage_img__nbdLB',
        nextPage: '.scr-pagination a[data-testid="pagination-nav-next"]',
        pagination: '.scr-pagination',
        // Sélecteurs additionnels spécifiques à AutoScout24
        mileage: '[data-testid="VehicleDetails-mileage_road"]',
        description: '.VehicleDetailTable_container__mUUbY',
        city: '[data-testid="sellerinfo-address"], [class^="SellerInfo_private_"]',
        fallbackTitle: 'h2',
        fallbackPrice: '[data-testid="price"]'
      },
      requiresJavaScript: true, // AutoScout24 nécessite JavaScript pour un chargement complet
      defaultStrategy: ScraperType.PUPPETEER,
      // Options supplémentaires spécifiques à AutoScout24
      options: {
        baseUrl: 'https://www.autoscout24.fr/lst',
        defaultSearchUrl: 'https://www.autoscout24.fr/lst?atype=C&cy=F&desc=0&kmto=90000&mmmv=47%7C%7C%7C%2C13%7C%7C%7C%2C9%7C%7C%7C&page=1&powertype=kw&pricefrom=5000&priceto=100000&search_id=1wz8gihtx2n&sort=standard&source=listpage_pagination&ustate=N%2CU',
        maxPages: 15,
        defaultStartPage: 1,
        defaultPageCount: 1,
        puppeteerOptions: {
          scrollDistance: 100,
          maxScrolls: 50,
          scrollDelay: 100,
          pauseAfterScroll: 1000,
          delayBetweenPages: {
            min: 1500,
            max: 2500
          }
        }
      }
    });
    
    // Alias pour AutoScout24 sans extension (pour compatibilité)
    this.registerDomain({
      domain: 'autoscout24',
      selectors: {
        container: 'article',
        title: '.ListItem_title__znV2I',
        price: '[data-testid="regular-price"]',
        url: 'a.ListItem_title__znV2I',
        image: 'img.CardImage_img__nbdLB',
        nextPage: '.scr-pagination a[data-testid="pagination-nav-next"]',
        pagination: '.scr-pagination',
        mileage: '[data-testid="VehicleDetails-mileage_road"]',
        description: '.VehicleDetailTable_container__mUUbY',
        city: '[data-testid="sellerinfo-address"], [class^="SellerInfo_private_"]',
        fallbackTitle: 'h2',
        fallbackPrice: '[data-testid="price"]'
      },
      requiresJavaScript: true,
      defaultStrategy: ScraperType.PUPPETEER,
      options: {
        baseUrl: 'https://www.autoscout24.fr/lst',
        defaultSearchUrl: 'https://www.autoscout24.fr/lst?atype=C&cy=F&desc=0&kmto=90000&mmmv=47%7C%7C%7C%2C13%7C%7C%7C%2C9%7C%7C%7C&page=1&powertype=kw&pricefrom=5000&priceto=100000&search_id=1wz8gihtx2n&sort=standard&source=listpage_pagination&ustate=N%2CU',
        maxPages: 15,
        defaultStartPage: 1,
        defaultPageCount: 1,
        puppeteerOptions: {
          scrollDistance: 100,
          maxScrolls: 50,
          scrollDelay: 100,
          pauseAfterScroll: 1000,
          delayBetweenPages: {
            min: 1500,
            max: 2500
          }
        }
      }
    });
    
    // Exemple générique
    this.registerDomain({
      domain: 'generic',
      selectors: {
        container: 'article, .product, .item, .card',
        title: 'h1, h2, h3, .title',
        description: 'p, .description',
        price: '.price',
        url: 'a',
        image: 'img',
      },
      requiresJavaScript: false,
      defaultStrategy: ScraperType.CHEERIO,
    });
  }

  /**
   * Retourne une configuration générique pour un domaine inconnu
   */
  private getGenericConfig(domain: string): DomainConfig {
    return {
      domain,
      selectors: {
        container: 'article, .product, .item, .card, div[class*="product"], div[class*="item"]',
        title: 'h1, h2, h3, .title, [class*="title"]',
        description: 'p, .description, [class*="description"]',
        price: '.price, [class*="price"]',
        url: 'a',
        image: 'img',
      },
      requiresJavaScript: false,
      defaultStrategy: ScraperType.CHEERIO,
    };
  }
}

// Exporter une instance singleton
export const domainRegistry = new ScraperDomainRegistry(); 