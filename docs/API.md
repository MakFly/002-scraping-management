# Documentation API

*[English version below](#api-documentation)*

## Endpoints API

### `/api/scrape` (POST)

Endpoint principal pour soumettre une tâche de scraping.

#### Paramètres de la requête

| Paramètre   | Type     | Description                                       | Requis  |
|-------------|----------|---------------------------------------------------|---------|
| source      | string   | La source à scraper                               | Oui     |
| query       | string   | La requête de recherche                           | Non     |
| pageCount   | number   | Le nombre de pages à scraper (défaut: 1)          | Non     |

#### Exemple de requête

```json
{
  "source": "example",
  "query": "test",
  "pageCount": 2
}
```

#### Réponse

```json
{
  "success": true,
  "message": "Job ajouté à la file d'attente",
  "jobId": "example-test-1234567890",
  "timestamp": "2023-03-18T12:34:56.789Z"
}
```

#### Codes de statut

| Code  | Description                                                    |
|-------|----------------------------------------------------------------|
| 200   | Succès - La tâche a été soumise                                |
| 400   | Erreur - Paramètres invalides                                  |
| 409   | Conflit - Une tâche similaire est déjà en cours d'exécution    |
| 429   | Trop de requêtes - Limite de taux dépassée                     |
| 500   | Erreur serveur interne                                         |

### `/` (GET)

Retourne un message de bienvenue.

#### Réponse

```
Bienvenue sur l'API de scraping !
```

### `/health` (GET)

Vérifie l'état de l'API.

#### Réponse

```json
{
  "status": "ok"
}
```

### `/swagger` (GET)

Interface Swagger pour explorer l'API.

### `/ui` (GET)

Interface Bull Board pour surveiller les files d'attente et l'état des tâches.

## Gestion du taux de requêtes

L'API implémente un système de limitation du taux de requêtes pour éviter les abus :

- Maximum de 5 requêtes par période de 10 secondes par adresse IP
- Les entrées expirées sont nettoyées toutes les minutes

## Vérification des tâches en double

L'API vérifie si une tâche similaire est déjà en cours d'exécution avant d'en ajouter une nouvelle. Une tâche est considérée comme similaire si elle a la même source et la même requête.

---

# API Documentation

## API Endpoints

### `/api/scrape` (POST)

Main endpoint for submitting a scraping task.

#### Request Parameters

| Parameter   | Type     | Description                                       | Required |
|-------------|----------|---------------------------------------------------|----------|
| source      | string   | The source to scrape                               | Yes      |
| query       | string   | The search query                                   | No       |
| pageCount   | number   | The number of pages to scrape (default: 1)         | No       |

#### Request Example

```json
{
  "source": "example",
  "query": "test",
  "pageCount": 2
}
```

#### Response

```json
{
  "success": true,
  "message": "Job added to queue",
  "jobId": "example-test-1234567890",
  "timestamp": "2023-03-18T12:34:56.789Z"
}
```

#### Status Codes

| Code  | Description                                               |
|-------|-----------------------------------------------------------|
| 200   | Success - The task has been submitted                     |
| 400   | Error - Invalid parameters                                |
| 409   | Conflict - A similar task is already being processed      |
| 429   | Too many requests - Rate limit exceeded                   |
| 500   | Internal server error                                     |

### `/` (GET)

Returns a welcome message.

#### Response

```
Welcome to the scraping API!
```

### `/health` (GET)

Checks the API status.

#### Response

```json
{
  "status": "ok"
}
```

### `/swagger` (GET)

Swagger UI for exploring the API.

### `/ui` (GET)

Bull Board UI for monitoring queues and task status.

## Rate Limiting

The API implements a rate limiting system to prevent abuse:

- Maximum of 5 requests per 10-second period per IP address
- Expired entries are cleaned up every minute

## Duplicate Task Checking

The API checks if a similar task is already being processed before adding a new one. A task is considered similar if it has the same source and query. 