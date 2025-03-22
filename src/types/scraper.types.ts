import { ScrapeJob as BullScrapeJob } from '../queues/scrape.queue';

export enum ScraperType {
  CHEERIO = 'cheerio',
  PUPPETEER = 'puppeteer',
  LEBONCOIN = 'leboncoin'
}

export interface ScrapedData {
  title?: string;
  items: ScrapedItem[];
  metadata: {
    source: string;
    query?: string;
    timestamp: string;
    scraperUsed: ScraperType;
    executionTimeMs: number;
    pagesScraped?: number; // Nombre de pages scrapées
  };
}

export interface ScrapedItem {
  title?: string;
  description?: string;
  url?: string;
  price?: string | number;
  image?: string;
  [key: string]: any; // Pour les propriétés spécifiques au domaine
}

// Nous étendons BullScrapeJob avec des propriétés supplémentaires
export interface ExtendedScrapeJob extends BullScrapeJob {
  // Paramètres spécifiques pour AutoScout24
  zip?: string; // Code postal pour la recherche
  zipr?: string; // Rayon de recherche autour du code postal (en km)
}

export interface ScrapeStrategy {
  scrape(job: ExtendedScrapeJob): Promise<ScrapedData>;
  getType(): ScraperType;
}

export interface ScraperOptions {
  timeout?: number;
  userAgent?: string;
  retries?: number;
}

export interface DomainConfig {
  domain: string;
  selectors: {
    container: string;
    title?: string;
    description?: string;
    price?: string;
    url?: string;
    image?: string;
    [key: string]: string | undefined;
  };
  requiresJavaScript: boolean;
  defaultStrategy: ScraperType;
  options?: Record<string, any>; // Options spécifiques au domaine (URLs, configurations, etc.)
}

export interface DomainRegistry {
  getConfig(domain: string): DomainConfig | null;
  registerDomain(config: DomainConfig): void;
} 