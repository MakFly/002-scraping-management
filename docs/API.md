# Documentation de l'API

## Table des Matières

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Endpoints](#endpoints)
4. [WebSocket](#websocket)
5. [Modèles de Données](#modèles-de-données)
6. [Codes d'Erreur](#codes-derreur)
7. [Pagination](#pagination)
8. [Rate Limiting](#rate-limiting)

## Introduction

L'API est construite avec Hono.js et suit les principes REST. Elle utilise JSON pour les requêtes et les réponses.

**Base URL**: `http://localhost:3000/api/v1`

## Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification.

```typescript
// Header requis pour les requêtes authentifiées
Authorization: Bearer <token>
```

## Endpoints

### Gestion des Jobs

#### 1. Liste des Jobs

```typescript
GET /scraping/jobs

// Query Parameters
interface JobsQuery {
  cursor?: string;        // Cursor pour la pagination
  limit?: number;         // Nombre d'items par page (default: 10)
  status?: JobStatus;     // Filtre par statut
  source?: string;        // Filtre par source
}

// Response 200
interface JobsResponse {
  items: Array<{
    id: string;
    source: string;
    query: string;
    status: JobStatus;
    createdAt: string;
    updatedAt: string;
    lastRun?: string;
    nextRun?: string;
    stats: {
      totalRuns: number;
      successfulRuns: number;
      failedRuns: number;
      itemsScraped: number;
    };
  }>;
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
    count: number;
  };
}
```

#### 2. Création d'un Job

```typescript
POST /scraping/jobs

// Request Body
interface CreateJobRequest {
  source: string;           // Site cible
  query: string;           // Requête de recherche
  pageCount?: number;      // Nombre de pages (1-10)
  schedule?: string;       // Expression cron pour planification
  config?: {
    userAgent?: string;
    timeout?: number;
    proxy?: string;
    headers?: Record<string, string>;
  };
}

// Response 201
interface CreateJobResponse {
  id: string;
  source: string;
  query: string;
  status: 'created';
  createdAt: string;
}
```

#### 3. Détails d'un Job

```typescript
GET /scraping/jobs/:id

// Response 200
interface JobDetailResponse {
  id: string;
  source: string;
  query: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  nextRun?: string;
  config: ScrapingConfig;
  history: Array<{
    id: string;
    startTime: string;
    endTime: string;
    status: 'success' | 'failed';
    itemsScraped: number;
    errors?: string[];
    duration: number;
  }>;
  stats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    itemsScraped: number;
    averageDuration: number;
  };
}
```

#### 4. Exécution d'un Job

```typescript
POST /scraping/jobs/:id/run

// Response 202
interface RunJobResponse {
  id: string;
  executionId: string;
  status: 'running';
  startTime: string;
}
```

#### 5. Suppression d'un Job

```typescript
DELETE /scraping/jobs/:id

// Response 204
```

### Monitoring

#### 1. Statistiques Globales

```typescript
GET /scraping/stats

// Response 200
interface StatsResponse {
  jobs: {
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
  scraping: {
    totalItemsScraped: number;
    successRate: number;
    averageDuration: number;
  };
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    cpu: number;
  };
}
```

#### 2. État de Santé

```typescript
GET /scraping/health

// Response 200
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    api: ComponentHealth;
    database: ComponentHealth;
    redis: ComponentHealth;
    workers: ComponentHealth;
  };
  timestamp: string;
}

interface ComponentHealth {
  status: 'up' | 'down';
  latency: number;
  message?: string;
}
```

### Résultats de Scraping

#### 1. Liste des Résultats

```typescript
GET /scraping/results

// Query Parameters
interface ResultsQuery {
  jobId?: string;
  source?: string;
  cursor?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

// Response 200
interface ResultsResponse {
  items: Array<{
    id: string;
    jobId: string;
    source: string;
    data: ScrapedItem[];
    timestamp: string;
    stats: {
      itemCount: number;
      duration: number;
      pagesScraped: number;
    };
  }>;
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
    count: number;
  };
}
```

### Endpoints Spécifiques à Leboncoin

#### 1. Recherche sur Leboncoin

```typescript
POST /api/v1/scraping/leboncoin/search

// Request Body
interface LeboncoinSearchRequest {
  keywords: string;
  location?: {
    city?: string;
    department?: string;
    region?: string;
    radius?: number;  // en km
  };
  category?: string;
  filters?: {
    price?: {
      min?: number;
      max?: number;
    };
    rooms?: {
      min?: number;
      max?: number;
    };
    surface?: {
      min?: number;
      max?: number;
    };
    year?: {
      min?: number;
      max?: number;
    };
    mileage?: {
      min?: number;
      max?: number;
    };
    seller_type?: 'all' | 'private' | 'professional';
    urgent_only?: boolean;
    has_photos?: boolean;
  };
  sort?: 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'relevance';
  page?: number;
  items_per_page?: number;
}

// Response 200
interface LeboncoinSearchResponse {
  items: Array<{
    id: string;
    title: string;
    price: number;
    currency: string;
    location: {
      city: string;
      zipCode: string;
      department: string;
      region: string;
      coordinates?: {
        lat: number;
        lon: number;
      };
    };
    details: {
      surface?: number;
      rooms?: number;
      type?: string;
      energy_rating?: string;
      year?: number;
      mileage?: number;
    };
    description: string;
    images: Array<{
      url: string;
      thumbnail: string;
    }>;
    url: string;
    date: string;
    seller: {
      type: 'professional' | 'private';
      name?: string;
      siren?: string;
    };
    urgent: boolean;
    metadata: {
      scrapedAt: string;
      source: 'leboncoin';
      version: string;
    };
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: {
    duration: number;
    timestamp: string;
  };
}
```

#### 2. Détails d'une Annonce

```typescript
GET /api/v1/scraping/leboncoin/items/:id

// Response 200
interface LeboncoinItemResponse {
  id: string;
  title: string;
  price: number;
  currency: string;
  location: {
    city: string;
    zipCode: string;
    department: string;
    region: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
  };
  details: {
    surface?: number;
    rooms?: number;
    type?: string;
    energy_rating?: string;
    year?: number;
    mileage?: number;
    // Autres détails spécifiques à la catégorie
    [key: string]: any;
  };
  description: string;
  images: Array<{
    url: string;
    thumbnail: string;
  }>;
  url: string;
  date: string;
  seller: {
    type: 'professional' | 'private';
    name?: string;
    siren?: string;
    otherAds?: number;
    registrationDate?: string;
    ratings?: {
      average: number;
      count: number;
    };
  };
  urgent: boolean;
  metadata: {
    scrapedAt: string;
    source: 'leboncoin';
    version: string;
    category: string;
    subCategory?: string;
  };
  phoneNumber?: string;  // Disponible uniquement si autorisé
  email?: string;       // Disponible uniquement si autorisé
}
```

#### 3. Surveillance d'une Recherche

```typescript
POST /api/v1/scraping/leboncoin/watch

// Request Body
interface LeboncoinWatchRequest {
  name: string;
  search: LeboncoinSearchRequest;
  notifications: {
    email?: {
      enabled: boolean;
      frequency: 'instant' | 'hourly' | 'daily';
      recipients: string[];
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
    conditions?: {
      priceBelow?: number;
      priceDrop?: number;
      keywords?: string[];
      excludeKeywords?: string[];
    };
  };
  schedule: string;  // Expression cron
}

// Response 201
interface LeboncoinWatchResponse {
  id: string;
  name: string;
  status: 'active';
  createdAt: string;
  nextRun: string;
}
```

#### 4. Statistiques de Prix

```typescript
GET /api/v1/scraping/leboncoin/stats/prices

// Query Parameters
interface PriceStatsQuery {
  category: string;
  location?: string;
  timeframe?: '7d' | '30d' | '90d' | '1y';
  filters?: Record<string, any>;
}

// Response 200
interface PriceStatsResponse {
  average: number;
  median: number;
  min: number;
  max: number;
  distribution: Array<{
    range: {
      min: number;
      max: number;
    };
    count: number;
    percentage: number;
  }>;
  trends: {
    daily?: Array<{
      date: string;
      average: number;
      count: number;
    }>;
    weekly?: Array<{
      week: string;
      average: number;
      count: number;
    }>;
    monthly?: Array<{
      month: string;
      average: number;
      count: number;
    }>;
  };
  metadata: {
    timeframe: string;
    totalItems: number;
    lastUpdated: string;
  };
}
```

## WebSocket

### Connexion

```typescript
const ws = new WebSocket('ws://localhost:3000/api/v1/scraping/live');
```

### Événements

```typescript
interface WebSocketEvent {
  type: 'job_started' | 'job_completed' | 'job_failed' | 'item_scraped';
  jobId: string;
  timestamp: string;
  data: any;
}

// Exemple d'événements
{
  type: 'job_started',
  jobId: '123',
  timestamp: '2024-03-21T14:30:00Z',
  data: {
    source: 'ebay.com',
    query: 'vintage cards'
  }
}

{
  type: 'item_scraped',
  jobId: '123',
  timestamp: '2024-03-21T14:30:05Z',
  data: {
    title: 'Vintage Pokemon Card',
    price: '29.99',
    url: 'https://...'
  }
}
```

## Modèles de Données

### Job Status

```typescript
type JobStatus = 
  | 'created'    // Job créé mais jamais exécuté
  | 'scheduled'  // Job planifié
  | 'running'    // En cours d'exécution
  | 'completed'  // Terminé avec succès
  | 'failed'     // Échec de l'exécution
  | 'cancelled'  // Annulé par l'utilisateur
```

### Scraped Item

```typescript
interface ScrapedItem {
  title: string;
  price: number | string;
  url: string;
  image?: string;
  description?: string;
  metadata: Record<string, any>;
}
```

## Codes d'Erreur

| Code | Description |
|------|-------------|
| 400  | Requête invalide |
| 401  | Non authentifié |
| 403  | Non autorisé |
| 404  | Ressource non trouvée |
| 429  | Trop de requêtes |
| 500  | Erreur serveur |

### Format des Erreurs

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}
```

## Pagination

La pagination utilise un système de curseur pour de meilleures performances.

```typescript
interface PaginationQuery {
  cursor?: string;  // Curseur pour la page suivante
  limit?: number;   // Nombre d'items par page (max: 100)
}

interface PageInfo {
  hasNextPage: boolean;
  nextCursor: string | null;
  count: number;
}
```

## Rate Limiting

L'API implémente des limites de taux par utilisateur et par IP.

```typescript
// Headers de réponse
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1616501234
```

### Limites par défaut

- 100 requêtes par minute par IP
- 1000 requêtes par heure par utilisateur authentifié
- 5 jobs simultanés par utilisateur