# Architecture du Projet

## Français

### Vue d'Ensemble

Le projet de scraping est conçu selon une architecture en couches orientée services, avec une séparation claire des responsabilités. Cette architecture permet une maintenance aisée, une évolutivité horizontale et une extensibilité pour de nouvelles sources de données.

### Diagramme de l'Architecture

```
┌────────────────┐     ┌────────────────┐     ┌─────────────────┐
│                │     │                │     │                 │
│  Client HTTP/  │────▶│    API Hono    │────▶│  Controllers    │
│   WebSocket    │     │                │     │                 │
│                │◀────│                │◀────│                 │
└────────────────┘     └────────────────┘     └─────────────────┘
                                                       │
                                                       ▼
┌────────────────┐     ┌────────────────┐     ┌─────────────────┐
│                │     │                │     │                 │
│  Worker de     │◀───▶│  File d'attente│◀───▶│    Services     │
│   scraping     │     │   (BullMQ)     │     │                 │
│                │     │                │     │                 │
└────────────────┘     └────────────────┘     └─────────────────┘
       │                                               │
       ▼                                               ▼
┌────────────────┐                           ┌─────────────────┐
│  Stratégies    │                           │                 │
│  de scraping   │◀─────────────────────────▶│   Base de       │
│  (Cheerio/     │                           │   données       │
│   Puppeteer)   │                           │   (PostgreSQL)  │
└────────────────┘                           └─────────────────┘
```

### Composants Principaux

#### 1. Couche API (API Layer)

- **Contrôleurs (Controllers)**: Points d'entrée pour les requêtes HTTP, validation des entrées, formatage des réponses
- **Routes (Routes)**: Définition des endpoints REST avec versionnage
- **Middleware**: Gestion des erreurs, validation des requêtes, rate limiting, CORS

Cette couche utilise Hono.js comme framework web léger et rapide, avec validation via Zod.

#### 2. Couche Service (Service Layer)

- **ScrapeJobService**: Gestion des tâches de scraping (création, exécution, récupération)
- **ScraperService**: Orchestration des différentes stratégies de scraping
- **WebSocketService**: Gestion des notifications en temps réel
- **EventService**: Service de publication d'événements via SSE
- **RateLimiterService**: Limitation des taux de requêtes

La couche service encapsule la logique métier et sert d'interface entre les contrôleurs et la couche d'accès aux données.

#### 3. Couche Scraping (Scraping Layer)

- **Stratégies de Scraping**:
  - CheerioStrategy: Pour le HTML statique
  - PuppeteerStrategy: Pour le contenu dynamique
  - Stratégies spécifiques (ex: LeboncoinStrategy)
- **Extracteurs de Données**: Extracteurs spécifiques à chaque domaine cible
- **DomainRegistry**: Configuration des différents domaines supportés

Cette couche implémente le pattern Strategy pour adapter le comportement de scraping selon la source cible.

#### 4. Couche Worker (Worker Layer)

- **ScrapeWorker**: Processus de traitement des tâches en arrière-plan
- **Job Handlers**: Gestionnaires spécifiques pour différents types de tâches
- **Mécanismes de reprise**: Gestion des échecs et des tentatives

Utilise BullMQ pour gérer une file d'attente robuste basée sur Redis.

#### 5. Couche Persistence (Persistence Layer)

- **Prisma ORM**: Interface avec la base de données PostgreSQL
- **Modèles de données**: ScrapeJob, ScrapeJobHistory
- **Migrations**: Gestion de l'évolution du schéma de base de données

### Flux de Données

1. Le client envoie une requête HTTP pour créer une tâche de scraping
2. Le contrôleur valide la requête et appelle le service approprié
3. Le service crée une entrée dans la base de données et ajoute la tâche à la file d'attente
4. Un worker récupère la tâche de la file d'attente
5. Le worker utilise le service de scraping pour exécuter la tâche
6. Le service de scraping sélectionne la meilleure stratégie pour la source cible
7. La stratégie de scraping extrait les données et les retourne au worker
8. Le worker met à jour la base de données avec les résultats
9. Des notifications sont envoyées au client via WebSocket/SSE
10. Le client peut récupérer les résultats via l'API REST

### Communication en Temps Réel

Deux mécanismes de communication en temps réel sont implémentés:

1. **WebSockets (Socket.IO)**:
   - Bidirectionnel, idéal pour les tableaux de bord en temps réel
   - Support des chambres pour les abonnements par tâche
   - Gestion automatique de la reconnexion

2. **Server-Sent Events (SSE)**:
   - Unidirectionnel (serveur vers client)
   - Plus léger que WebSockets
   - Naturellement supporté par les navigateurs
   - Meilleur pour les connexions longues durée

### Extensibilité

L'architecture est conçue pour permettre:

1. **Ajout de nouvelles sources**:
   - Implémenter une nouvelle stratégie de scraping
   - Ajouter une configuration dans le DomainRegistry
   - Créer des extracteurs spécifiques si nécessaire

2. **Évolution des API**:
   - Versionnage des routes pour compatibilité
   - Adaptateurs pour les changements de format

3. **Scaling horizontal**:
   - Multiples instances de workers
   - Redis comme file d'attente distribuée
   - Cache partagé pour les résultats

### Mesures de Performance

- **Pagination à curseur**: Pour une récupération efficace des données volumineuses
- **Sélection adaptative des stratégies**: Utilisation de la stratégie la plus légère quand possible
- **Rate limiting**: Pour éviter la surcharge des sites cibles
- **Workers parallèles**: Pour traiter plusieurs tâches simultanément
- **Streaming des résultats**: Pour renvoyer des données partielles pendant l'exécution

---

## English

### Overview

The scraping project is designed according to a service-oriented layered architecture, with a clear separation of responsibilities. This architecture allows for easy maintenance, horizontal scalability, and extensibility for new data sources.

### Architecture Diagram

```
┌────────────────┐     ┌────────────────┐     ┌─────────────────┐
│                │     │                │     │                 │
│  HTTP/WebSocket│────▶│    Hono API    │────▶│  Controllers    │
│    Client      │     │                │     │                 │
│                │◀────│                │◀────│                 │
└────────────────┘     └────────────────┘     └─────────────────┘
                                                       │
                                                       ▼
┌────────────────┐     ┌────────────────┐     ┌─────────────────┐
│                │     │                │     │                 │
│  Scraping      │◀───▶│  Queue         │◀───▶│    Services     │
│   Worker       │     │   (BullMQ)     │     │                 │
│                │     │                │     │                 │
└────────────────┘     └────────────────┘     └─────────────────┘
       │                                               │
       ▼                                               ▼
┌────────────────┐                           ┌─────────────────┐
│  Scraping      │                           │                 │
│  Strategies    │◀─────────────────────────▶│   Database      │
│  (Cheerio/     │                           │   (PostgreSQL)  │
│   Puppeteer)   │                           │                 │
└────────────────┘                           └─────────────────┘
```

### Main Components

#### 1. API Layer

- **Controllers**: Entry points for HTTP requests, input validation, response formatting
- **Routes**: Definition of REST endpoints with versioning
- **Middleware**: Error handling, request validation, rate limiting, CORS

This layer uses Hono.js as a lightweight and fast web framework, with validation via Zod.

#### 2. Service Layer

- **ScrapeJobService**: Scraping task management (creation, execution, retrieval)
- **ScraperService**: Orchestration of different scraping strategies
- **WebSocketService**: Real-time notification management
- **EventService**: Event publishing service via SSE
- **RateLimiterService**: Request rate limitation

The service layer encapsulates business logic and serves as an interface between controllers and the data access layer.

#### 3. Scraping Layer

- **Scraping Strategies**:
  - CheerioStrategy: For static HTML
  - PuppeteerStrategy: For dynamic content
  - Specific strategies (e.g., LeboncoinStrategy)
- **Data Extractors**: Target-specific domain extractors
- **DomainRegistry**: Configuration of different supported domains

This layer implements the Strategy pattern to adapt scraping behavior according to the target source.

#### 4. Worker Layer

- **ScrapeWorker**: Background task processing
- **Job Handlers**: Specific handlers for different types of tasks
- **Recovery Mechanisms**: Failure handling and retry attempts

Uses BullMQ to manage a robust Redis-based queue.

#### 5. Persistence Layer

- **Prisma ORM**: Interface with PostgreSQL database
- **Data Models**: ScrapeJob, ScrapeJobHistory
- **Migrations**: Database schema evolution management

### Data Flow

1. The client sends an HTTP request to create a scraping task
2. The controller validates the request and calls the appropriate service
3. The service creates an entry in the database and adds the task to the queue
4. A worker retrieves the task from the queue
5. The worker uses the scraping service to execute the task
6. The scraping service selects the best strategy for the target source
7. The scraping strategy extracts the data and returns it to the worker
8. The worker updates the database with the results
9. Notifications are sent to the client via WebSocket/SSE
10. The client can retrieve the results via the REST API

### Real-Time Communication

Two real-time communication mechanisms are implemented:

1. **WebSockets (Socket.IO)**:
   - Bidirectional, ideal for real-time dashboards
   - Room support for per-task subscriptions
   - Automatic reconnection handling

2. **Server-Sent Events (SSE)**:
   - Unidirectional (server to client)
   - Lighter than WebSockets
   - Naturally supported by browsers
   - Better for long-duration connections

### Extensibility

The architecture is designed to allow:

1. **Adding new sources**:
   - Implement a new scraping strategy
   - Add a configuration in the DomainRegistry
   - Create specific extractors if necessary

2. **API Evolution**:
   - Route versioning for compatibility
   - Adapters for format changes

3. **Horizontal Scaling**:
   - Multiple worker instances
   - Redis as a distributed queue
   - Shared cache for results

### Performance Measures

- **Cursor Pagination**: For efficient retrieval of large data
- **Adaptive Strategy Selection**: Using the lightest strategy when possible
- **Rate Limiting**: To avoid overloading target sites
- **Parallel Workers**: To process multiple tasks simultaneously
- **Result Streaming**: To return partial data during execution 