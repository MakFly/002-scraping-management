# Documentation Fonctionnelle

## Français

### Fonctionnalités Principales

#### 1. Gestion des Tâches de Scraping

- **Création de tâches** : Définition des paramètres de scraping (source, requête, nombre de pages)
- **Exécution de tâches** : Lancement manuel ou automatique des tâches de scraping
- **Suivi de progression** : Monitoring en temps réel de l'avancement du scraping
- **Historique des tâches** : Conservation de l'historique complet des exécutions

#### 2. Sources de Données Supportées

- **Leboncoin** : Extraction via API et structure JSON spécifique
- **Autoscout24** : Support des filtres de recherche (code postal, rayon)
- **eBay** : Extraction de résultats de recherche standard
- **Extensibilité** : Architecture permettant d'ajouter facilement de nouvelles sources

#### 3. Stratégies de Scraping

- **Cheerio (HTML statique)** : Stratégie légère pour les sites sans JavaScript complexe
- **Puppeteer (rendu dynamique)** : Pour les sites nécessitant l'exécution de JavaScript
- **API directes** : Utilisation d'API officielles ou non documentées quand disponible
- **Fallback automatique** : Bascule vers des stratégies plus robustes en cas d'échec

#### 4. Notifications en Temps Réel

- **WebSockets** : Notifications push instantanées des événements de scraping
- **Server-Sent Events (SSE)** : Streaming des logs et progression des tâches
- **Types d'événements** : Création, démarrage, progression, complétion, erreur

#### 5. Interface de Gestion

- **Dashboard** : Interface de suivi des tâches de scraping
- **Documentation API** : Interface Swagger pour explorer et tester l'API
- **Statistiques globales** : Métriques sur les performances et résultats de scraping

### Flux de Travail Utilisateur

#### Création d'une Tâche de Scraping

1. L'utilisateur sélectionne la source de données cible (ex: Leboncoin)
2. Il définit les paramètres de recherche spécifiques à la source
3. Il spécifie le nombre de pages à scraper (avec limitation)
4. La tâche est créée et entre dans l'état "idle"

#### Exécution d'une Tâche

1. La tâche peut être exécutée immédiatement ou mise en file d'attente
2. Le système choisit la stratégie de scraping optimale pour la source
3. La progression est mise à jour en temps réel via WebSocket
4. Les logs d'exécution sont streamés en direct

#### Consultation des Résultats

1. Les résultats partiels sont disponibles pendant l'exécution
2. Les résultats complets sont accessibles après complétion
3. L'historique des tâches permet de revoir les résultats antérieurs
4. Les données sont formatées de manière cohérente entre les sources

#### Gestion des Erreurs

1. Les erreurs sont capturées et enregistrées dans l'historique de la tâche
2. Des tentatives automatiques sont effectuées en cas d'échec temporaire
3. L'utilisateur est notifié en temps réel des erreurs critiques
4. Les tâches en échec peuvent être relancées manuellement

### Limites et Contraintes

- **Taux de requêtes** : Limitations pour éviter la surcharge des sites cibles
- **Nombre de pages** : Maximum 10 pages par tâche pour maîtriser la charge
- **Concurrence** : Maximum 2 tâches simultanées par défaut
- **Rétention** : Conservation des résultats pour une durée limitée
- **Accès API** : Authentification requise pour les opérations sensibles

---

## English

### Main Features

#### 1. Scraping Task Management

- **Task Creation**: Definition of scraping parameters (source, query, page count)
- **Task Execution**: Manual or automatic launch of scraping tasks
- **Progress Tracking**: Real-time monitoring of scraping progress
- **Task History**: Retention of complete execution history

#### 2. Supported Data Sources

- **Leboncoin**: Extraction via API and specific JSON structure
- **Autoscout24**: Support for search filters (zip code, radius)
- **eBay**: Extraction of standard search results
- **Extensibility**: Architecture allowing easy addition of new sources

#### 3. Scraping Strategies

- **Cheerio (static HTML)**: Lightweight strategy for sites without complex JavaScript
- **Puppeteer (dynamic rendering)**: For sites requiring JavaScript execution
- **Direct APIs**: Use of official or undocumented APIs when available
- **Automatic Fallback**: Switch to more robust strategies in case of failure

#### 4. Real-Time Notifications

- **WebSockets**: Instant push notifications of scraping events
- **Server-Sent Events (SSE)**: Streaming of logs and task progress
- **Event Types**: Creation, start, progress, completion, error

#### 5. Management Interface

- **Dashboard**: Interface for monitoring scraping tasks
- **API Documentation**: Swagger interface to explore and test the API
- **Global Statistics**: Metrics on scraping performance and results

### User Workflow

#### Creating a Scraping Task

1. The user selects the target data source (e.g., Leboncoin)
2. They define source-specific search parameters
3. They specify the number of pages to scrape (with limitation)
4. The task is created and enters the "idle" state

#### Executing a Task

1. The task can be executed immediately or queued
2. The system chooses the optimal scraping strategy for the source
3. Progress is updated in real-time via WebSocket
4. Execution logs are streamed live

#### Viewing Results

1. Partial results are available during execution
2. Complete results are accessible after completion
3. Task history allows reviewing previous results
4. Data is formatted consistently across sources

#### Error Handling

1. Errors are captured and recorded in the task history
2. Automatic retries are performed in case of temporary failure
3. The user is notified in real-time of critical errors
4. Failed tasks can be manually restarted

### Limitations and Constraints

- **Request Rate**: Limitations to avoid overloading target sites
- **Page Count**: Maximum 10 pages per task to control load
- **Concurrency**: Maximum 2 simultaneous tasks by default
- **Retention**: Results kept for a limited time
- **API Access**: Authentication required for sensitive operations 