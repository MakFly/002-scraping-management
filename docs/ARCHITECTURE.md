# Architecture du Projet

*[English version below](#project-architecture)*

## Vue d'ensemble

L'architecture du projet repose sur plusieurs composants clés qui travaillent ensemble pour fournir un service de scraping web robuste et évolutif :

1. **Serveur API (Hono.js)** : Gère les requêtes HTTP et expose les endpoints API
2. **File d'attente (BullMQ)** : Gère les tâches de scraping de manière asynchrone
3. **Workers** : Exécutent les tâches de scraping en arrière-plan
4. **Interface d'administration** : Surveille et gère les files d'attente et les tâches

## Composants

### Serveur API (Hono.js)

Le serveur API est construit avec [Hono.js](https://hono.dev/), un framework web léger et rapide pour Node.js. Il expose les endpoints API et gère les requêtes des utilisateurs.

Principales caractéristiques :
- Routage simple et performant
- Middlewares pour la validation, le CORS, et la journalisation
- Support de Swagger pour la documentation API
- Traitement des erreurs centralisé

### File d'attente (BullMQ)

[BullMQ](https://github.com/taskforca/bullmq) est utilisé pour gérer les tâches de scraping de manière asynchrone. Chaque tâche de scraping est ajoutée à une file d'attente et traitée par des workers.

Principales caractéristiques :
- Persistance des tâches dans Redis
- Nouvelles tentatives automatiques en cas d'échec
- Gestion des priorités
- Support pour les tâches programmées
- Événements pour suivre l'état des tâches

### Workers

Les workers sont responsables de l'exécution des tâches de scraping. Ils s'abonnent à la file d'attente et exécutent les tâches lorsqu'elles sont disponibles.

Principales caractéristiques :
- Exécution concurrente des tâches
- Gestion des erreurs et nouvelles tentatives
- Mise à jour de la progression des tâches
- Journalisation détaillée

### Interface d'administration (Bull Board)

[Bull Board](https://github.com/felixmosh/bull-board) fournit une interface utilisateur pour surveiller et gérer les files d'attente et les tâches.

Principales caractéristiques :
- Visualisation des tâches en attente, en cours, terminées et échouées
- Détails des tâches et de leurs logs
- Possibilité de mettre en pause/reprendre les files d'attente
- Suppression et re-traitement des tâches

## Flux de données

1. **Soumission de tâche** : L'utilisateur soumet une tâche de scraping via l'API
2. **Validation et mise en file d'attente** : L'API valide la requête et ajoute la tâche à la file d'attente
3. **Traitement par le worker** : Un worker prend la tâche de la file d'attente et l'exécute
4. **Mise à jour de l'état** : Le worker met à jour l'état et la progression de la tâche
5. **Completion** : Une fois terminée, la tâche est marquée comme complétée et les résultats sont stockés

## Diagramme d'architecture

```
┌─────────────┐      ┌───────────────┐      ┌───────────────┐
│             │      │               │      │               │
│  Client     │───→  │  Hono.js API  │───→  │  BullMQ Queue │
│             │  ↑   │               │      │               │
└─────────────┘  │   └───────────────┘      └───────┬───────┘
                 │                                  │
                 │                                  ↓
                 │                          ┌───────────────┐
                 │                          │               │
                 └──────────────────────────│  BullMQ Worker│
                                            │               │
                                            └───────────────┘
```

## Considérations de performance

- **Scalabilité horizontale** : Les workers peuvent être démarrés sur plusieurs machines
- **Limitation du taux de requêtes** : Protection contre les abus de l'API
- **Concurrence configurable** : Contrôle du nombre de tâches traitées simultanément
- **Timeouts** : Prévention des tâches bloquées

## Considérations de sécurité

- **Validation des entrées** : Toutes les entrées utilisateur sont validées avec Zod
- **Limitation du taux de requêtes** : Protection contre les attaques DDoS
- **Vérification des tâches en double** : Prévention des attaques par déni de service
- **Logging sécurisé** : Les informations sensibles sont masquées dans les logs

---

# Project Architecture

## Overview

The project architecture is based on several key components working together to provide a robust and scalable web scraping service:

1. **API Server (Hono.js)**: Handles HTTP requests and exposes API endpoints
2. **Queue (BullMQ)**: Manages scraping tasks asynchronously
3. **Workers**: Execute scraping tasks in the background
4. **Admin Interface**: Monitors and manages queues and tasks

## Components

### API Server (Hono.js)

The API server is built with [Hono.js](https://hono.dev/), a lightweight and fast web framework for Node.js. It exposes the API endpoints and handles user requests.

Key features:
- Simple and performant routing
- Middlewares for validation, CORS, and logging
- Swagger support for API documentation
- Centralized error handling

### Queue (BullMQ)

[BullMQ](https://github.com/taskforca/bullmq) is used to manage scraping tasks asynchronously. Each scraping task is added to a queue and processed by workers.

Key features:
- Persistence of tasks in Redis
- Automatic retries on failure
- Priority management
- Support for scheduled tasks
- Events to track task status

### Workers

Workers are responsible for executing scraping tasks. They subscribe to the queue and execute tasks when they are available.

Key features:
- Concurrent task execution
- Error handling and retries
- Task progress updates
- Detailed logging

### Admin Interface (Bull Board)

[Bull Board](https://github.com/felixmosh/bull-board) provides a user interface to monitor and manage queues and tasks.

Key features:
- Visualization of waiting, active, completed, and failed tasks
- Task details and logs
- Ability to pause/resume queues
- Delete and reprocess tasks

## Data Flow

1. **Task Submission**: User submits a scraping task via the API
2. **Validation and Queueing**: API validates the request and adds the task to the queue
3. **Worker Processing**: A worker picks up the task from the queue and executes it
4. **Status Updates**: The worker updates the task status and progress
5. **Completion**: Once finished, the task is marked as completed and results are stored

## Architecture Diagram

```
┌─────────────┐      ┌───────────────┐      ┌───────────────┐
│             │      │               │      │               │
│  Client     │───→  │  Hono.js API  │───→  │  BullMQ Queue │
│             │  ↑   │               │      │               │
└─────────────┘  │   └───────────────┘      └───────┬───────┘
                 │                                  │
                 │                                  ↓
                 │                          ┌───────────────┐
                 │                          │               │
                 └──────────────────────────│  BullMQ Worker│
                                            │               │
                                            └───────────────┘
```

## Performance Considerations

- **Horizontal Scalability**: Workers can be started on multiple machines
- **Rate Limiting**: Protection against API abuse
- **Configurable Concurrency**: Control of how many tasks are processed simultaneously
- **Timeouts**: Prevention of stuck tasks

## Security Considerations

- **Input Validation**: All user inputs are validated with Zod
- **Rate Limiting**: Protection against DDoS attacks
- **Duplicate Task Checking**: Prevention of denial of service attacks
- **Secure Logging**: Sensitive information is masked in logs 