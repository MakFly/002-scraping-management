# Guide de Test de l'API de Scraping

Ce guide vous montre comment tester les différents endpoints de l'API de scraping.

## Prérequis

- MongoDB en cours d'exécution (via Docker ou en local)
- Redis en cours d'exécution (pour BullMQ)
- L'API démarrée sur `http://localhost:3000`

## Endpoints à Tester

### 1. Création d'un Job

```bash
curl -X POST http://localhost:3000/api/v1/scraping/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product Scraper",
    "target": "https://example.com/products",
    "config": {
      "selector": ".product-card",
      "fields": ["title", "price", "description"]
    }
  }'
```

Réponse attendue :
```json
{
  "success": true,
  "message": "Job created successfully",
  "jobId": "...",
  "data": {
    "name": "Test Product Scraper",
    "target": "https://example.com/products",
    "config": {
      "selector": ".product-card",
      "fields": ["title", "price", "description"]
    }
  },
  "timestamp": "..."
}
```

### 2. Liste des Jobs

```bash
# Sans pagination
curl http://localhost:3000/api/v1/scraping/jobs

# Avec pagination
curl "http://localhost:3000/api/v1/scraping/jobs?limit=5&cursor=CURSOR_ID"
```

Réponse attendue :
```json
{
  "items": [
    {
      "id": "...",
      "name": "Test Product Scraper",
      "status": "idle",
      "lastRun": null,
      "nextRun": null,
      "type": "manual",
      "target": "https://example.com/products",
      "config": { ... }
    }
  ],
  "pageInfo": {
    "hasNextPage": false,
    "nextCursor": null,
    "count": 1
  }
}
```

### 3. Détails d'un Job

```bash
curl http://localhost:3000/api/v1/scraping/jobs/JOB_ID
```

Réponse attendue :
```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "jobId": "...",
  "name": "Test Product Scraper",
  "status": "idle",
  "target": "https://example.com/products",
  "config": { ... },
  "history": [],
  "timestamp": "..."
}
```

### 4. Exécution d'un Job

```bash
curl -X POST http://localhost:3000/api/v1/scraping/jobs/JOB_ID/run
```

Réponse attendue :
```json
{
  "jobId": "...",
  "startTime": "...",
  "status": "running"
}
```

### 5. Statistiques Globales

```bash
curl http://localhost:3000/api/v1/scraping/stats
```

Réponse attendue :
```json
{
  "totalJobs": 1,
  "activeJobs": 0,
  "completedToday": 0,
  "failedToday": 0,
  "totalItemsScraped": 0
}
```

## Interfaces Web

### Dashboard BullMQ
- URL : `http://localhost:3000/dashboard`
- Permet de surveiller les jobs dans la file d'attente
- Voir les jobs en cours, terminés, en erreur
- Relancer des jobs en erreur

### Documentation Swagger
- URL : `http://localhost:3000/docs/swagger`
- Documentation interactive de l'API
- Permet de tester les endpoints directement depuis l'interface

## Validation des Jobs

Les jobs sont validés selon ces règles :
- `name` : Chaîne de caractères requise
- `target` : URL valide requise
- `schedule` : Expression cron optionnelle
- `config` : Objet de configuration requis

## Surveillance en Temps Réel

Pour surveiller un job en temps réel :
1. Notez l'ID du job après sa création
2. Utilisez l'endpoint `/api/v1/scraping/jobs/JOB_ID` pour voir son état
3. Consultez le dashboard BullMQ pour plus de détails

## Gestion des Erreurs

Les erreurs courantes retournent :
- `400` : Requête invalide (validation)
- `404` : Job non trouvé
- `500` : Erreur serveur

## Tests de Performance

Pour tester la performance :
```bash
# Créer 10 jobs en parallèle
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/scraping/jobs \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Perf Test '$i'",
      "target": "https://example.com",
      "config": {
        "selector": ".item"
      }
    }' &
done
wait
```

# Stratégies de Test

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Tests Unitaires](#tests-unitaires)
3. [Tests d'Intégration](#tests-dintégration)
4. [Tests End-to-End](#tests-end-to-end)
5. [Tests de Performance](#tests-de-performance)
6. [Mocking et Fixtures](#mocking-et-fixtures)
7. [CI/CD](#cicd)
8. [Bonnes Pratiques](#bonnes-pratiques)

## Vue d'ensemble

Le système de test est conçu pour assurer la qualité et la fiabilité du système de scraping à tous les niveaux.

### Structure des Tests

```
tests/
├── unit/               # Tests unitaires
├── integration/        # Tests d'intégration
├── e2e/               # Tests end-to-end
├── performance/       # Tests de performance
├── fixtures/          # Données de test
└── mocks/            # Mocks et stubs
```

## Tests Unitaires

### 1. Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/'],
    },
    setupFiles: ['./test/setup.ts'],
  },
});
```

### 2. Exemples de Tests

```typescript
// ScraperService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ScraperService } from '../src/services/ScraperService';
import { ScraperType } from '../src/types/Scraper';

describe('ScraperService', () => {
  it('should select correct strategy based on domain config', () => {
    const service = new ScraperService();
    const job = {
      source: 'ebay.com',
      query: 'test',
      pageCount: 1
    };

    const strategy = service.selectStrategy(job);
    expect(strategy.type).toBe(ScraperType.CHEERIO);
  });

  it('should handle rate limiting correctly', async () => {
    const service = new ScraperService();
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.name = 'RateLimitError';

    const mockStrategy = {
      execute: vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ items: [] })
    };

    vi.spyOn(service, 'selectStrategy').mockReturnValue(mockStrategy);

    const result = await service.scrape({
      source: 'test.com',
      query: 'test'
    });

    expect(mockStrategy.execute).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });
});
```

## Tests d'Intégration

### 1. Configuration

```typescript
// test/integration/setup.ts
import { PrismaClient } from '@prisma/client';
import { createTestContainer } from './container';

export const setupIntegrationTest = async () => {
  const container = await createTestContainer();
  const prisma = container.get(PrismaClient);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  return { container, prisma };
};
```

### 2. Exemples de Tests

```typescript
// JobQueue.integration.test.ts
import { describe, it, expect } from 'vitest';
import { setupIntegrationTest } from './setup';
import { JobQueue } from '../src/queues/JobQueue';

describe('JobQueue Integration', () => {
  const { container } = setupIntegrationTest();
  const queue = container.get(JobQueue);

  it('should process jobs in order', async () => {
    const jobs = [
      { id: '1', source: 'test.com', query: 'test1' },
      { id: '2', source: 'test.com', query: 'test2' }
    ];

    await Promise.all(jobs.map(job => queue.add(job)));

    const processed = await queue.getCompleted();
    expect(processed).toHaveLength(2);
    expect(processed[0].id).toBe('1');
    expect(processed[1].id).toBe('2');
  });

  it('should handle failed jobs correctly', async () => {
    const failingJob = {
      id: '3',
      source: 'invalid.com',
      query: 'test'
    };

    await queue.add(failingJob);
    const failed = await queue.getFailed();
    
    expect(failed).toHaveLength(1);
    expect(failed[0].id).toBe('3');
    expect(failed[0].failedReason).toBeDefined();
  });
});
```

## Tests End-to-End

### 1. Configuration

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium' },
    },
    {
      name: 'Firefox',
      use: { browserName: 'firefox' },
    },
  ],
};

export default config;
```

### 2. Exemples de Tests

```typescript
// scraping.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Scraping Flow', () => {
  test('should complete full scraping cycle', async ({ page, request }) => {
    // 1. Create job
    const jobResponse = await request.post('/api/v1/scraping/jobs', {
      data: {
        source: 'test.com',
        query: 'test product',
        pageCount: 1
      }
    });
    expect(jobResponse.ok()).toBeTruthy();
    const { id: jobId } = await jobResponse.json();

    // 2. Monitor job progress
    await page.goto(`/jobs/${jobId}`);
    await expect(page.locator('[data-testid="job-status"]'))
      .toHaveText('completed', { timeout: 30000 });

    // 3. Verify results
    const resultsResponse = await request.get(`/api/v1/scraping/jobs/${jobId}/results`);
    const results = await resultsResponse.json();
    expect(results.items.length).toBeGreaterThan(0);
  });
});
```

## Tests de Performance

### 1. Configuration

```typescript
// k6.config.js
export default {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

### 2. Exemples de Tests

```typescript
// scraping-load.test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  const payload = JSON.stringify({
    source: 'test.com',
    query: 'performance test',
    pageCount: 1
  });

  const res = http.post('http://localhost:3000/api/v1/scraping/jobs', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

## Mocking et Fixtures

### 1. Mocks

```typescript
// test/mocks/ScraperStrategy.ts
export class MockScraperStrategy implements ScrapeStrategy {
  async execute(job: ScrapingJob): Promise<ScrapedData> {
    return {
      items: [
        {
          title: 'Test Item 1',
          price: '9.99',
          url: 'https://test.com/item1'
        },
        {
          title: 'Test Item 2',
          price: '19.99',
          url: 'https://test.com/item2'
        }
      ],
      metadata: {
        source: job.source,
        timestamp: new Date().toISOString(),
        pageCount: 1
      }
    };
  }
}
```

### 2. Fixtures

```typescript
// test/fixtures/jobs.ts
export const testJobs = [
  {
    id: '1',
    source: 'ebay.com',
    query: 'vintage cards',
    pageCount: 1,
    config: {
      userAgent: 'Mozilla/5.0...',
      timeout: 5000
    }
  },
  {
    id: '2',
    source: 'amazon.com',
    query: 'books',
    pageCount: 2,
    config: {
      userAgent: 'Mozilla/5.0...',
      timeout: 10000
    }
  }
];
```

## CI/CD

### 1. GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
      redis:
        image: redis:6
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Run linter
        run: pnpm lint
        
      - name: Run unit tests
        run: pnpm test:unit
        
      - name: Run integration tests
        run: pnpm test:integration
        
      - name: Run e2e tests
        run: pnpm test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Bonnes Pratiques

### 1. Organisation des Tests

- Un fichier de test par module
- Tests groupés par fonctionnalité
- Nommage clair et descriptif

### 2. Assertions

- Tests positifs et négatifs
- Vérification des cas limites
- Tests de validation des données

### 3. Mocking

- Mock des dépendances externes
- Simulation des erreurs
- Isolation des tests

### 4. Performance

- Tests de charge réguliers
- Monitoring des métriques
- Optimisation continue 