# Documentation du Projet de Scraping

Cette documentation couvre tous les aspects du projet de scraping construit avec Hono.js, BullMQ, et Prisma.

## Contenu

- [Vue d'ensemble du projet](./overview.md)
- [Documentation fonctionnelle](./functional.md)
- [Documentation technique](./technical.md)
- [Documentation API](./api.md)
- [Guide d'installation](./installation.md)
- [Guide d'utilisation](./usage.md)
- [Architecture](./architecture.md)

## Aperçu rapide

Ce projet est une API de scraping robuste et évolutive conçue pour extraire des données de différentes sources web de manière asynchrone, avec suivi en temps réel des progrès via WebSockets et Server-Sent Events (SSE).

### Caractéristiques principales

- **Scraping multi-sources** : Support pour Leboncoin, Autoscout24, eBay, etc.
- **Traitement asynchrone** : Utilisation de BullMQ pour la gestion des tâches
- **Stratégies adaptatives** : Cheerio pour le contenu statique, Puppeteer pour le dynamique
- **Notifications en temps réel** : WebSockets et SSE pour suivre la progression
- **Dashboard intégré** : Interface de gestion des tâches de scraping
- **API RESTful** : Endpoints complets pour la gestion des tâches

## Installation rapide

```bash
# Cloner le dépôt
git clone [repo-url]

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp .env.example .env

# Lancer les services (PostgreSQL, Redis)
docker-compose up -d

# Exécuter les migrations de base de données
npx prisma migrate dev

# Démarrer l'application
pnpm dev
```

Pour plus de détails, consultez le [guide d'installation](./installation.md).

---

*Documentation générée pour le projet de scraping - Version 1.0* 