# Documentation Technique

## Français

### Architecture Technique

L'application est construite selon une architecture orientée services avec les composants suivants:

#### Composants Principaux

1. **Serveur API (Hono.js)**
   - Point d'entrée HTTP pour les requêtes client
   - Implémentation des endpoints RESTful
   - Gestion des connexions WebSocket et SSE
   - Validation des requêtes avec Zod
   - Documentation OpenAPI/Swagger intégrée

2. **File d'Attente (BullMQ)**
   - Gestion asynchrone des tâches de scraping
   - Orchestration des jobs avec priorités
   - Persistence des tâches dans Redis
   - Mécanismes de retry automatique
   - Dashboard Bull-Board pour monitoring

3. **Workers**
   - Traitement des tâches en arrière-plan
   - Isolement des processus de scraping
   - Gestion de la concurrence
   - Reporting de progression en temps réel
   - Nettoyage des ressources après exécution

4. **Service de Scraping**
   - Stratégies multiples (Cheerio, Puppeteer)
   - Sélection automatique de la stratégie optimale
   - Extracteurs spécifiques par domaine
   - Normalisation des données extraites
   - Protection contre la détection (user-agents, délais)

5. **Base de Données (PostgreSQL/Prisma)**
   - Stockage des métadonnées des tâches
   - Conservation des résultats de scraping
   - Historique des exécutions
   - Schéma optimisé avec indexes
   - Migrations gérées par Prisma

6. **Service WebSocket/SSE**
   - Notifications temps réel des événements
   - Streaming des logs et de la progression
   - Gestion des connexions/déconnexions
   - Rooms spécifiques par tâche
   - Fallback automatique SSE/WS

### Modèle de Données

#### Schéma de Base de Données

```prisma
model ScrapeJob {
  id              Int               @id @default(autoincrement())
  source          String            // La cible (ex: "ebay", "amazon")
  query           String            // Requête de recherche
  pageCount       Int               @default(1)  // Nombre de pages à scraper (1-10)
  status          String            @default("idle") // idle, running, completed, failed, cancelled
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  history         ScrapeJobHistory[]

  @@index([status])
  @@index([createdAt])
}

model ScrapeJobHistory {
  id           Int        @id @default(autoincrement())
  jobId        Int
  status       String     // running, completed, failed
  startTime    DateTime   @default(now())
  endTime      DateTime?
  itemsScraped Int        @default(0)
  errors       String[]
  logs         String[]   // Entrées de log pour monitoring temps réel
  results      Json?      // Résultats de scraping en JSON
  job          ScrapeJob  @relation(fields: [jobId], references: [id])

  @@index([jobId])
  @@index([startTime])
  @@index([status])
}
```

### Stratégies de Scraping

#### 1. Cheerio Strategy

- Utilise `cheerio` pour parser le HTML statique
- Optimisée pour les performances et la faible consommation de ressources
- Utilise des sélecteurs CSS pour extraire les données
- Implémente des mécanismes de retry et timeout
- Limitations: ne peut pas exécuter de JavaScript

```typescript
export class CheerioStrategy implements ScrapeStrategy {
  public async scrape(job: ScrapeJob): Promise<ScrapedData> {
    // Fetch HTML content
    // Parse with Cheerio
    // Extract data using selectors
    // Normalize and return results
  }
}
```

#### 2. Puppeteer Strategy

- Utilise `puppeteer` pour le rendu complet avec JavaScript
- Supporte les sites dynamiques et les SPA
- Capable d'interactions complexes (scroll, clic, attente)
- Consommation de ressources plus élevée
- Options avancées (screenshots, blocage de ressources)

```typescript
export class PuppeteerStrategy implements ScrapeStrategy {
  public async scrape(job: ScrapeJob): Promise<ScrapedData> {
    // Launch browser
    // Navigate to target page
    // Wait for content to load
    // Extract data
    // Clean up and return results
  }
}
```

### API Endpoints

#### Jobs de Scraping

- `POST /api/v1/scraping/jobs` - Créer un nouveau job
- `GET /api/v1/scraping/jobs` - Lister les jobs (avec pagination)
- `GET /api/v1/scraping/jobs/:id` - Détails d'un job spécifique
- `POST /api/v1/scraping/jobs/:id/run` - Exécuter un job
- `GET /api/v1/scraping/jobs/history` - Historique complet

#### Événements et Notifications

- `GET /api/v1/scraping/events` - Stream SSE pour les événements
- Connexion WebSocket sur `/socket.io` pour les notifications push

#### Statistiques et Monitoring

- `GET /api/v1/scraping/stats` - Statistiques globales du système

### Sécurité et Performance

- Rate limiting par IP et par utilisateur
- Validation stricte des entrées avec Zod
- Protection CORS configurée
- Gestion efficace des ressources (timeouts, concurrence limitée)
- Nettoyage automatique des données temporaires
- Logs structurés avec niveaux de détail configurables

### Déploiement

- Containerisation avec Docker
- Services orchestrés via Docker Compose
- Variables d'environnement pour la configuration
- Healthchecks pour les composants critiques
- Gestion gracieuse des arrêts et redémarrages

---

## English

### Technical Architecture

The application is built on a service-oriented architecture with the following components:

#### Main Components

1. **API Server (Hono.js)**
   - HTTP entry point for client requests
   - Implementation of RESTful endpoints
   - Management of WebSocket and SSE connections
   - Request validation with Zod
   - Integrated OpenAPI/Swagger documentation

2. **Queue (BullMQ)**
   - Asynchronous management of scraping tasks
   - Job orchestration with priorities
   - Task persistence in Redis
   - Automatic retry mechanisms
   - Bull-Board dashboard for monitoring

3. **Workers**
   - Background task processing
   - Isolation of scraping processes
   - Concurrency management
   - Real-time progress reporting
   - Resource cleanup after execution

4. **Scraping Service**
   - Multiple strategies (Cheerio, Puppeteer)
   - Automatic selection of the optimal strategy
   - Domain-specific extractors
   - Normalization of extracted data
   - Protection against detection (user-agents, delays)

5. **Database (PostgreSQL/Prisma)**
   - Storage of task metadata
   - Preservation of scraping results
   - Execution history
   - Optimized schema with indexes
   - Migrations managed by Prisma

6. **WebSocket/SSE Service**
   - Real-time event notifications
   - Streaming of logs and progress
   - Connection/disconnection management
   - Task-specific rooms
   - Automatic SSE/WS fallback

### Data Model

#### Database Schema

```prisma
model ScrapeJob {
  id              Int               @id @default(autoincrement())
  source          String            // The target (e.g., "ebay", "amazon")
  query           String            // Search query
  pageCount       Int               @default(1)  // Number of pages to scrape (1-10)
  status          String            @default("idle") // idle, running, completed, failed, cancelled
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  history         ScrapeJobHistory[]

  @@index([status])
  @@index([createdAt])
}

model ScrapeJobHistory {
  id           Int        @id @default(autoincrement())
  jobId        Int
  status       String     // running, completed, failed
  startTime    DateTime   @default(now())
  endTime      DateTime?
  itemsScraped Int        @default(0)
  errors       String[]
  logs         String[]   // Log entries for real-time monitoring
  results      Json?      // Scraping results as JSON
  job          ScrapeJob  @relation(fields: [jobId], references: [id])

  @@index([jobId])
  @@index([startTime])
  @@index([status])
}
```

### Scraping Strategies

#### 1. Cheerio Strategy

- Uses `cheerio` to parse static HTML
- Optimized for performance and low resource consumption
- Uses CSS selectors to extract data
- Implements retry and timeout mechanisms
- Limitations: cannot execute JavaScript

```typescript
export class CheerioStrategy implements ScrapeStrategy {
  public async scrape(job: ScrapeJob): Promise<ScrapedData> {
    // Fetch HTML content
    // Parse with Cheerio
    // Extract data using selectors
    // Normalize and return results
  }
}
```

#### 2. Puppeteer Strategy

- Uses `puppeteer` for full rendering with JavaScript
- Supports dynamic sites and SPAs
- Capable of complex interactions (scroll, click, wait)
- Higher resource consumption
- Advanced options (screenshots, resource blocking)

```typescript
export class PuppeteerStrategy implements ScrapeStrategy {
  public async scrape(job: ScrapeJob): Promise<ScrapedData> {
    // Launch browser
    // Navigate to target page
    // Wait for content to load
    // Extract data
    // Clean up and return results
  }
}
```

### API Endpoints

#### Scraping Jobs

- `POST /api/v1/scraping/jobs` - Create a new job
- `GET /api/v1/scraping/jobs` - List jobs (with pagination)
- `GET /api/v1/scraping/jobs/:id` - Details of a specific job
- `POST /api/v1/scraping/jobs/:id/run` - Execute a job
- `GET /api/v1/scraping/jobs/history` - Complete history

#### Events and Notifications

- `GET /api/v1/scraping/events` - SSE stream for events
- WebSocket connection on `/socket.io` for push notifications

#### Statistics and Monitoring

- `GET /api/v1/scraping/stats` - Global system statistics

### Security and Performance

- Rate limiting by IP and user
- Strict input validation with Zod
- Configured CORS protection
- Efficient resource management (timeouts, limited concurrency)
- Automatic cleanup of temporary data
- Structured logs with configurable detail levels

### Deployment

- Containerization with Docker
- Services orchestrated via Docker Compose
- Environment variables for configuration
- Healthchecks for critical components
- Graceful handling of shutdowns and restarts 