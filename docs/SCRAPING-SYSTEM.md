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