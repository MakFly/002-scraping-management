# Système de Scraping

## Vue d'ensemble

Le système de scraping est conçu pour être flexible, robuste et adaptatif. Il utilise une approche multi-stratégies pour gérer différents types de sites web, avec une gestion intelligente des ressources et des erreurs.

## Architecture du Scraping

### 1. Stratégies de Scraping

#### Cheerio Strategy (Légère)

```typescript
interface CheerioStrategy {
  name: 'cheerio';
  execute: (url: string, config: ScrapingConfig) => Promise<ScrapedData>;
  capabilities: {
    javascript: false;
    interactivity: false;
    streaming: false;
  };
}
```

**Avantages**:
- Performance élevée
- Faible consommation mémoire
- Idéal pour sites statiques

**Cas d'utilisation**:
- Sites e-commerce basiques
- Blogs et sites d'actualités
- Catalogues statiques

#### Puppeteer Strategy (Complète)

```typescript
interface PuppeteerStrategy {
  name: 'puppeteer';
  execute: (url: string, config: ScrapingConfig) => Promise<ScrapedData>;
  capabilities: {
    javascript: true;
    interactivity: true;
    streaming: true;
  };
  options: {
    headless: boolean;
    stealth: boolean;
    proxy?: string;
  };
}
```

**Avantages**:
- Support JavaScript complet
- Navigation interactive
- Capture d'écran possible

**Cas d'utilisation**:
- Sites dynamiques
- Applications SPA
- Sites avec anti-bot

### 2. Gestion des Domaines

#### Configuration des Domaines

```typescript
interface DomainConfig {
  domain: string;
  selectors: {
    container: string;
    title: string;
    price: string;
    url: string;
    image?: string;
    nextPage?: string;
    // Sélecteurs spécifiques au domaine
    [key: string]: string;
  };
  requiresJavaScript: boolean;
  defaultStrategy: ScraperType;
  options?: {
    baseUrl?: string;
    maxPages?: number;
    puppeteerOptions?: PuppeteerOptions;
    headers?: Record<string, string>;
  };
}
```

#### Domaines Supportés

1. **eBay**
```typescript
{
  domain: 'ebay.com',
  selectors: {
    container: '.s-item__wrapper',
    title: '.s-item__title',
    price: '.s-item__price',
    url: '.s-item__link',
    image: '.s-item__image-img',
    nextPage: '.pagination__next'
  },
  requiresJavaScript: false,
  defaultStrategy: ScraperType.CHEERIO
}
```

2. **Amazon**
```typescript
{
  domain: 'amazon.com',
  selectors: {
    container: '[data-component-type="s-search-result"]',
    title: 'h2 a span',
    price: '.a-price-whole',
    url: 'h2 a',
    image: '.s-image',
    nextPage: '.s-pagination-next'
  },
  requiresJavaScript: true,
  defaultStrategy: ScraperType.PUPPETEER,
  options: {
    puppeteerOptions: {
      stealth: true
    }
  }
}
```

3. **Leboncoin**
```typescript
{
  domain: 'leboncoin.fr',
  selectors: {
    container: '[data-qa-id="aditem_container"]',
    title: '[data-qa-id="aditem_title"]',
    price: '[data-qa-id="aditem_price"]',
    url: 'a',
    image: '[data-qa-id="aditem_image"] img',
    location: '[data-qa-id="aditem_location"]'
  },
  requiresJavaScript: true,
  defaultStrategy: ScraperType.PUPPETEER
}
```

### Configuration Détaillée de Leboncoin

#### 1. Sélecteurs et Structure

```typescript
const leboncoinSelectors = {
  // Sélecteurs de liste
  listPage: {
    container: '[data-qa-id="aditem_container"]',
    items: {
      title: '[data-qa-id="aditem_title"]',
      price: '[data-qa-id="aditem_price"]',
      location: '[data-qa-id="aditem_location"]',
      date: '[data-qa-id="aditem_date"]',
      url: 'a',
      image: '[data-qa-id="aditem_image"] img',
      urgent: '[data-qa-id="aditem_urgent"]',
      pro: '[data-qa-id="aditem_pro"]'
    },
    pagination: {
      next: '[data-qa-id="pagination_next"]',
      current: '[data-qa-id="pagination_current"]',
      total: '[data-qa-id="pagination_total"]'
    }
  },
  
  // Sélecteurs de page détaillée
  detailPage: {
    title: '[data-qa-id="adview_title"]',
    price: '[data-qa-id="adview_price"]',
    description: '[data-qa-id="adview_description"]',
    location: {
      city: '[data-qa-id="adview_location_city"]',
      zipcode: '[data-qa-id="adview_location_zipcode"]',
      geo: '[data-qa-id="adview_location_map"]'
    },
    details: {
      container: '[data-qa-id="criteria_container"]',
      items: '[data-qa-id="criteria_item"]',
      labels: '[data-qa-id="criteria_label"]',
      values: '[data-qa-id="criteria_value"]'
    },
    images: {
      container: '[data-qa-id="slideshow_container"]',
      items: '[data-qa-id="slideshow_image"]',
      next: '[data-qa-id="slideshow_next"]'
    },
    seller: {
      name: '[data-qa-id="adview_contact_name"]',
      type: '[data-qa-id="adview_contact_type"]',
      siren: '[data-qa-id="adview_contact_siren"]',
      phone: '[data-qa-id="adview_contact_phone"]',
      email: '[data-qa-id="adview_contact_email"]'
    }
  }
};

const leboncoinConfig: ScraperConfig = {
  name: 'leboncoin',
  baseUrl: 'https://www.leboncoin.fr',
  selectors: leboncoinSelectors,
  
  // Configuration du navigateur
  browser: {
    type: 'puppeteer',
    options: {
      headless: true,
      stealth: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    }
  },
  
  // Gestion des requêtes
  requests: {
    concurrency: 2,
    rateLimit: {
      requests: 8,
      interval: 60000  // 8 requêtes par minute
    },
    timeout: 30000,
    retries: 3,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }
  },
  
  // Gestion des erreurs
  errorHandling: {
    // Détection des erreurs courantes
    patterns: {
      captcha: {
        selector: '[data-qa-id="challenge_container"]',
        action: 'retry_with_new_session'
      },
      blocked: {
        selector: '[data-qa-id="error_forbidden"]',
        action: 'change_proxy'
      },
      notFound: {
        selector: '[data-qa-id="error_not_found"]',
        action: 'skip'
      }
    },
    // Stratégies de récupération
    recovery: {
      maxRetries: 3,
      backoff: {
        type: 'exponential',
        initialDelay: 5000,
        maxDelay: 60000
      }
    }
  },
  
  // Transformations des données
  transforms: {
    price: (value: string) => {
      return parseInt(value.replace(/[^0-9]/g, ''));
    },
    date: (value: string) => {
      // Conversion des dates relatives en timestamps
      const now = new Date();
      if (value.includes('Aujourd\'hui')) {
        return now.toISOString();
      }
      if (value.includes('Hier')) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString();
      }
      // ... autres transformations de date
    },
    location: (value: string) => {
      const parts = value.split(' ');
      return {
        city: parts[0],
        zipCode: parts[1]?.match(/\d+/)?.[0],
        department: parts[1]?.match(/\d+/)?.[0]?.substring(0, 2)
      };
    }
  },
  
  // Validation des données
  validation: {
    required: ['title', 'price', 'location', 'url'],
    schema: {
      title: {
        type: 'string',
        minLength: 3
      },
      price: {
        type: 'number',
        minimum: 0
      },
      location: {
        type: 'object',
        required: ['city']
      },
      url: {
        type: 'string',
        pattern: '^https://www\\.leboncoin\\.fr/'
      }
    }
  },
  
  // Cache et stockage
  cache: {
    enabled: true,
    ttl: 3600,  // 1 heure
    strategy: 'redis',
    prefix: 'lbc:'
  }
};

// Stratégies de scraping spécifiques à Leboncoin
class LeboncoinScraper extends BaseScraper {
  async initialize() {
    // Configuration initiale
    await this.setupBrowser();
    await this.setupSession();
  }

  async setupSession() {
    // Gestion de la session et des cookies
    const page = await this.browser.newPage();
    await page.goto(this.config.baseUrl);
    await this.handleCookieConsent(page);
    this.cookies = await page.cookies();
  }

  async handleCookieConsent(page: Page) {
    const consentButton = await page.$('[data-qa-id="cookie-button-accept"]');
    if (consentButton) {
      await consentButton.click();
      await page.waitForTimeout(1000);
    }
  }

  async scrapeListPage(url: string): Promise<ScrapedItem[]> {
    const page = await this.getPage();
    await page.goto(url);

    // Attente du chargement des éléments
    await page.waitForSelector(this.config.selectors.listPage.container);

    // Extraction des données
    return await page.evaluate((selectors) => {
      const items = [];
      const containers = document.querySelectorAll(selectors.listPage.container);

      for (const container of containers) {
        items.push({
          title: container.querySelector(selectors.listPage.items.title)?.textContent,
          price: container.querySelector(selectors.listPage.items.price)?.textContent,
          // ... autres extractions
        });
      }

      return items;
    }, this.config.selectors);
  }

  async scrapeDetailPage(url: string): Promise<ScrapedItemDetail> {
    const page = await this.getPage();
    await page.goto(url);

    // Attente du chargement des éléments
    await page.waitForSelector(this.config.selectors.detailPage.title);

    // Gestion des images
    const images = await this.extractImages(page);
    
    // Extraction des détails
    const details = await this.extractDetails(page);

    // Extraction des informations de contact
    const contact = await this.extractContactInfo(page);

    return {
      ...details,
      images,
      contact
    };
  }

  private async extractImages(page: Page): Promise<string[]> {
    // Logique d'extraction des images avec gestion du carrousel
    const images = [];
    const container = await page.$(this.config.selectors.detailPage.images.container);
    
    if (container) {
      let hasMore = true;
      while (hasMore) {
        const newImages = await page.evaluate((selector) => {
          return Array.from(document.querySelectorAll(selector))
            .map(img => img.getAttribute('src'))
            .filter(src => src);
        }, this.config.selectors.detailPage.images.items);
        
        images.push(...newImages);
        
        // Clic sur suivant si disponible
        hasMore = await this.clickNext(page);
      }
    }
    
    return [...new Set(images)];  // Déduplification
  }

  private async extractDetails(page: Page): Promise<Record<string, any>> {
    // Extraction structurée des détails de l'annonce
    return await page.evaluate((selectors) => {
      const details = {};
      const container = document.querySelector(selectors.detailPage.details.container);
      
      if (container) {
        const items = container.querySelectorAll(selectors.detailPage.details.items);
        items.forEach(item => {
          const label = item.querySelector(selectors.detailPage.details.labels)?.textContent;
          const value = item.querySelector(selectors.detailPage.details.values)?.textContent;
          if (label && value) {
            details[label.toLowerCase().replace(/\s+/g, '_')] = value;
          }
        });
      }
      
      return details;
    }, this.config.selectors);
  }

  private async extractContactInfo(page: Page): Promise<ContactInfo> {
    // Extraction des informations de contact avec gestion des boutons de révélation
    return await page.evaluate((selectors) => {
      return {
        name: document.querySelector(selectors.detailPage.seller.name)?.textContent,
        type: document.querySelector(selectors.detailPage.seller.type)?.textContent,
        siren: document.querySelector(selectors.detailPage.seller.siren)?.textContent,
        // Les informations de contact peuvent nécessiter des interactions supplémentaires
      };
    }, this.config.selectors);
  }
}

// Exemple d'utilisation
const scraper = new LeboncoinScraper(leboncoinConfig);

// Recherche d'annonces
const results = await scraper.search({
  keywords: 'appartement',
  location: 'Paris',
  filters: {
    price: { min: 100000, max: 300000 },
    rooms: { min: 2 }
  }
});

// Extraction des détails d'une annonce
const details = await scraper.getItemDetails('12345678');

### 3. Gestion des Erreurs

#### Types d'Erreurs

```typescript
enum ScrapingErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  BOT_DETECTION = 'BOT_DETECTION'
}

interface ScrapingError {
  type: ScrapingErrorType;
  message: string;
  url: string;
  timestamp: string;
  strategy: ScraperType;
  retryable: boolean;
}
```

#### Stratégies de Récupération

1. **Retry avec Backoff**
```typescript
interface RetryStrategy {
  maxAttempts: number;
  backoff: {
    type: 'exponential' | 'linear';
    initialDelay: number;
    maxDelay: number;
  };
}
```

2. **Fallback Strategy**
```typescript
const fallbackStrategy = async (error: ScrapingError, job: ScrapingJob) => {
  if (error.type === ScrapingErrorType.BOT_DETECTION) {
    return switchToStealthMode(job);
  }
  if (error.type === ScrapingErrorType.PARSING_ERROR) {
    return switchToPuppeteer(job);
  }
  throw error;
};
```

### 4. Optimisations

#### Cache Management

```typescript
interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  strategy: 'memory' | 'redis';
  keyPrefix: string;
}

interface CacheEntry {
  data: ScrapedData;
  timestamp: string;
  source: string;
  query: string;
}
```

#### Rate Limiting

```typescript
interface RateLimitConfig {
  requests: number;    // Nombre de requêtes
  interval: number;    // Intervalle en millisecondes
  strategy: 'token' | 'sliding';
}

const defaultRateLimits: Record<string, RateLimitConfig> = {
  'ebay.com': { requests: 10, interval: 60000, strategy: 'sliding' },
  'amazon.com': { requests: 5, interval: 60000, strategy: 'token' },
  'leboncoin.fr': { requests: 8, interval: 60000, strategy: 'sliding' }
};
```

### 5. Monitoring et Métriques

#### Métriques par Scraping

```typescript
interface ScrapingMetrics {
  jobId: string;
  startTime: string;
  endTime: string;
  duration: number;
  strategy: ScraperType;
  itemsScraped: number;
  errors: ScrapingError[];
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}
```

#### Alertes

```typescript
interface ScrapingAlert {
  type: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  timestamp: string;
  metadata: Record<string, any>;
}
```

## Utilisation

### 1. Création d'un Job

```typescript
const job = await createScrapingJob({
  source: 'ebay.com',
  query: 'vintage pokemon cards',
  pageCount: 2,
  config: {
    userAgent: 'Mozilla/5.0 ...',
    timeout: 30000
  }
});
```

### 2. Monitoring en Temps Réel

```typescript
// WebSocket connection
const ws = new WebSocket('ws://api/v1/scraping/live');

ws.on('message', (data: WebSocketEvent) => {
  switch (data.type) {
    case 'job_started':
      console.log(`Job ${data.jobId} started`);
      break;
    case 'item_scraped':
      console.log(`New item: ${data.data.title}`);
      break;
    case 'job_completed':
      console.log(`Job ${data.jobId} completed`);
      break;
  }
});
```

### 3. Gestion des Résultats

```typescript
interface ScrapedData {
  items: Array<{
    title: string;
    price: number | string;
    url: string;
    image?: string;
    metadata: Record<string, any>;
  }>;
  stats: {
    total: number;
    successful: number;
    failed: number;
    duration: number;
  };
  source: string;
  query: string;
  timestamp: string;
}
```

## Bonnes Pratiques

1. **Respect des Robots.txt**
   - Vérification avant scraping
   - Respect des délais

2. **Gestion des Ressources**
   - Limitation de la mémoire
   - Nettoyage des navigateurs

3. **Rotation des User-Agents**
   - Liste d'agents réalistes
   - Rotation aléatoire

4. **Gestion des Proxies**
   - Pool de proxies
   - Rotation automatique

5. **Validation des Données**
   - Schémas de validation
   - Nettoyage des données 