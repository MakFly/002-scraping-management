# Exemples d'Utilisation du Système de Scraping

## Table des Matières

1. [Leboncoin](#leboncoin)
   - [Configuration](#configuration)
   - [Exemples d'API](#exemples-dapi)
   - [Résultats](#résultats)
2. [Autres Sources](#autres-sources)

## Leboncoin

### Configuration

Le scraper Leboncoin est configuré avec les paramètres suivants :

```typescript
const leboncoinConfig = {
  domain: 'leboncoin.fr',
  selectors: {
    container: '[data-qa-id="aditem_container"]',
    title: '[data-qa-id="aditem_title"]',
    price: '[data-qa-id="aditem_price"]',
    url: 'a',
    image: '[data-qa-id="aditem_image"] img',
    location: '[data-qa-id="aditem_location"]',
    description: '[data-qa-id="aditem_description"]',
    date: '[data-qa-id="aditem_date"]'
  },
  requiresJavaScript: true,
  defaultStrategy: ScraperType.PUPPETEER,
  options: {
    puppeteerOptions: {
      stealth: true,
      timeout: 30000
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  }
};
```

### Exemples d'API

#### 1. Création d'un Job de Scraping

```http
POST /api/v1/scraping/jobs
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "source": "leboncoin",
  "query": {
    "keywords": "appartement",
    "location": "Paris",
    "category": "immobilier",
    "filters": {
      "price": {
        "min": 100000,
        "max": 300000
      },
      "rooms": {
        "min": 2,
        "max": 4
      },
      "surface": {
        "min": 30,
        "max": 80
      }
    },
    "sort": "date-desc"
  },
  "pageCount": 5,
  "schedule": "0 */6 * * *",  // Toutes les 6 heures
  "config": {
    "timeout": 30000,
    "proxy": "http://proxy.example.com:8080"
  }
}
```

#### 2. Exécution Immédiate d'un Job

```http
POST /api/v1/scraping/jobs/immediate
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "source": "leboncoin",
  "query": {
    "keywords": "voiture",
    "location": "Lyon",
    "category": "voitures",
    "filters": {
      "price": {
        "min": 5000,
        "max": 15000
      },
      "year": {
        "min": 2015
      },
      "mileage": {
        "max": 100000
      }
    }
  },
  "pageCount": 2
}
```

### Résultats

Exemple de réponse pour une annonce scrapée :

```json
{
  "id": "2023456789",
  "title": "Appartement 3 pièces 65m² - Paris 15ème",
  "price": 295000,
  "currency": "EUR",
  "location": {
    "city": "Paris 15ème",
    "zipCode": "75015",
    "department": "Paris",
    "region": "Île-de-France"
  },
  "details": {
    "surface": 65,
    "rooms": 3,
    "type": "Appartement",
    "energy_rating": "C"
  },
  "description": "Bel appartement lumineux au 3ème étage...",
  "images": [
    {
      "url": "https://img.leboncoin.fr/api/v1/images/...",
      "thumbnail": "https://img.leboncoin.fr/api/v1/images/..."
    }
  ],
  "url": "https://www.leboncoin.fr/ventes_immobilieres/2023456789.htm",
  "date": "2024-03-21T14:30:00Z",
  "seller": {
    "type": "professional",
    "name": "Agence Immobilière XYZ",
    "siren": "123456789"
  },
  "metadata": {
    "scrapedAt": "2024-03-21T15:00:00Z",
    "source": "leboncoin",
    "version": "1.0"
  }
}
```

### Monitoring des Résultats

Pour suivre l'état et les résultats de vos jobs de scraping :

```http
GET /api/v1/scraping/jobs/{jobId}/results
Authorization: Bearer <your-token>

Response:
{
  "jobId": "job_xyz789",
  "status": "completed",
  "stats": {
    "totalItems": 47,
    "pagesScraped": 5,
    "duration": 45.2,
    "errors": []
  },
  "items": [...],
  "pagination": {
    "hasNextPage": true,
    "nextCursor": "cursor_abc123"
  }
}
```

### WebSocket Notifications

Pour recevoir des mises à jour en temps réel sur l'avancement du scraping :

```typescript
// Client-side code
const socket = io('ws://your-api-domain/scraping', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('scraping:progress', (data) => {
  console.log(`Job ${data.jobId}: ${data.progress}% complete`);
  console.log(`Items scraped: ${data.itemsScraped}`);
});

socket.on('scraping:complete', (data) => {
  console.log(`Job ${data.jobId} completed`);
  console.log(`Total items: ${data.totalItems}`);
});

socket.on('scraping:error', (data) => {
  console.error(`Error in job ${data.jobId}:`, data.error);
});
```

## Autres Sources

[Documentation à venir pour d'autres sources de scraping...] 