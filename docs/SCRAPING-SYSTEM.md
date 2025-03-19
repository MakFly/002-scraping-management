# Système de Scraping: Architecture et Fonctionnement

## Vue d'ensemble

Le système de scraping implémenté adopte une approche progressive et modulaire, combinant différentes stratégies pour s'adapter automatiquement aux différents types de sites web. L'architecture est conçue pour optimiser à la fois les performances et la robustesse, en utilisant la stratégie la plus légère possible tout en garantissant des résultats de qualité.

### Caractéristiques principales

- **Approche progressive** : Utilise Cheerio (rapide et léger) par défaut, puis bascule vers Puppeteer si nécessaire
- **Auto-apprentissage** : Mémorise les stratégies les plus efficaces par domaine
- **Gestion asynchrone** : Intégration avec BullMQ pour le traitement des tâches en arrière-plan
- **Typage fort** : Utilisation de TypeScript pour garantir la sécurité du code
- **Extensibilité** : Architecture modulaire permettant l'ajout de nouvelles stratégies
- **Gestion des erreurs** : Système robuste de détection et récupération d'erreurs

## Architecture

Le système de scraping est composé des éléments suivants:

```
src/
├── types/
│   └── Scraper.ts               # Définitions des types et interfaces
├── services/
│   ├── ScraperService.ts        # Service principal orchestrant les stratégies
│   └── scrapers/
│       ├── CheerioStrategy.ts   # Stratégie pour contenu statique
│       ├── PuppeteerStrategy.ts # Stratégie pour contenu dynamique (JavaScript)
│       └── DomainRegistry.ts    # Registre des configurations par domaine
└── workers/
    └── scrapeWorker.ts          # Worker BullMQ pour le traitement asynchrone
```

## Composants détaillés

### 1. Types et Interfaces (`src/types/Scraper.ts`)

Ce module définit l'ensemble des types et interfaces utilisés par le système de scraping:

- `ScraperType` : Énumération des types de scrapers disponibles (CHEERIO, PUPPETEER)
- `ScrapedData` : Structure des données extraites, incluant les métadonnées
- `ScrapedItem` : Structure d'un élément extrait (produit, article, etc.)
- `ScrapeStrategy` : Interface que toutes les stratégies de scraping doivent implémenter
- `ScraperOptions` : Options de configuration des scrapers
- `DomainConfig` : Configuration spécifique à un domaine
- `DomainRegistry` : Interface pour le registre des domaines

### 2. Registre des Domaines (`src/services/scrapers/DomainRegistry.ts`)

Le registre des domaines maintient les configurations spécifiques à chaque site web, incluant:

- Sélecteurs CSS pour extraire les différents éléments
- Informations sur la nécessité de JavaScript
- Stratégie par défaut recommandée

Des configurations par défaut sont fournies pour des sites populaires (Amazon, eBay), et une configuration générique est utilisée pour les sites inconnus.

### 3. Stratégie Cheerio (`src/services/scrapers/CheerioStrategy.ts`)

Cette stratégie utilise la bibliothèque Cheerio pour analyser le HTML statique:

- Avantages: Rapide, légère, consomme peu de ressources
- Limitations: Ne peut pas exécuter JavaScript ou interagir avec la page
- Fonctionnalités:
  - Détection des cas où JavaScript est nécessaire
  - Nettoyage et normalisation des données extraites
  - Construction intelligente des URLs selon les motifs du domaine

### 4. Stratégie Puppeteer (`src/services/scrapers/PuppeteerStrategy.ts`)

Utilise Puppeteer pour une émulation complète de navigateur avec support JavaScript:

- Avantages: Peut extraire du contenu généré dynamiquement, interagir avec la page
- Limitations: Plus lent, consomme plus de ressources
- Fonctionnalités:
  - Optimisations de performance (blocage des ressources non essentielles)
  - Défilement automatique pour charger le contenu lazy-loaded
  - Réutilisation des instances de navigateur pour réduire l'overhead
  - Gestion propre des ressources lors de la fermeture

### 5. Service de Scraping (`src/services/ScraperService.ts`)

Le coordinateur central qui orchestre les différentes stratégies:

- Sélectionne la stratégie optimale basée sur:
  - Configuration du domaine
  - Expérience passée (cache des stratégies réussies)
- Implémente un mécanisme de fallback:
  - Commence avec Cheerio pour les performances
  - Bascule vers Puppeteer si nécessaire
- Analyse les résultats pour déterminer si JavaScript est requis
- Gère le nettoyage des ressources lors de l'arrêt de l'application

### 6. Worker de Scraping (`src/workers/scrapeWorker.ts`)

Intègre le service de scraping avec BullMQ pour le traitement asynchrone:

- Gère les tâches de scraping en arrière-plan
- Limite la concurrence pour éviter la surcharge
- Implémente la progression des tâches et la journalisation détaillée
- Gère les erreurs et les cas d'échec
- Assure une fermeture gracieuse lors de l'arrêt du serveur

## Flux de travail

1. **Réception d'une tâche de scraping**:
   - Une tâche est ajoutée à la file d'attente BullMQ
   - Le worker détecte la nouvelle tâche et commence le traitement

2. **Sélection de la stratégie**:
   - Le service vérifie le cache pour voir si une stratégie optimale est déjà connue
   - Sinon, il utilise la configuration du domaine pour choisir la stratégie initiale

3. **Exécution de la stratégie initiale (généralement Cheerio)**:
   - Si des résultats satisfaisants sont obtenus, la tâche est terminée
   - Si les résultats sont insuffisants ou si une erreur survient, le système passe à l'étape suivante

4. **Fallback vers Puppeteer** (si nécessaire):
   - Puppeteer est utilisé pour extraire le contenu dynamique
   - La stratégie réussie est mise en cache pour les futures requêtes

5. **Traitement et retour des résultats**:
   - Les données extraites sont structurées et retournées
   - Les informations sur la stratégie utilisée et le temps d'exécution sont incluses

## Configuration et Personnalisation

### Ajout d'un nouveau domaine

Pour ajouter la configuration d'un nouveau site web:

```typescript
domainRegistry.registerDomain({
  domain: 'example.com',
  selectors: {
    container: '.product-list-item',
    title: '.product-title',
    description: '.product-description',
    price: '.product-price',
    url: 'a.product-link',
    image: 'img.product-image',
  },
  requiresJavaScript: false,
  defaultStrategy: ScraperType.CHEERIO,
});
```

### Implémentation d'une nouvelle stratégie

Le système est conçu pour permettre l'ajout de nouvelles stratégies. Pour cela:

1. Créer une classe implémentant l'interface `ScrapeStrategy`
2. Enregistrer la nouvelle stratégie dans le `ScraperService`

## Bonnes pratiques et considérations

### Performance

- Utiliser Cheerio lorsque possible pour économiser des ressources
- Limiter le nombre de workers concurrents
- Mettre en cache les stratégies optimales par domaine

### Éthique et légalité

- Respecter les délais entre les requêtes (rate limiting)
- Suivre les directives du fichier robots.txt
- Ne pas surcharger les serveurs cibles

### Maintenance

- Surveiller régulièrement les configurations des domaines car les sites web changent
- Mettre à jour les sélecteurs CSS lorsque nécessaire
- Vérifier les performances des différentes stratégies

## Problèmes courants et dépannage

### Construction d'URL

Un problème fréquent est la construction incorrecte des URLs, notamment:

- **Domaines incomplets**: S'assurer que les domaines spécifiés incluent leur TLD (`.com`, `.fr`, etc.)
- **Solution**: Le système corrige automatiquement certains domaines connus (par exemple, `ebay` est automatiquement converti en `ebay.fr`)

### Détection des sélecteurs

Les sites mettent régulièrement à jour leur structure HTML, ce qui peut rendre les sélecteurs obsolètes:

- **Symptôme**: Aucun résultat retourné malgré une exécution sans erreur
- **Solution**: Mettre à jour les sélecteurs dans le registre des domaines

### Limites de taux (Rate limiting)

Certains sites peuvent bloquer les requêtes trop fréquentes:

- **Symptôme**: Erreurs 429 (Too Many Requests) ou pages vides
- **Solution**: Augmenter les délais entre les requêtes et implémenter une rotation des adresses IP si nécessaire

## Fonctionnalités avancées

### Pagination et scraping multi-pages

Le système prend en charge le scraping de plusieurs pages, ce qui est essentiel pour les sites de e-commerce et les moteurs de recherche :

- **Configuration du nombre de pages** : Paramètre `pageCount` optionnel dans le job de scraping
- **Adaptation automatique** : Si `pageCount` n'est pas spécifié, seule la première page est scrapée
- **Détection de fin de résultats** : Arrêt automatique lorsqu'il n'y a plus de bouton "Suivant"
- **Construction d'URL intelligente** : Adaptation des paramètres de pagination selon le site (ex: `_pgn` pour eBay, `page` pour Amazon)

### Stratégies d'extraction spécifiques par domaine

Le système propose des extracteurs spécialisés pour certains sites populaires :

#### eBay

L'extracteur spécifique pour eBay gère les particularités du site :
- Extraction précise des URLs de produits, prix et images
- Sélecteurs optimisés pour la structure HTML d'eBay
- Nettoyage et normalisation des prix
- Gestion des images avec attributs multiples (src, data-src, srcset)

#### AutoScout24

L'extracteur pour AutoScout24 est optimisé pour extraire des données de véhicules :
- Gestion des sélecteurs spécifiques pour véhicules (kilomètrage, localisation)
- Utilisation de sélecteurs multiples avec fallbacks pour s'adapter aux différentes versions du site
- Paramètres de scrolling optimisés pour charger tous les résultats
- Support de différents types d'annonceurs (professionnels et particuliers)
- Configuration avancée de délais entre pages pour éviter le blocage

#### Particularités pour AutoScout24

AutoScout24 possède quelques spécificités qui le distinguent des autres sites pris en charge :

1. **Pagination basée sur l'URL** : Contrairement aux autres sites où la pagination est gérée en cliquant sur un bouton "Suivant", pour AutoScout24 le système modifie directement le paramètre `page` dans l'URL. Cela permet une navigation plus fiable entre les pages de résultats.

2. **Query optionnelle** : La requête de recherche est optionnelle. Si aucune requête n'est spécifiée, le système utilise l'URL de recherche par défaut configurée dans le registre des domaines.

3. **Filtrage géographique** : Le système prend en charge les paramètres de localisation (`zip` pour le code postal et `zipr` pour le rayon de recherche).

**Exemple de pagination** :
```typescript
// Création d'un job AutoScout24 avec pagination (10 pages)
await scrapeQueue.add('autoscout24-search', {
  source: 'autoscout24.fr',
  query: 'audi a4',
  pageCount: 10
});
```

Lorsque `pageCount` est supérieur à 1, le système construit automatiquement les URLs de pagination en modifiant le paramètre `page` dans l'URL. Par exemple :
- Page 1 : `https://www.autoscout24.fr/lst?q=audi+a4&page=1`
- Page 2 : `https://www.autoscout24.fr/lst?q=audi+a4&page=2`
- Et ainsi de suite...

Cela fonctionne aussi bien avec les URLs de recherche par défaut qu'avec des requêtes personnalisées et des paramètres de localisation.

### Structure des résultats pour AutoScout24

```json
{
  "title": "Résultats pour audi a4 | AutoScout24",
  "items": [
    {
      "title": "Audi A4 2.0 TDI 150ch S line",
      "price": 19500,
      "url": "https://www.autoscout24.fr/annonces/audi-a4-...",
      "image": "https://prod.pictures.autoscout24.net/...",
      "mileage": 85000,
      "city": "Paris"
    },
    // autres résultats...
  ],
  "metadata": {
    "source": "autoscout24.fr",
    "query": "audi a4",
    "timestamp": "2023-03-19T12:34:56.789Z",
    "scraperUsed": "puppeteer",
    "executionTimeMs": 5678,
    "pagesScraped": 3
  }
}
```

#### Exemples d'utilisation pour AutoScout24

```typescript
// Création d'un job pour AutoScout24 avec une requête spécifique (domaine avec extension)
await scrapeQueue.add('autoscout24-search', {
  source: 'autoscout24.fr',
  query: 'audi a4',
  pageCount: 3
});

// Création d'un job pour AutoScout24 sans requête (utilise l'URL par défaut configurée)
await scrapeQueue.add('autoscout24-search', {
  source: 'autoscout24.fr',
  pageCount: 2
});

// Création d'un job pour AutoScout24 sans extension de domaine (fonctionne aussi)
await scrapeQueue.add('autoscout24-search', {
  source: 'autoscout24',
  pageCount: 2
});

// Création d'un job avec filtrage géographique (code postal et rayon)
await scrapeQueue.add('autoscout24-search', {
  source: 'autoscout24.fr',
  query: 'audi a4',
  zip: '75001',   // Code postal (Paris)
  zipr: '100'     // Rayon de recherche en km
});
```

La particularité d'AutoScout24 est que la requête (query) est optionnelle. Si aucune requête n'est spécifiée, le système utilisera l'URL de recherche par défaut configurée dans le registre des domaines. Cela permet d'utiliser des filtres pré-configurés comme la gamme de prix, le kilométrage maximum, etc.

**Important** : Le système supporte à la fois l'utilisation de `autoscout24` et `autoscout24.fr` comme valeur pour `source`. Dans les deux cas, le scraping sera effectué sur le site français d'AutoScout24.

## Exemples d'utilisation

### Scraping basique d'une seule page

```typescript
// Création d'un job pour eBay
await scrapeQueue.add('ebay-search', {
  source: 'ebay.fr',
  query: 'dracaufeu ED1 psa 10',
});
```

### Scraping multi-pages

```typescript
// Création d'un job pour eBay avec 3 pages
await scrapeQueue.add('ebay-search', {
  source: 'ebay.fr',
  query: 'dracaufeu ED1 psa 10',
  pageCount: 3
});
```

### Structure des résultats pour eBay

```json
{
  "title": "Résultats pour dracaufeu ED1 psa 10 | eBay",
  "items": [
    {
      "title": "Carte Pokémon Dracaufeu ED1 PSA 10",
      "price": 2500,
      "url": "https://www.ebay.fr/itm/123456789",
      "image": "https://i.ebayimg.com/images/g/AbCdEfGhIjKl/s-l500.jpg"
    },
    // autres résultats...
  ],
  "metadata": {
    "source": "ebay.fr",
    "query": "dracaufeu ED1 psa 10",
    "timestamp": "2023-03-19T12:34:56.789Z",
    "scraperUsed": "cheerio",
    "executionTimeMs": 1234,
    "pagesScraped": 1
  }
}
```

## Conclusion

Le système de scraping implémenté offre une solution robuste, performante et adaptable pour l'extraction de données web. L'approche progressive combinée à l'auto-apprentissage permet d'optimiser les ressources tout en maximisant la qualité des résultats. 