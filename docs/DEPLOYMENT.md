# Guide de Déploiement

*[English version below](#deployment-guide)*

## Options de déploiement

Ce projet peut être déployé de plusieurs façons, selon vos besoins et votre infrastructure :

1. Déploiement Docker
2. Déploiement manuel
3. Déploiement sur un service cloud

## Prérequis

Quelle que soit la méthode de déploiement, vous aurez besoin de :

- Une instance Redis (accessible depuis l'application)
- Node.js v20 ou supérieur (si déploiement manuel)
- Docker et Docker Compose (si déploiement Docker)

## Déploiement Docker

Le déploiement Docker est la méthode recommandée car elle garantit un environnement cohérent et facilement reproductible.

### Étapes de déploiement

1. Clonez le dépôt :
```bash
git clone <repository-url>
cd <repository-directory>
```

2. Configurez les variables d'environnement dans le fichier `compose.yaml` :
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=
      - LOG_LEVEL=info
      - SCRAPE_TIMEOUT=30000
      - REQUEST_TIMEOUT=5000
    depends_on:
      - redis
  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
```

3. Construisez et démarrez les services :
```bash
docker-compose up -d
```

4. Vérifiez que les services fonctionnent :
```bash
docker-compose ps
```

### Arrêt des services

Pour arrêter les services sans supprimer les données :
```bash
docker-compose stop
```

Pour arrêter les services et supprimer les conteneurs :
```bash
docker-compose down
```

## Déploiement manuel

Le déploiement manuel est utile pour les environnements de développement ou les petites installations.

### Étapes de déploiement

1. Clonez le dépôt :
```bash
git clone <repository-url>
cd <repository-directory>
```

2. Installez les dépendances :
```bash
pnpm install
```

3. Configurez les variables d'environnement dans un fichier `.env` :
```
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
LOG_LEVEL=info
```

4. Compilez le code :
```bash
pnpm build
```

5. Démarrez l'application :
```bash
pnpm start
```

### Utilisation de PM2 (recommandé pour la production)

Pour les déploiements de production, il est recommandé d'utiliser [PM2](https://pm2.keymetrics.io/) pour gérer le processus Node.js :

1. Installez PM2 globalement :
```bash
npm install -g pm2
```

2. Créez un fichier de configuration `ecosystem.config.js` :
```javascript
module.exports = {
  apps : [{
    name: "scraping-api",
    script: "dist/index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      REDIS_HOST: "localhost",
      REDIS_PORT: 6379,
      REDIS_PASSWORD: "",
      LOG_LEVEL: "info"
    }
  }]
}
```

3. Démarrez l'application avec PM2 :
```bash
pm2 start ecosystem.config.js
```

4. Configurez PM2 pour démarrer au boot :
```bash
pm2 startup
pm2 save
```

## Déploiement sur un service cloud

Le projet peut être déployé sur différents services cloud comme AWS, Google Cloud, Azure, ou Heroku.

### Exemple : Déploiement sur Heroku

1. Créez une application Heroku :
```bash
heroku create <app-name>
```

2. Ajoutez l'addon Redis :
```bash
heroku addons:create heroku-redis:hobby-dev
```

3. Déployez l'application :
```bash
git push heroku main
```

4. Vérifiez que l'application fonctionne :
```bash
heroku open
```

## Considérations pour la production

Pour un déploiement en production, assurez-vous de :

1. **Sécuriser Redis** : Utilisez un mot de passe et une connexion TLS si possible
2. **Configurer les logs** : Utilisez un niveau de log approprié (`info` en production)
3. **Mettre en place un proxy inverse** : Utilisez Nginx ou un autre proxy pour gérer les connexions HTTPS
4. **Configurer les limites de ressources** : Ajustez la mémoire et le CPU alloués selon les besoins
5. **Mettre en place une surveillance** : Utilisez des outils comme PM2, Prometheus, ou les services de surveillance du cloud

## Mise à l'échelle

Pour gérer une charge plus importante, vous pouvez :

1. **Ajouter plus de workers** : Augmenter le nombre d'instances de worker pour traiter plus de tâches en parallèle
2. **Mettre à l'échelle horizontalement** : Déployer plusieurs instances de l'API derrière un équilibreur de charge
3. **Optimiser Redis** : Configurer Redis pour de meilleures performances ou utiliser un cluster Redis

---

# Deployment Guide

## Deployment Options

This project can be deployed in several ways, depending on your needs and infrastructure:

1. Docker Deployment
2. Manual Deployment
3. Cloud Service Deployment

## Prerequisites

Regardless of the deployment method, you will need:

- A Redis instance (accessible from the application)
- Node.js v20 or higher (if manual deployment)
- Docker and Docker Compose (if Docker deployment)

## Docker Deployment

Docker deployment is the recommended method as it ensures a consistent and easily reproducible environment.

### Deployment Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-directory>
```

2. Configure environment variables in the `compose.yaml` file:
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=
      - LOG_LEVEL=info
      - SCRAPE_TIMEOUT=30000
      - REQUEST_TIMEOUT=5000
    depends_on:
      - redis
  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
```

3. Build and start the services:
```bash
docker-compose up -d
```

4. Verify the services are running:
```bash
docker-compose ps
```

### Stopping Services

To stop services without removing data:
```bash
docker-compose stop
```

To stop services and remove containers:
```bash
docker-compose down
```

## Manual Deployment

Manual deployment is useful for development environments or small installations.

### Deployment Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-directory>
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables in a `.env` file:
```
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
LOG_LEVEL=info
```

4. Build the code:
```bash
pnpm build
```

5. Start the application:
```bash
pnpm start
```

### Using PM2 (recommended for production)

For production deployments, it is recommended to use [PM2](https://pm2.keymetrics.io/) to manage the Node.js process:

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Create a configuration file `ecosystem.config.js`:
```javascript
module.exports = {
  apps : [{
    name: "scraping-api",
    script: "dist/index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      REDIS_HOST: "localhost",
      REDIS_PORT: 6379,
      REDIS_PASSWORD: "",
      LOG_LEVEL: "info"
    }
  }]
}
```

3. Start the application with PM2:
```bash
pm2 start ecosystem.config.js
```

4. Configure PM2 to start on boot:
```bash
pm2 startup
pm2 save
```

## Cloud Service Deployment

The project can be deployed on various cloud services such as AWS, Google Cloud, Azure, or Heroku.

### Example: Deploying on Heroku

1. Create a Heroku application:
```bash
heroku create <app-name>
```

2. Add the Redis addon:
```bash
heroku addons:create heroku-redis:hobby-dev
```

3. Deploy the application:
```bash
git push heroku main
```

4. Verify the application is running:
```bash
heroku open
```

## Production Considerations

For a production deployment, make sure to:

1. **Secure Redis**: Use a password and TLS connection if possible
2. **Configure Logging**: Use an appropriate log level (`info` in production)
3. **Set Up a Reverse Proxy**: Use Nginx or another proxy to handle HTTPS connections
4. **Configure Resource Limits**: Adjust memory and CPU allocation as needed
5. **Set Up Monitoring**: Use tools like PM2, Prometheus, or cloud monitoring services

## Scaling

To handle higher loads, you can:

1. **Add More Workers**: Increase the number of worker instances to process more tasks in parallel
2. **Scale Horizontally**: Deploy multiple instances of the API behind a load balancer
3. **Optimize Redis**: Configure Redis for better performance or use a Redis cluster 