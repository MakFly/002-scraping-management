# Vue d'ensemble du projet

## Français

Ce projet est une API de scraping robuste et évolutive construite avec Hono.js, BullMQ et Prisma. Il permet de lancer et gérer des tâches de scraping sur différentes sources web (comme Leboncoin, Autoscout24, eBay) de manière asynchrone, avec suivi en temps réel des progrès et des résultats via WebSockets et Server-Sent Events (SSE).

### Objectifs du projet

- Fournir une plateforme unifiée pour extraire des données de différentes sources web
- Permettre un traitement asynchrone et parallèle des tâches de scraping
- Offrir des mécanismes de suivi en temps réel de l'état des tâches
- Implémenter des stratégies de scraping adaptatives selon les caractéristiques des sites cibles
- Proposer une API RESTful simple et bien documentée
- Assurer la robustesse face aux changements des sites cibles

### Cas d'utilisation

- Collecte de données pour analyse de marché
- Surveillance des prix sur différentes plateformes
- Agrégation de contenus provenant de multiples sources
- Extraction de données structurées à partir de sites web
- Automatisation de la collecte de données pour des applications tierces

### Technologies clés

- **Backend**: Node.js avec TypeScript
- **Framework API**: Hono.js
- **Base de données**: PostgreSQL avec Prisma ORM
- **File d'attente**: BullMQ avec Redis
- **Scraping**: Cheerio et Puppeteer
- **Communication en temps réel**: Socket.IO et SSE
- **Documentation API**: OpenAPI/Swagger
- **Conteneurisation**: Docker et Docker Compose

---

## English

This project is a robust and scalable scraping API built with Hono.js, BullMQ, and Prisma. It enables launching and managing scraping tasks on various web sources (such as Leboncoin, Autoscout24, eBay) asynchronously, with real-time tracking of progress and results via WebSockets and Server-Sent Events (SSE).

### Project Objectives

- Provide a unified platform for extracting data from different web sources
- Enable asynchronous and parallel processing of scraping tasks
- Offer real-time tracking mechanisms for task status
- Implement adaptive scraping strategies based on target site characteristics
- Provide a simple and well-documented RESTful API
- Ensure robustness against changes in target sites

### Use Cases

- Data collection for market analysis
- Price monitoring across different platforms
- Content aggregation from multiple sources
- Structured data extraction from websites
- Automation of data collection for third-party applications

### Key Technologies

- **Backend**: Node.js with TypeScript
- **API Framework**: Hono.js
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ with Redis
- **Scraping**: Cheerio and Puppeteer
- **Real-time Communication**: Socket.IO and SSE
- **API Documentation**: OpenAPI/Swagger
- **Containerization**: Docker and Docker Compose 