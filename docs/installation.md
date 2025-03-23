# Guide d'Installation

## Français

Ce guide détaille les étapes nécessaires pour installer et configurer le projet de scraping dans différents environnements.

### Prérequis

- Node.js 20.x ou supérieur
- PNPM 10.x ou supérieur
- Docker et Docker Compose (pour l'installation conteneurisée)
- PostgreSQL 15.x (si installé localement)
- Redis 6.x (si installé localement)

### Installation avec Docker (Recommandée)

1. **Cloner le dépôt**

```bash
git clone [url-du-repo]
cd frontend-scraping
```

2. **Configurer les variables d'environnement**

```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos paramètres.

3. **Lancer les services avec Docker Compose**

```bash
docker-compose up -d
```

Cette commande démarrera:
- PostgreSQL (base de données)
- Redis (file d'attente et cache)
- Adminer (interface d'administration de BDD, accessible sur http://localhost:8080)
- Dozzle (visualiseur de logs, accessible sur http://localhost:8888)

4. **Exécuter les migrations de base de données**

```bash
docker-compose exec app npx prisma migrate deploy
```

5. **Accéder à l'application**

L'API sera accessible à l'adresse: http://localhost:3000
La documentation de l'API: http://localhost:3000/docs
Le dashboard BullMQ: http://localhost:3000/bull-board

### Installation Locale (Développement)

1. **Cloner le dépôt**

```bash
git clone [url-du-repo]
cd frontend-scraping
```

2. **Installer les dépendances**

```bash
pnpm install
```

3. **Configurer les variables d'environnement**

```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos paramètres:

```env
# Serveur
PORT=3000
NODE_ENV=development

# Base de données
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scraping?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Scraping
SCRAPE_TIMEOUT=30000
REQUEST_TIMEOUT=5000
MAX_PAGES=10

# Logs
LOG_LEVEL=debug

# CORS
FRONTEND_URL=http://localhost:5173
```

4. **Lancer PostgreSQL et Redis**

Vous pouvez les lancer via Docker:

```bash
docker-compose up -d redis postgres
```

5. **Exécuter les migrations de base de données**

```bash
npx prisma migrate dev
```

6. **Démarrer l'application en mode développement**

```bash
pnpm dev
```

7. **Accéder à l'application**

L'API sera accessible à l'adresse: http://localhost:3000
La documentation de l'API: http://localhost:3000/docs
Le dashboard BullMQ: http://localhost:3000/bull-board

### Déploiement en Production

1. **Construire l'application**

```bash
pnpm build
```

2. **Configurer les variables d'environnement pour la production**

```env
NODE_ENV=production
# Autres variables spécifiques à la production
```

3. **Démarrer l'application**

```bash
pnpm start
```

Pour un déploiement robuste en production, considérez l'utilisation de PM2 ou d'un service géré comme AWS ECS, Google Cloud Run, ou Kubernetes.

### Configuration des Workers

Pour un environnement de production, vous pouvez configurer plusieurs workers pour traiter les tâches en parallèle:

1. **Configurer le nombre de workers dans .env**

```env
WORKER_CONCURRENCY=2
MAX_JOBS_PER_WORKER=5
```

2. **Lancer des workers dédiés**

```bash
# Dans des terminaux séparés ou en utilisant PM2
node dist/workers/scrapeWorker.js
```

### Dépannage

#### Problèmes courants

1. **Erreur de connexion à la base de données**
   - Vérifiez que PostgreSQL est en cours d'exécution
   - Vérifiez les informations de connexion dans le fichier `.env`
   - Assurez-vous que la base de données existe

2. **Erreur de connexion Redis**
   - Vérifiez que Redis est en cours d'exécution
   - Vérifiez les informations de connexion dans le fichier `.env`

3. **Erreurs de scraping**
   - Vérifiez les paramètres `SCRAPE_TIMEOUT` et `REQUEST_TIMEOUT`
   - Inspectez les logs pour identifier les problèmes spécifiques au site cible

4. **Performance lente**
   - Augmentez `WORKER_CONCURRENCY` pour traiter plus de jobs en parallèle
   - Ajustez les limites de ressources dans Docker Compose si nécessaire

Pour une assistance supplémentaire, consultez les logs de l'application ou ouvrez une issue sur le dépôt.

---

## English

This guide details the steps needed to install and configure the scraping project in different environments.

### Prerequisites

- Node.js 20.x or higher
- PNPM 10.x or higher
- Docker and Docker Compose (for containerized installation)
- PostgreSQL 15.x (if installed locally)
- Redis 6.x (if installed locally)

### Installation with Docker (Recommended)

1. **Clone the repository**

```bash
git clone [repo-url]
cd frontend-scraping
```

2. **Configure environment variables**

```bash
cp .env.example .env
```

Edit the `.env` file with your settings.

3. **Launch services with Docker Compose**

```bash
docker-compose up -d
```

This command will start:
- PostgreSQL (database)
- Redis (queue and cache)
- Adminer (database admin interface, accessible at http://localhost:8080)
- Dozzle (log viewer, accessible at http://localhost:8888)

4. **Run database migrations**

```bash
docker-compose exec app npx prisma migrate deploy
```

5. **Access the application**

The API will be accessible at: http://localhost:3000
API documentation: http://localhost:3000/docs
BullMQ dashboard: http://localhost:3000/bull-board

### Local Installation (Development)

1. **Clone the repository**

```bash
git clone [repo-url]
cd frontend-scraping
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit the `.env` file with your settings:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scraping?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Scraping
SCRAPE_TIMEOUT=30000
REQUEST_TIMEOUT=5000
MAX_PAGES=10

# Logs
LOG_LEVEL=debug

# CORS
FRONTEND_URL=http://localhost:5173
```

4. **Start PostgreSQL and Redis**

You can launch them via Docker:

```bash
docker-compose up -d redis postgres
```

5. **Run database migrations**

```bash
npx prisma migrate dev
```

6. **Start the application in development mode**

```bash
pnpm dev
```

7. **Access the application**

The API will be accessible at: http://localhost:3000
API documentation: http://localhost:3000/docs
BullMQ dashboard: http://localhost:3000/bull-board

### Production Deployment

1. **Build the application**

```bash
pnpm build
```

2. **Configure environment variables for production**

```env
NODE_ENV=production
# Other production-specific variables
```

3. **Start the application**

```bash
pnpm start
```

For robust production deployment, consider using PM2 or a managed service like AWS ECS, Google Cloud Run, or Kubernetes.

### Worker Configuration

For a production environment, you can configure multiple workers to process tasks in parallel:

1. **Configure the number of workers in .env**

```env
WORKER_CONCURRENCY=2
MAX_JOBS_PER_WORKER=5
```

2. **Launch dedicated workers**

```bash
# In separate terminals or using PM2
node dist/workers/scrapeWorker.js
```

### Troubleshooting

#### Common Issues

1. **Database connection error**
   - Check that PostgreSQL is running
   - Verify connection information in the `.env` file
   - Make sure the database exists

2. **Redis connection error**
   - Check that Redis is running
   - Verify connection information in the `.env` file

3. **Scraping errors**
   - Check the `SCRAPE_TIMEOUT` and `REQUEST_TIMEOUT` parameters
   - Inspect logs to identify issues specific to the target site

4. **Slow performance**
   - Increase `WORKER_CONCURRENCY` to process more jobs in parallel
   - Adjust resource limits in Docker Compose if necessary

For additional assistance, check the application logs or open an issue on the repository. 