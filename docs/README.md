# Documentation du projet de scraping

*[English version below](#web-scraping-project-documentation)*

## Aperçu du projet

Ce projet est une API de scraping basée sur Hono.js et BullMQ. Il permet de gérer et d'exécuter des tâches de scraping web de manière asynchrone et distribuée.

## Table des matières

- [Installation](#installation)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Utilisation](#utilisation)
- [Déploiement](#déploiement)
- [Développement](#développement)

## Installation

### Prérequis

- Node.js v20 ou supérieur
- Redis (pour BullMQ)
- pnpm v10.6.2 (gestionnaire de paquets)

### Installation des dépendances

```bash
# Cloner le dépôt
git clone <repository-url>
cd <repository-directory>

# Installer les dépendances
pnpm install
```

## Configuration

Le projet utilise les variables d'environnement pour sa configuration. Vous pouvez les définir dans un fichier `.env` à la racine du projet :

```
# Configuration du serveur
PORT=3000

# Configuration Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Configuration des logs
LOG_LEVEL=info
```

## Architecture

Le projet suit une architecture modulaire avec les composants suivants :

- **Server**: Configuration du serveur Hono.js et des middlewares
- **Routes**: Définition des endpoints API
- **Queues**: Gestion des files d'attente pour les tâches de scraping
- **Workers**: Exécution des tâches de scraping
- **Config**: Configuration du système
- **Middleware**: Middlewares pour le serveur Hono.js

### Structure des dossiers

```
src/
  ├── config/       # Configuration du projet
  ├── middleware/   # Middlewares Hono.js
  ├── queues/       # Files d'attente BullMQ
  ├── routes/       # Routes API
  ├── server/       # Configuration du serveur
  ├── workers/      # Workers BullMQ
  └── index.ts      # Point d'entrée de l'application
```

## API Endpoints

### Endpoint principal

- `POST /api/scrape`: Soumet une tâche de scraping
  - Corps de la requête :
    ```json
    {
      "source": "string",
      "query": "string",
      "pageCount": 1
    }
    ```

### Endpoints utilitaires

- `GET /`: Message de bienvenue
- `GET /health`: Vérifie l'état de l'API
- `GET /swagger`: Interface Swagger pour explorer l'API
- `GET /ui`: Interface Bull Board pour surveiller les files d'attente

## Utilisation

### Démarrer le serveur en développement

```bash
pnpm dev
```

### Construire le projet

```bash
pnpm build
```

### Démarrer le serveur en production

```bash
pnpm start
```

## Déploiement

### Utilisation de Docker

Le projet inclut un Dockerfile et un fichier compose.yaml pour faciliter le déploiement avec Docker :

```bash
# Construire et démarrer les services
docker-compose up -d

# Arrêter les services
docker-compose down
```

## Développement

### Linting et Formatage

```bash
# Linting
pnpm lint

# Formatage
pnpm format
```

### Tests

```bash
# Exécuter les tests
pnpm test
```

---

# Web Scraping Project Documentation

## Project Overview

This project is a scraping API based on Hono.js and BullMQ. It allows managing and executing web scraping tasks asynchronously and in a distributed manner.

## Table of Contents

- [Installation](#installation-1)
- [Configuration](#configuration-1)
- [Architecture](#architecture-1)
- [API Endpoints](#api-endpoints-1)
- [Usage](#usage)
- [Deployment](#deployment)
- [Development](#development)

## Installation

### Prerequisites

- Node.js v20 or higher
- Redis (for BullMQ)
- pnpm v10.6.2 (package manager)

### Installing Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd <repository-directory>

# Install dependencies
pnpm install
```

## Configuration

The project uses environment variables for its configuration. You can define them in a `.env` file at the root of the project:

```
# Server configuration
PORT=3000

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Logs configuration
LOG_LEVEL=info
```

## Architecture

The project follows a modular architecture with the following components:

- **Server**: Hono.js server and middleware configuration
- **Routes**: Definition of API endpoints
- **Queues**: Management of queues for scraping tasks
- **Workers**: Execution of scraping tasks
- **Config**: System configuration
- **Middleware**: Middlewares for the Hono.js server

### Folder Structure

```
src/
  ├── config/       # Project configuration
  ├── middleware/   # Hono.js middlewares
  ├── queues/       # BullMQ queues
  ├── routes/       # API routes
  ├── server/       # Server configuration
  ├── workers/      # BullMQ workers
  └── index.ts      # Application entry point
```

## API Endpoints

### Main Endpoint

- `POST /api/scrape`: Submits a scraping task
  - Request body:
    ```json
    {
      "source": "string",
      "query": "string",
      "pageCount": 1
    }
    ```

### Utility Endpoints

- `GET /`: Welcome message
- `GET /health`: Checks API status
- `GET /swagger`: Swagger UI for API exploration
- `GET /ui`: Bull Board UI for monitoring queues

## Usage

### Start the Development Server

```bash
pnpm dev
```

### Build the Project

```bash
pnpm build
```

### Start the Production Server

```bash
pnpm start
```

## Deployment

### Using Docker

The project includes a Dockerfile and a compose.yaml file to facilitate deployment with Docker:

```bash
# Build and start services
docker-compose up -d

# Stop services
docker-compose down
```

## Development

### Linting and Formatting

```bash
# Linting
pnpm lint

# Formatting
pnpm format
```

### Tests

```bash
# Run tests
pnpm test
``` 