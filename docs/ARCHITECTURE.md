# Architecture du Système de Scraping

## Vue d'ensemble

Le système est conçu avec une architecture modulaire qui sépare les responsabilités en composants distincts :

1. **API Core** (Hono.js)
   - Gestion des requêtes HTTP
   - Validation des entrées
   - Routage et middleware

2. **Scraping Engine**
   - Stratégies de scraping (Cheerio/Puppeteer)
   - Gestion des domaines
   - Extraction de données

3. **Queue System** (BullMQ)
   - File d'attente des jobs
   - Gestion des workers
   - Planification des tâches

4. **Monitoring System**
   - WebSocket temps réel
   - Métriques et statistiques
   - Logs et alertes

## Architecture Détaillée

### 1. API Core

#### Endpoints Principaux

```typescript
// Jobs Management
GET    /api/v1/scraping/jobs     // Liste des jobs
POST   /api/v1/scraping/jobs     // Création d'un job
GET    /api/v1/scraping/jobs/:id // Détails d'un job
POST   /api/v1/scraping/jobs/:id/run // Exécution manuelle
DELETE /api/v1/scraping/jobs/:id // Suppression d'un job

// Monitoring
GET    /api/v1/scraping/stats    // Statistiques globales
GET    /api/v1/scraping/health   // État du système
GET    /api/v1/scraping/metrics  // Métriques détaillées

// WebSocket
WS     /api/v1/scraping/live     // Stream temps réel
```

#### Validation des Données

```typescript
interface ScrapingJob {
  source: string;           // Site cible
  query: string;           // Requête de recherche
  pageCount?: number;      // Nombre de pages (1-10)
  config?: ScrapingConfig; // Configuration spécifique
}

interface ScrapingConfig {
  userAgent?: string;
  timeout?: number;
  proxy?: string;
  headers?: Record<string, string>;
}
```

### 2. Scraping Engine

#### Stratégies de Scraping

1. **Cheerio Strategy**
   - Parsing HTML léger
   - Rapide et efficace
   - Pour sites statiques

2. **Puppeteer Strategy**
   - Rendu JavaScript
   - Navigation complexe
   - Pour sites dynamiques

#### Gestion des Domaines

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
  };
  requiresJavaScript: boolean;
  defaultStrategy: ScraperType;
  options?: {
    baseUrl?: string;
    maxPages?: number;
    puppeteerOptions?: {
      scrollDistance?: number;
      maxScrolls?: number;
      scrollDelay?: number;
    };
  };
}
```

### 3. Queue System

#### Architecture des Files

1. **Main Queue**
   - Jobs de scraping principaux
   - Priorité et planification

2. **Retry Queue**
   - Gestion des échecs
   - Backoff exponentiel

3. **Cleanup Queue**
   - Nettoyage des données
   - Maintenance périodique

#### Configuration BullMQ

```typescript
interface QueueConfig {
  name: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  options: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete: boolean | number;
    removeOnFail: boolean | number;
  };
}
```

### 4. Monitoring System

#### WebSocket Events

```typescript
interface WebSocketEvent {
  type: 'job_started' | 'job_completed' | 'job_failed' | 'item_scraped';
  jobId: string;
  timestamp: string;
  data: any;
}

interface CompleteEvent {
  jobId: string;
  result: {
    success: boolean;
    stats: any;
  };
  timestamp: string;
}
```

#### Métriques Collectées

1. **Métriques Globales**
   - Jobs actifs/complétés/échoués
   - Temps moyen d'exécution
   - Taux de succès

2. **Métriques par Job**
   - Items scrapés
   - Erreurs rencontrées
   - Temps d'exécution

## Sécurité

### 1. Rate Limiting

```typescript
const defaultRateLimits = {
  'ebay.com': { requests: 10, interval: 60000 },
  'amazon.com': { requests: 5, interval: 60000 },
  'etsy.com': { requests: 15, interval: 60000 },
  'leboncoin.fr': { requests: 8, interval: 60000 },
  'vinted.fr': { requests: 12, interval: 60000 }
};
```

### 2. Protection des Routes

- JWT Authentication
- CORS configuré
- Validation des entrées

## Scalabilité

### 1. Horizontal Scaling

- Multiple workers
- Redis pour synchronisation
- Load balancing

### 2. Performance

- Caching intelligent
- Optimisation des requêtes
- Gestion de la mémoire

## Monitoring & Logs

### 1. Logging System

- Logs structurés
- Rotation des logs
- Niveaux de verbosité

### 2. Alerting

- Seuils configurables
- Notifications
- Intégration Slack/Email

## Tests

### 1. Test Coverage

- Tests unitaires
- Tests d'intégration
- Tests end-to-end

### 2. CI/CD

- GitHub Actions
- Tests automatisés
- Déploiement continu

## Technologies Recommandées

1. **Frontend**
   - Next.js 14 (App Router)
   - TailwindCSS
   - ShadcnUI
   - TanStack Query
   - Zustand

2. **Backend**
   - Hono.js
   - PostgreSQL
   - Prisma ORM
   - Redis
   - Socket.io

3. **Monitoring**
   - Socket.io
   - Chart.js/D3.js
   - React-Query pour le polling

4. **Tests**
   - Vitest
   - Playwright
   - MSW pour le mocking 