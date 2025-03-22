# Documentation du Système de Scraping

## Introduction

Bienvenue dans la documentation du système de scraping. Ce projet est une solution complète de scraping web basée sur Hono.js et BullMQ, conçue pour être robuste, scalable et facile à maintenir.

## Structure de la Documentation

### 1. Guide de Démarrage
- [README.md](README.md) - Vue d'ensemble et guide d'installation
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture technique détaillée
- [API.md](API.md) - Documentation complète de l'API

### 2. Composants Principaux
- [SCRAPING-SYSTEM.md](SCRAPING-SYSTEM.md) - Système de scraping et stratégies
- [REALTIME_MONITORING.md](REALTIME_MONITORING.md) - Monitoring en temps réel
- [socket-io-integration.md](socket-io-integration.md) - Intégration Socket.IO

### 3. Guides Opérationnels
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guide de déploiement
- [TESTING.md](TESTING.md) - Stratégies de test
- [SWAGGER.md](SWAGGER.md) - Documentation Swagger

## Démarrage Rapide

1. **Installation**
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   pnpm install
   ```

2. **Configuration**
   - Copier `.env.example` vers `.env`
   - Configurer les variables d'environnement

3. **Lancement**
   ```bash
   pnpm dev     # Développement
   pnpm start   # Production
   ```

## Points Clés

- **Architecture Modulaire** : Système conçu en composants indépendants
- **Multi-Stratégies** : Support de Cheerio et Puppeteer
- **Monitoring Temps Réel** : Interface de suivi en direct
- **Scalabilité** : Support du clustering et de la distribution

## Ressources Additionnelles

- [Wiki du Projet](https://github.com/votre-repo/wiki)
- [Changelog](CHANGELOG.md)
- [Guide de Contribution](CONTRIBUTING.md)

---

# Scraping System Documentation

## Introduction

Welcome to the scraping system documentation. This project is a comprehensive web scraping solution based on Hono.js and BullMQ, designed to be robust, scalable, and easy to maintain.

## Documentation Structure

### 1. Getting Started
- [README.md](README.md) - Overview and installation guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed technical architecture
- [API.md](API.md) - Complete API documentation

### 2. Core Components
- [SCRAPING-SYSTEM.md](SCRAPING-SYSTEM.md) - Scraping system and strategies
- [REALTIME_MONITORING.md](REALTIME_MONITORING.md) - Real-time monitoring
- [socket-io-integration.md](socket-io-integration.md) - Socket.IO integration

### 3. Operational Guides
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [TESTING.md](TESTING.md) - Testing strategies
- [SWAGGER.md](SWAGGER.md) - Swagger documentation

## Quick Start

1. **Installation**
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   pnpm install
   ```

2. **Configuration**
   - Copy `.env.example` to `.env`
   - Configure environment variables

3. **Launch**
   ```bash
   pnpm dev     # Development
   pnpm start   # Production
   ```

## Key Features

- **Modular Architecture**: System designed in independent components
- **Multi-Strategy**: Support for Cheerio and Puppeteer
- **Real-time Monitoring**: Live tracking interface
- **Scalability**: Support for clustering and distribution

## Additional Resources

- [Project Wiki](https://github.com/your-repo/wiki)
- [Changelog](CHANGELOG.md)
- [Contributing Guide](CONTRIBUTING.md) 