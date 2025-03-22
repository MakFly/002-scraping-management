# Guide de Contribution

Ce document décrit les guidelines pour contribuer au projet de système de scraping. Nous apprécions votre intérêt à contribuer et nous nous efforçons de rendre le processus aussi transparent et simple que possible.

## Table des Matières

1. [Code de Conduite](#code-de-conduite)
2. [Processus de Développement](#processus-de-développement)
3. [Structure du Projet](#structure-du-projet)
4. [Guidelines de Code](#guidelines-de-code)
5. [Tests](#tests)
6. [Documentation](#documentation)
7. [Soumission des Changements](#soumission-des-changements)
8. [Revue de Code](#revue-de-code)

## Code de Conduite

### Nos Engagements

- Créer un environnement accueillant et respectueux
- Accepter les critiques constructives
- Se concentrer sur ce qui est le mieux pour la communauté
- Faire preuve d'empathie envers les autres membres

### Comportements Inacceptables

- Utilisation de langage ou d'images à caractère sexuel
- Trolling, commentaires insultants/désobligeants
- Harcèlement public ou privé
- Publication d'informations privées sans autorisation
- Toute conduite considérée comme inappropriée dans un cadre professionnel

## Processus de Développement

### 1. Workflow Git

```bash
# 1. Fork le repository
# 2. Créer une branche pour votre fonctionnalité
git checkout -b feature/ma-nouvelle-fonctionnalite

# 3. Commiter vos changements
git commit -m "feat: description de la fonctionnalité"

# 4. Pousser vers votre fork
git push origin feature/ma-nouvelle-fonctionnalite

# 5. Créer une Pull Request
```

### 2. Conventions de Commit

Nous suivons les [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Modification de la documentation
- `style:` Changements de formatage
- `refactor:` Refactoring du code
- `test:` Ajout ou modification de tests
- `chore:` Tâches de maintenance

### 3. Branches

- `main`: Production
- `develop`: Développement
- `feature/*`: Nouvelles fonctionnalités
- `fix/*`: Corrections de bugs
- `docs/*`: Documentation
- `release/*`: Préparation des releases

## Structure du Projet

```
src/
├── api/              # Routes et contrôleurs API
├── config/           # Configuration
├── core/             # Logique métier principale
├── models/           # Modèles de données
├── services/         # Services
├── types/            # Types TypeScript
├── utils/            # Utilitaires
└── workers/          # Workers de scraping
```

## Guidelines de Code

### 1. Style de Code

```typescript
// ✅ Bon
interface ScrapingJob {
  id: string;
  url: string;
  status: JobStatus;
  createdAt: Date;
}

class ScraperService {
  private readonly config: ScraperConfig;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  public async scrape(url: string): Promise<ScrapeResult> {
    // Implementation
  }
}

// ❌ À éviter
interface job {
  id: string,
  url: string,
  status: string,
  created_at: Date
}

class scraper {
  config: any;
  constructor(config) {
    this.config = config;
  }
  async scrape(url) {
    // Implementation
  }
}
```

### 2. Principes de Code

- **SOLID**: Suivre les principes SOLID
- **DRY**: Ne pas répéter le code
- **KISS**: Garder le code simple
- **Composition over Inheritance**: Privilégier la composition
- **Single Responsibility**: Une classe = une responsabilité

### 3. Gestion des Erreurs

```typescript
// ✅ Bon
class ScrapingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ScrapingError';
  }
}

// Utilisation
try {
  await scraper.scrape(url);
} catch (error) {
  if (error instanceof ScrapingError) {
    logger.error({
      code: error.code,
      message: error.message,
      details: error.details
    });
  }
  throw error;
}

// ❌ À éviter
try {
  await scraper.scrape(url);
} catch (error) {
  console.error('Error:', error);
  throw error;
}
```

## Tests

### 1. Types de Tests

- **Tests Unitaires**: Pour les composants isolés
- **Tests d'Intégration**: Pour les interactions entre composants
- **Tests E2E**: Pour les scénarios complets
- **Tests de Performance**: Pour les métriques de performance

### 2. Guidelines de Test

```typescript
// ✅ Bon
describe('ScraperService', () => {
  let service: ScraperService;
  let mockConfig: ScraperConfig;

  beforeEach(() => {
    mockConfig = createMockConfig();
    service = new ScraperService(mockConfig);
  });

  it('should scrape content successfully', async () => {
    const url = 'https://example.com';
    const result = await service.scrape(url);
    
    expect(result).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.items).toHaveLength(10);
  });

  it('should handle network errors', async () => {
    const url = 'https://invalid-url.com';
    
    await expect(service.scrape(url)).rejects.toThrow(
      new ScrapingError('Network error', 'NETWORK_ERROR')
    );
  });
});

// ❌ À éviter
test('scraping works', async () => {
  const scraper = new Scraper({});
  const result = await scraper.scrape('url');
  expect(result).toBeTruthy();
});
```

### 3. Couverture de Tests

- Minimum 80% de couverture globale
- 100% pour les composants critiques
- Tests des cas d'erreur obligatoires

## Documentation

### 1. Documentation du Code

```typescript
// ✅ Bon
/**
 * Service gérant le scraping de contenu web.
 * @class ScraperService
 */
class ScraperService {
  /**
   * Scrape le contenu d'une URL donnée.
   * @param {string} url - L'URL à scraper
   * @param {ScrapingOptions} [options] - Options de scraping
   * @returns {Promise<ScrapeResult>} Résultat du scraping
   * @throws {ScrapingError} Si une erreur survient pendant le scraping
   */
  public async scrape(
    url: string,
    options?: ScrapingOptions
  ): Promise<ScrapeResult> {
    // Implementation
  }
}

// ❌ À éviter
class Scraper {
  // Scrape une url
  async scrape(url) {
    // Implementation
  }
}
```

### 2. Documentation API

- Utiliser OpenAPI/Swagger
- Documenter tous les endpoints
- Inclure des exemples de requêtes/réponses
- Décrire les codes d'erreur

### 3. Documentation Technique

- README.md à jour
- Diagrammes d'architecture
- Guides de déploiement
- Troubleshooting

## Soumission des Changements

### 1. Checklist Pull Request

- [ ] Tests passent
- [ ] Couverture de tests maintenue
- [ ] Documentation mise à jour
- [ ] Code formaté
- [ ] Commits conventionnels
- [ ] Changelog mis à jour

### 2. Template Pull Request

```markdown
## Description

[Description des changements]

## Type de Changement

- [ ] 🚀 Nouvelle fonctionnalité
- [ ] 🐛 Correction de bug
- [ ] 📚 Documentation
- [ ] ♻️ Refactoring
- [ ] 🎨 Style
- [ ] ⚡ Performance
- [ ] ✅ Tests

## Tests

- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests manuels

## Documentation

- [ ] Documentation du code
- [ ] Documentation API
- [ ] Documentation technique

## Screenshots (si applicable)

## Notes additionnelles
```

## Revue de Code

### 1. Critères de Revue

- Lisibilité du code
- Respect des conventions
- Couverture de tests
- Performance
- Sécurité
- Documentation

### 2. Process de Revue

1. Vérification automatique (CI)
2. Revue de code par pairs
3. Tests de non-régression
4. Validation finale

### 3. Feedback

- Constructif et respectueux
- Focalisé sur le code, pas la personne
- Suggestions d'amélioration
- Explications claires 