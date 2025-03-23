# Documentation API

## Français

### Introduction

L'API de scraping expose plusieurs endpoints RESTful permettant de créer, gérer, et suivre des tâches de scraping. L'API utilise des formats JSON pour les requêtes et réponses, et implémente une pagination basée sur des curseurs pour optimiser les performances.

### Base URL

```
http://localhost:3000/api/v1/scraping
```

### Authentification

Actuellement, l'API ne nécessite pas d'authentification pour les environnements de développement. Pour la production, un système d'authentification par token JWT devrait être implémenté.

### Endpoints

#### Jobs de Scraping

##### Créer un Job de Scraping

```
POST /jobs
```

Corps de la requête:

```json
{
  "source": "leboncoin",
  "params": {
    "filters": {
      "category": {
        "id": "9"
      },
      "enums": {
        "ad_type": ["offer"]
      },
      "location": {}
    },
    "limit": 35,
    "limit_alu": 3,
    "sort_by": "time",
    "sort_order": "desc",
    "offset": 0,
    "extend": true,
    "listing_source": "direct_search"
  },
  "pagination": 2
}
```

ou

```json
{
  "source": "autoscout24",
  "query": "bmw serie 3",
  "pageCount": 3,
  "zip": "75000",
  "zipr": "100"
}
```

ou

```json
{
  "source": "ebay",
  "query": "macbook pro",
  "pageCount": 2
}
```

Réponse:

```json
{
  "success": true,
  "message": "Job created successfully",
  "jobId": 123,
  "timestamp": "2023-03-22T14:32:10.123Z"
}
```

##### Lister les Jobs

```
GET /jobs?cursor=<cursor>&limit=<limit>
```

Paramètres:
- `cursor`: Curseur pour la pagination (optionnel)
- `limit`: Nombre maximum d'éléments à retourner (défaut: 10)

Réponse:

```json
{
  "items": [
    {
      "id": 123,
      "source": "leboncoin",
      "query": "...",
      "pageCount": 2,
      "status": "completed",
      "createdAt": "2023-03-22T14:32:10.123Z",
      "updatedAt": "2023-03-22T14:35:21.456Z"
    },
    // ...
  ],
  "pageInfo": {
    "hasNextPage": true,
    "nextCursor": "eyJpZCI6MTIyfQ==",
    "count": 10
  }
}
```

##### Obtenir un Job Spécifique

```
GET /jobs/:id
```

Réponse:

```json
{
  "success": true,
  "job": {
    "id": 123,
    "source": "leboncoin",
    "query": "...",
    "pageCount": 2,
    "status": "completed",
    "createdAt": "2023-03-22T14:32:10.123Z",
    "updatedAt": "2023-03-22T14:35:21.456Z",
    "history": [
      {
        "id": 456,
        "status": "completed",
        "startTime": "2023-03-22T14:32:15.789Z",
        "endTime": "2023-03-22T14:35:21.456Z",
        "itemsScraped": 65,
        "errors": [],
        "results": {
          "items": [
            // Résultats du scraping
          ],
          "metadata": {
            "scraperUsed": "cheerio",
            "executionTimeMs": 186123,
            "pageTitle": "Résultats pour votre recherche"
          }
        }
      }
    ]
  }
}
```

##### Exécuter un Job

```
POST /jobs/:id/run
```

Réponse:

```json
{
  "success": true,
  "message": "Job started successfully",
  "jobId": 123,
  "source": "leboncoin",
  "timestamp": "2023-03-22T15:01:05.678Z"
}
```

##### Obtenir l'Historique des Jobs

```
GET /jobs/history
```

Réponse:

```json
{
  "success": true,
  "history": [
    {
      "id": 123,
      "source": "leboncoin",
      "status": "completed",
      "createdAt": "2023-03-22T14:32:10.123Z",
      "itemsScraped": 65,
      "executionTimeMs": 186123
    },
    // ...
  ]
}
```

#### Événements et Notifications

##### Stream d'Événements SSE

```
GET /events
```

Cet endpoint retourne un stream SSE avec les événements en temps réel.

Format des événements:

```
event: job_created
data: {"type":"job_created","jobId":"123","timestamp":"2023-03-22T14:32:10.123Z","data":{"source":"leboncoin","status":"pending","progress":0,"itemsScraped":0}}

event: job_started
data: {"type":"job_started","jobId":"123","timestamp":"2023-03-22T14:32:15.789Z","data":{"status":"running","source":"leboncoin","progress":0,"itemsScraped":0}}

event: job_progress
data: {"type":"job_progress","jobId":"123","timestamp":"2023-03-22T14:33:20.456Z","data":{"status":"running","progress":50,"itemsScraped":32,"message":"Scraping page 1/2"}}

event: job_completed
data: {"type":"job_completed","jobId":"123","timestamp":"2023-03-22T14:35:21.456Z","data":{"status":"completed","progress":100,"itemsScraped":65,"message":"Scraping completed successfully"}}
```

#### Statistiques

##### Obtenir les Statistiques Globales

```
GET /stats?timeRange=7d
```

Paramètres:
- `timeRange`: Période pour les statistiques (défaut: '7d') - Options: '24h', '7d', '30d', 'all'

Réponse:

```json
{
  "success": true,
  "stats": {
    "totalJobs": 157,
    "completedJobs": 143,
    "failedJobs": 12,
    "runningJobs": 2,
    "totalItemsScraped": 8743,
    "averageExecutionTimeMs": 127345,
    "sourcesDistribution": {
      "leboncoin": 84,
      "autoscout24": 42,
      "ebay": 31
    },
    "dailyJobsCount": [
      {"date": "2023-03-16", "count": 18},
      {"date": "2023-03-17", "count": 25},
      // ...
    ]
  }
}
```

### Codes de Statut HTTP

- `200 OK`: Requête traitée avec succès
- `201 Created`: Ressource créée avec succès
- `400 Bad Request`: Paramètres invalides
- `404 Not Found`: Ressource non trouvée
- `429 Too Many Requests`: Limite de taux dépassée
- `500 Internal Server Error`: Erreur serveur

### Pagination à Curseur

L'API utilise une pagination basée sur des curseurs pour optimiser les performances. Chaque réponse paginée contient un objet `pageInfo` avec:

- `hasNextPage`: Indique s'il y a plus de résultats disponibles
- `nextCursor`: Curseur encodé à utiliser pour la page suivante
- `count`: Nombre d'éléments dans la page actuelle

Le curseur est une chaîne encodée en Base64 contenant des métadonnées sur le dernier élément de la page actuelle.

### WebSockets

En plus des SSE, l'API propose une connexion WebSocket pour les notifications en temps réel:

```javascript
const socket = io('http://localhost:3000');

// Événements généraux
socket.on('job_created', (data) => { /* ... */ });
socket.on('job_started', (data) => { /* ... */ });
socket.on('job_progress', (data) => { /* ... */ });
socket.on('job_completed', (data) => { /* ... */ });
socket.on('job_failed', (data) => { /* ... */ });

// S'abonner à un job spécifique
socket.emit('subscribe', { jobId: '123' });

// Événements spécifiques à un job
socket.on('job:progress', (data) => { /* ... */ });
socket.on('job:log', (data) => { /* ... */ });
```

---

## English

### Introduction

The scraping API exposes several RESTful endpoints for creating, managing, and tracking scraping tasks. The API uses JSON formats for requests and responses, and implements cursor-based pagination to optimize performance.

### Base URL

```
http://localhost:3000/api/v1/scraping
```

### Authentication

Currently, the API does not require authentication for development environments. For production, a JWT token authentication system should be implemented.

### Endpoints

#### Scraping Jobs

##### Create a Scraping Job

```
POST /jobs
```

Request body:

```json
{
  "source": "leboncoin",
  "params": {
    "filters": {
      "category": {
        "id": "9"
      },
      "enums": {
        "ad_type": ["offer"]
      },
      "location": {}
    },
    "limit": 35,
    "limit_alu": 3,
    "sort_by": "time",
    "sort_order": "desc",
    "offset": 0,
    "extend": true,
    "listing_source": "direct_search"
  },
  "pagination": 2
}
```

or

```json
{
  "source": "autoscout24",
  "query": "bmw series 3",
  "pageCount": 3,
  "zip": "75000",
  "zipr": "100"
}
```

or

```json
{
  "source": "ebay",
  "query": "macbook pro",
  "pageCount": 2
}
```

Response:

```json
{
  "success": true,
  "message": "Job created successfully",
  "jobId": 123,
  "timestamp": "2023-03-22T14:32:10.123Z"
}
```

##### List Jobs

```
GET /jobs?cursor=<cursor>&limit=<limit>
```

Parameters:
- `cursor`: Pagination cursor (optional)
- `limit`: Maximum number of items to return (default: 10)

Response:

```json
{
  "items": [
    {
      "id": 123,
      "source": "leboncoin",
      "query": "...",
      "pageCount": 2,
      "status": "completed",
      "createdAt": "2023-03-22T14:32:10.123Z",
      "updatedAt": "2023-03-22T14:35:21.456Z"
    },
    // ...
  ],
  "pageInfo": {
    "hasNextPage": true,
    "nextCursor": "eyJpZCI6MTIyfQ==",
    "count": 10
  }
}
```

##### Get a Specific Job

```
GET /jobs/:id
```

Response:

```json
{
  "success": true,
  "job": {
    "id": 123,
    "source": "leboncoin",
    "query": "...",
    "pageCount": 2,
    "status": "completed",
    "createdAt": "2023-03-22T14:32:10.123Z",
    "updatedAt": "2023-03-22T14:35:21.456Z",
    "history": [
      {
        "id": 456,
        "status": "completed",
        "startTime": "2023-03-22T14:32:15.789Z",
        "endTime": "2023-03-22T14:35:21.456Z",
        "itemsScraped": 65,
        "errors": [],
        "results": {
          "items": [
            // Scraping results
          ],
          "metadata": {
            "scraperUsed": "cheerio",
            "executionTimeMs": 186123,
            "pageTitle": "Results for your search"
          }
        }
      }
    ]
  }
}
```

##### Execute a Job

```
POST /jobs/:id/run
```

Response:

```json
{
  "success": true,
  "message": "Job started successfully",
  "jobId": 123,
  "source": "leboncoin",
  "timestamp": "2023-03-22T15:01:05.678Z"
}
```

##### Get Job History

```
GET /jobs/history
```

Response:

```json
{
  "success": true,
  "history": [
    {
      "id": 123,
      "source": "leboncoin",
      "status": "completed",
      "createdAt": "2023-03-22T14:32:10.123Z",
      "itemsScraped": 65,
      "executionTimeMs": 186123
    },
    // ...
  ]
}
```

#### Events and Notifications

##### SSE Events Stream

```
GET /events
```

This endpoint returns an SSE stream with real-time events.

Event format:

```
event: job_created
data: {"type":"job_created","jobId":"123","timestamp":"2023-03-22T14:32:10.123Z","data":{"source":"leboncoin","status":"pending","progress":0,"itemsScraped":0}}

event: job_started
data: {"type":"job_started","jobId":"123","timestamp":"2023-03-22T14:32:15.789Z","data":{"status":"running","source":"leboncoin","progress":0,"itemsScraped":0}}

event: job_progress
data: {"type":"job_progress","jobId":"123","timestamp":"2023-03-22T14:33:20.456Z","data":{"status":"running","progress":50,"itemsScraped":32,"message":"Scraping page 1/2"}}

event: job_completed
data: {"type":"job_completed","jobId":"123","timestamp":"2023-03-22T14:35:21.456Z","data":{"status":"completed","progress":100,"itemsScraped":65,"message":"Scraping completed successfully"}}
```

#### Statistics

##### Get Global Statistics

```
GET /stats?timeRange=7d
```

Parameters:
- `timeRange`: Period for statistics (default: '7d') - Options: '24h', '7d', '30d', 'all'

Response:

```json
{
  "success": true,
  "stats": {
    "totalJobs": 157,
    "completedJobs": 143,
    "failedJobs": 12,
    "runningJobs": 2,
    "totalItemsScraped": 8743,
    "averageExecutionTimeMs": 127345,
    "sourcesDistribution": {
      "leboncoin": 84,
      "autoscout24": 42,
      "ebay": 31
    },
    "dailyJobsCount": [
      {"date": "2023-03-16", "count": 18},
      {"date": "2023-03-17", "count": 25},
      // ...
    ]
  }
}
```

### HTTP Status Codes

- `200 OK`: Request processed successfully
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Cursor Pagination

The API uses cursor-based pagination to optimize performance. Each paginated response contains a `pageInfo` object with:

- `hasNextPage`: Indicates if there are more results available
- `nextCursor`: Encoded cursor to use for the next page
- `count`: Number of items in the current page

The cursor is a Base64 encoded string containing metadata about the last item on the current page.

### WebSockets

In addition to SSE, the API offers a WebSocket connection for real-time notifications:

```javascript
const socket = io('http://localhost:3000');

// General events
socket.on('job_created', (data) => { /* ... */ });
socket.on('job_started', (data) => { /* ... */ });
socket.on('job_progress', (data) => { /* ... */ });
socket.on('job_completed', (data) => { /* ... */ });
socket.on('job_failed', (data) => { /* ... */ });

// Subscribe to a specific job
socket.emit('subscribe', { jobId: '123' });

// Job-specific events
socket.on('job:progress', (data) => { /* ... */ });
socket.on('job:log', (data) => { /* ... */ });
``` 