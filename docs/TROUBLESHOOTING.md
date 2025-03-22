# Guide de Dépannage

Ce document fournit des solutions aux problèmes courants rencontrés lors de l'utilisation du système de scraping.

## Table des Matières

1. [Problèmes de Scraping](#problèmes-de-scraping)
2. [Problèmes de File d'Attente](#problèmes-de-file-dattente)
3. [Problèmes d'API](#problèmes-dapi)
4. [Problèmes de Performance](#problèmes-de-performance)
5. [Problèmes de Monitoring](#problèmes-de-monitoring)
6. [Erreurs Courantes](#erreurs-courantes)
7. [Outils de Diagnostic](#outils-de-diagnostic)

## Problèmes de Scraping

### 1. Timeouts de Connexion

#### Symptômes
- Les jobs de scraping échouent avec des erreurs de timeout
- Les requêtes prennent trop de temps à s'exécuter

#### Solutions
```typescript
// Augmenter les timeouts dans la configuration
export const scrapingConfig = {
  timeout: 30000,  // 30 secondes
  retries: 3,
  retryDelay: 5000,
  maxConcurrent: 5
};

// Utiliser un système de retry
try {
  await scraper.scrape(url);
} catch (error) {
  if (error instanceof TimeoutError) {
    await retry(async () => {
      await scraper.scrape(url);
    }, {
      retries: 3,
      factor: 2,
      minTimeout: 5000
    });
  }
}
```

### 2. Blocage par Anti-Bot

#### Symptômes
- Status code 403
- CAPTCHAs
- Redirections inattendues

#### Solutions
```typescript
// Rotation des User-Agents
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  // ...
];

// Rotation des Proxies
const proxyList = [
  { host: 'proxy1.example.com', port: 8080 },
  { host: 'proxy2.example.com', port: 8080 },
  // ...
];

// Délais aléatoires entre les requêtes
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
await delay(Math.random() * 5000 + 2000);
```

### 3. Parsing HTML Incorrect

#### Symptômes
- Données manquantes
- Sélecteurs qui ne fonctionnent pas
- Structure HTML inattendue

#### Solutions
```typescript
// Validation des sélecteurs
const validateSelector = (html: string, selector: string): boolean => {
  const $ = cheerio.load(html);
  return $(selector).length > 0;
};

// Logging détaillé
const logSelector = (html: string, selector: string) => {
  const $ = cheerio.load(html);
  console.log(`Selector: ${selector}`);
  console.log(`Found elements: ${$(selector).length}`);
  console.log(`HTML context: ${$(selector).parent().html()}`);
};

// Fallback sur des sélecteurs alternatifs
const getContent = (html: string, selectors: string[]): string | null => {
  const $ = cheerio.load(html);
  for (const selector of selectors) {
    const content = $(selector).text().trim();
    if (content) return content;
  }
  return null;
};
```

## Problèmes de File d'Attente

### 1. Jobs Bloqués

#### Symptômes
- Jobs coincés en statut "active"
- Jobs qui ne progressent pas
- Queue qui ne se vide pas

#### Solutions
```typescript
// Nettoyage des jobs bloqués
export const cleanStuckJobs = async (queue: Queue) => {
  const stuckJobs = await queue.getJobs(['active']);
  for (const job of stuckJobs) {
    const processedAt = job.processedOn;
    if (processedAt && Date.now() - processedAt > 3600000) {
      await job.moveToFailed(
        new Error('Job stuck'),
        'cleanup'
      );
    }
  }
};

// Monitoring des jobs
export const monitorQueue = async (queue: Queue) => {
  const metrics = await queue.getMetrics();
  console.log({
    waiting: metrics.waiting,
    active: metrics.active,
    completed: metrics.completed,
    failed: metrics.failed
  });
};
```

### 2. Problèmes de Concurrence

#### Symptômes
- Jobs qui s'exécutent plusieurs fois
- Résultats en double
- Incohérences dans les données

#### Solutions
```typescript
// Verrouillage des ressources
export class ResourceLock {
  private locks: Map<string, boolean> = new Map();

  public async acquire(resource: string): Promise<boolean> {
    if (this.locks.get(resource)) {
      return false;
    }
    this.locks.set(resource, true);
    return true;
  }

  public release(resource: string): void {
    this.locks.delete(resource);
  }
}

// Utilisation
const lock = new ResourceLock();
if (await lock.acquire(url)) {
  try {
    await processUrl(url);
  } finally {
    lock.release(url);
  }
}
```

## Problèmes d'API

### 1. Erreurs de Rate Limiting

#### Symptômes
- Status code 429
- Rejets des requêtes
- Headers de rate limit dépassés

#### Solutions
```typescript
// Middleware de rate limiting avec Redis
export const rateLimiter = async (ctx: Context, next: Next) => {
  const ip = ctx.req.header('x-forwarded-for') || ctx.req.ip;
  const key = `ratelimit:${ip}`;
  
  const [current] = await redis
    .multi()
    .incr(key)
    .expire(key, 60)
    .exec();

  if (current > 100) {
    ctx.status = 429;
    ctx.body = { error: 'Too Many Requests' };
    return;
  }

  await next();
};

// Headers de rate limit
ctx.res.headers.set('X-RateLimit-Limit', '100');
ctx.res.headers.set('X-RateLimit-Remaining', String(100 - current));
ctx.res.headers.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + 60));
```

### 2. Problèmes de Validation

#### Symptômes
- Erreurs de validation inattendues
- Données malformées
- Rejets des requêtes valides

#### Solutions
```typescript
// Validation avec Zod et logging détaillé
const validateInput = (data: unknown) => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', {
        input: data,
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code
        }))
      });
    }
    throw error;
  }
};

// Middleware de validation avec debug
export const validationMiddleware = (schema: z.ZodSchema) => {
  return async (ctx: Context, next: Next) => {
    try {
      ctx.state.validated = await validateInput(ctx.req.body);
      await next();
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        error: 'Validation Error',
        details: error.errors
      };
    }
  };
};
```

## Problèmes de Performance

### 1. Fuites de Mémoire

#### Symptômes
- Utilisation croissante de la mémoire
- Crashs OOM
- Ralentissements progressifs

#### Solutions
```typescript
// Monitoring de la mémoire
const monitorMemory = () => {
  const used = process.memoryUsage();
  console.log({
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`
  });
};

// Nettoyage des ressources
export class ResourceManager {
  private resources: Set<any> = new Set();

  public track(resource: any) {
    this.resources.add(resource);
  }

  public async cleanup() {
    for (const resource of this.resources) {
      if (resource.destroy) {
        await resource.destroy();
      }
    }
    this.resources.clear();
  }
}
```

### 2. Problèmes de Cache

#### Symptômes
- Hits de cache manqués
- Utilisation excessive de la mémoire
- Incohérences dans les données

#### Solutions
```typescript
// Gestionnaire de cache avec monitoring
export class CacheManager {
  private cache: Map<string, any> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    size: 0
  };

  public async get(key: string): Promise<any> {
    if (this.cache.has(key)) {
      this.stats.hits++;
      return this.cache.get(key);
    }
    this.stats.misses++;
    return null;
  }

  public set(key: string, value: any): void {
    this.cache.set(key, value);
    this.stats.size = this.cache.size;
  }

  public getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses)
    };
  }
}
```

## Problèmes de Monitoring

### 1. Connexions WebSocket Perdues

#### Symptômes
- Déconnexions fréquentes
- Mises à jour manquées
- Erreurs de connexion

#### Solutions
```typescript
// Client avec reconnexion automatique
export class MonitoringClient {
  private socket: Socket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(url: string) {
    this.socket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to monitoring server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected: ${reason}`);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect');
    });
  }
}
```

### 2. Métriques Manquantes

#### Symptômes
- Données incomplètes
- Gaps dans les métriques
- Incohérences dans les statistiques

#### Solutions
```typescript
// Collecteur de métriques avec buffer
export class MetricsCollector {
  private buffer: Map<string, number[]> = new Map();
  private flushInterval: number = 5000;

  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  public record(metric: string, value: number) {
    const values = this.buffer.get(metric) || [];
    values.push(value);
    this.buffer.set(metric, values);
  }

  private async flush() {
    const metrics = Array.from(this.buffer.entries()).map(
      ([metric, values]) => ({
        metric,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length
      })
    );

    await this.store(metrics);
    this.buffer.clear();
  }

  private async store(metrics: any[]) {
    // Implémentation du stockage
  }
}
```

## Erreurs Courantes

### 1. Codes d'Erreur

| Code | Description | Solution |
|------|-------------|----------|
| E001 | Timeout de connexion | Augmenter le timeout, utiliser un proxy |
| E002 | Erreur de parsing | Vérifier les sélecteurs, logger le HTML |
| E003 | Rate limit | Implémenter des délais, utiliser un proxy |
| E004 | Mémoire insuffisante | Nettoyer les ressources, augmenter la limite |
| E005 | Cache invalide | Vider le cache, vérifier la cohérence |

### 2. Messages d'Erreur

```typescript
// Gestionnaire d'erreurs centralisé
export class ErrorHandler {
  private static readonly errorMap = new Map<string, string>([
    ['E001', 'Connection timeout'],
    ['E002', 'Parsing error'],
    ['E003', 'Rate limit exceeded'],
    ['E004', 'Out of memory'],
    ['E005', 'Cache invalid']
  ]);

  public static getErrorMessage(code: string): string {
    return this.errorMap.get(code) || 'Unknown error';
  }

  public static handle(error: Error): void {
    console.error({
      code: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}
```

## Outils de Diagnostic

### 1. Logging

```typescript
// Logger structuré avec niveaux
export class Logger {
  private static instance: Logger;
  private level: string = 'info';

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLevel(level: string): void {
    this.level = level;
  }

  public log(level: string, message: string, context: any = {}) {
    if (this.shouldLog(level)) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context
      }));
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}
```

### 2. Monitoring

```typescript
// Dashboard de monitoring
export class MonitoringDashboard {
  private metrics: Map<string, number[]> = new Map();
  private readonly maxDataPoints = 100;

  public update(metric: string, value: number) {
    const values = this.metrics.get(metric) || [];
    values.push(value);
    
    if (values.length > this.maxDataPoints) {
      values.shift();
    }
    
    this.metrics.set(metric, values);
  }

  public getMetrics() {
    return Array.from(this.metrics.entries()).reduce(
      (acc, [metric, values]) => ({
        ...acc,
        [metric]: {
          current: values[values.length - 1],
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        }
      }),
      {}
    );
  }
}
``` 