# Changelog

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Support initial pour le scraping avec Cheerio
- Support initial pour le scraping avec Puppeteer
- Système de file d'attente avec BullMQ
- API REST avec Hono.js
- Interface utilisateur avec React et TailwindCSS
- Monitoring en temps réel avec Socket.IO
- Documentation complète du projet

### Changed
- Amélioration de la gestion des erreurs
- Optimisation des performances de scraping
- Refactoring de l'architecture pour plus de modularité

### Fixed
- Correction des fuites de mémoire dans les workers
- Résolution des problèmes de concurrence
- Amélioration de la stabilité du système de file d'attente

## [1.0.0] - 2024-03-20

### Added
- Architecture de base du système de scraping
- Configuration initiale du projet
- Mise en place de l'environnement de développement
- Structure de base de la documentation

### Security
- Mise en place des headers de sécurité
- Implémentation du rate limiting
- Configuration de l'authentification JWT

## [0.2.0] - 2024-03-15

### Added
- Support pour les proxies
- Rotation des User-Agents
- Système de cache Redis
- Validation des entrées avec Zod

### Changed
- Amélioration de la gestion des sessions
- Optimisation des requêtes HTTP
- Refactoring des services de scraping

### Fixed
- Correction des timeouts de connexion
- Résolution des problèmes de parsing HTML
- Amélioration de la gestion des erreurs réseau

## [0.1.0] - 2024-03-10

### Added
- Configuration initiale du projet
- Structure de base des dossiers
- Mise en place de TypeScript
- Configuration ESLint et Prettier
- Tests unitaires de base
- Documentation initiale

### Security
- Configuration de base de la sécurité
- Validation des entrées utilisateur
- Gestion basique des erreurs

## Types de Changements

- `Added` pour les nouvelles fonctionnalités.
- `Changed` pour les changements aux fonctionnalités existantes.
- `Deprecated` pour les fonctionnalités bientôt supprimées.
- `Removed` pour les fonctionnalités supprimées.
- `Fixed` pour les corrections de bugs.
- `Security` pour les corrections de vulnérabilités.

## Convention de Versioning

Nous utilisons [SemVer](http://semver.org/) pour le versioning. Pour les versions disponibles, voir les [tags sur ce repository](https://github.com/votre-repo/tags).

- Version Majeure (X.0.0) : Changements incompatibles avec les versions précédentes
- Version Mineure (0.X.0) : Ajout de fonctionnalités rétrocompatibles
- Version de Correctif (0.0.X) : Corrections de bugs rétrocompatibles

## Format des Messages de Commit

```
<type>(<scope>): <description>

[corps]

[footer]
```

### Types

- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatage
- `refactor`: Refactoring
- `test`: Tests
- `chore`: Maintenance

### Exemples

```
feat(scraping): ajouter le support de Puppeteer

- Implémentation du service de scraping Puppeteer
- Ajout des tests d'intégration
- Documentation de l'API

Closes #123
```

```
fix(queue): corriger le timeout des jobs

- Augmentation du délai de timeout
- Ajout de la gestion des erreurs
- Logging amélioré

Fixes #456
```

## Notes de Version

### Version 1.0.0

Cette version marque la première release stable du système de scraping. Elle inclut :

- Architecture modulaire complète
- Support multi-stratégies de scraping
- Système de file d'attente robuste
- Monitoring en temps réel
- Documentation complète
- Tests exhaustifs

### Version 0.2.0

Version bêta avec les fonctionnalités principales :

- Support basique du scraping
- Gestion des proxies
- Système de cache
- Interface utilisateur minimale

### Version 0.1.0

Version alpha initiale :

- Structure de base
- Configuration du projet
- Tests unitaires
- Documentation initiale 