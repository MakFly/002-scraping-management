# Politique de Sécurité

Ce document décrit les politiques de sécurité du système de scraping, incluant la gestion des vulnérabilités, les bonnes pratiques, et les procédures de reporting.

## Table des Matières

1. [Signalement des Vulnérabilités](#signalement-des-vulnérabilités)
2. [Politique de Divulgation](#politique-de-divulgation)
3. [Mesures de Sécurité](#mesures-de-sécurité)
4. [Authentification et Autorisation](#authentification-et-autorisation)
5. [Protection des Données](#protection-des-données)
6. [Sécurité du Scraping](#sécurité-du-scraping)
7. [Audit et Logging](#audit-et-logging)
8. [Mises à Jour de Sécurité](#mises-à-jour-de-sécurité)

## Signalement des Vulnérabilités

### Process de Signalement

1. **Ne pas divulguer publiquement** la vulnérabilité
2. Envoyer un email à security@example.com avec :
   - Description détaillée
   - Étapes de reproduction
   - Impact potentiel
   - Suggestions de correction (optionnel)

### Délais de Réponse

- Accusé de réception : 24h
- Évaluation initiale : 72h
- Plan d'action : 1 semaine
- Correction : selon la gravité

## Politique de Divulgation

### Classification des Vulnérabilités

| Niveau | Description | Délai de Correction |
|--------|-------------|-------------------|
| Critique | RCE, Injection SQL, etc. | 24h |
| Haute | XSS, CSRF, etc. | 72h |
| Moyenne | Expositions d'informations | 1 semaine |
| Basse | Améliorations mineures | 2 semaines |

### Process de Divulgation

1. Confirmation de la vulnérabilité
2. Développement du correctif
3. Tests de sécurité
4. Déploiement du correctif
5. Notification aux utilisateurs
6. Publication du rapport

## Mesures de Sécurité

### 1. Headers de Sécurité

```typescript
// src/middleware/security.ts
export const securityHeaders = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

export const applySecurityHeaders = (ctx: Context) => {
  Object.entries(securityHeaders).forEach(([header, value]) => {
    ctx.res.headers.set(header, value);
  });
};
```

### 2. Rate Limiting

```typescript
// src/middleware/rateLimit.ts
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  statusCode: number;
}

export class RateLimiter {
  private storage: Map<string, number[]> = new Map();
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  public check(ip: string): boolean {
    const now = Date.now();
    const timestamps = this.storage.get(ip) || [];
    
    // Nettoyer les anciennes entrées
    const validTimestamps = timestamps.filter(
      time => now - time < this.config.windowMs
    );
    
    if (validTimestamps.length >= this.config.max) {
      return false;
    }
    
    validTimestamps.push(now);
    this.storage.set(ip, validTimestamps);
    return true;
  }
}
```

### 3. Validation des Entrées

```typescript
// src/validation/scraping.ts
import { z } from 'zod';

export const scrapingJobSchema = z.object({
  url: z.string().url(),
  selector: z.string().min(1),
  maxDepth: z.number().int().min(1).max(10),
  timeout: z.number().int().min(1000).max(30000),
  headers: z.record(z.string()).optional(),
  cookies: z.record(z.string()).optional()
});

export const validateScrapingJob = (data: unknown) => {
  return scrapingJobSchema.parse(data);
};
```

## Authentification et Autorisation

### 1. JWT Configuration

```typescript
// src/auth/jwt.ts
import { sign, verify } from 'jsonwebtoken';

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  algorithm: 'HS256' | 'RS256';
}

export class JWTService {
  constructor(private readonly config: JWTConfig) {}

  public generateToken(payload: object): string {
    return sign(payload, this.config.secret, {
      expiresIn: this.config.expiresIn,
      algorithm: this.config.algorithm
    });
  }

  public verifyToken(token: string): any {
    try {
      return verify(token, this.config.secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
```

### 2. Middleware d'Authentification

```typescript
// src/middleware/auth.ts
export const authMiddleware = async (ctx: Context, next: Next) => {
  const token = ctx.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const payload = jwtService.verifyToken(token);
    ctx.state.user = payload;
    await next();
  } catch (error) {
    throw new Error('Invalid token');
  }
};
```

### 3. RBAC (Role-Based Access Control)

```typescript
// src/auth/rbac.ts
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

export interface Permission {
  action: string;
  resource: string;
}

export class RBACService {
  private permissions: Map<Role, Permission[]> = new Map();

  public addPermission(role: Role, permission: Permission) {
    const current = this.permissions.get(role) || [];
    this.permissions.set(role, [...current, permission]);
  }

  public can(role: Role, action: string, resource: string): boolean {
    const permissions = this.permissions.get(role) || [];
    return permissions.some(
      p => p.action === action && p.resource === resource
    );
  }
}
```

## Protection des Données

### 1. Chiffrement des Données Sensibles

```typescript
// src/utils/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class Encryption {
  constructor(
    private readonly algorithm: string,
    private readonly secretKey: Buffer
  ) {}

  public encrypt(text: string): { iv: string; content: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text),
      cipher.final()
    ]);

    return {
      iv: iv.toString('hex'),
      content: encrypted.toString('hex')
    };
  }

  public decrypt(encrypted: { iv: string; content: string }): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(encrypted.iv, 'hex')
    );
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.content, 'hex')),
      decipher.final()
    ]);

    return decrypted.toString();
  }
}
```

### 2. Masquage des Données Sensibles

```typescript
// src/utils/masking.ts
export const maskData = {
  email: (email: string): string => {
    const [local, domain] = email.split('@');
    return `${local[0]}***@${domain}`;
  },
  
  phone: (phone: string): string => {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  },
  
  creditCard: (card: string): string => {
    return card.replace(/(\d{4})\d{8}(\d{4})/, '$1********$2');
  }
};
```

## Sécurité du Scraping

### 1. Respect des Robots.txt

```typescript
// src/services/robotsTxt.ts
import { RobotsParser } from 'robots-parser';

export class RobotsService {
  private cache: Map<string, RobotsParser> = new Map();

  public async isAllowed(url: string, userAgent: string): Promise<boolean> {
    const domain = new URL(url).origin;
    let parser = this.cache.get(domain);

    if (!parser) {
      const robotsTxt = await this.fetchRobotsTxt(domain);
      parser = new RobotsParser(domain + '/robots.txt', robotsTxt);
      this.cache.set(domain, parser);
    }

    return parser.isAllowed(url, userAgent);
  }
}
```

### 2. Rotation des User Agents

```typescript
// src/services/userAgent.ts
export class UserAgentRotator {
  private agents: string[];
  private index: number = 0;

  constructor(agents: string[]) {
    this.agents = agents;
  }

  public next(): string {
    const agent = this.agents[this.index];
    this.index = (this.index + 1) % this.agents.length;
    return agent;
  }
}
```

### 3. Gestion des Proxies

```typescript
// src/services/proxy.ts
export interface Proxy {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export class ProxyManager {
  private proxies: Proxy[];
  private index: number = 0;

  constructor(proxies: Proxy[]) {
    this.proxies = proxies;
  }

  public next(): Proxy {
    const proxy = this.proxies[this.index];
    this.index = (this.index + 1) % this.proxies.length;
    return proxy;
  }

  public markFailed(proxy: Proxy) {
    this.proxies = this.proxies.filter(
      p => p.host !== proxy.host || p.port !== proxy.port
    );
  }
}
```

## Audit et Logging

### 1. Structured Logging

```typescript
// src/utils/logger.ts
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, any>;
  user?: string;
  ip?: string;
}

export class Logger {
  public log(entry: Omit<LogEntry, 'timestamp'>) {
    const fullEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    // Masquer les données sensibles
    if (fullEntry.context.password) {
      fullEntry.context.password = '***';
    }

    console.log(JSON.stringify(fullEntry));
  }
}
```

### 2. Audit Trail

```typescript
// src/services/audit.ts
export interface AuditEvent {
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  timestamp: Date;
  ip: string;
}

export class AuditService {
  public async logEvent(event: Omit<AuditEvent, 'timestamp'>) {
    const fullEvent: AuditEvent = {
      ...event,
      timestamp: new Date()
    };

    await this.store(fullEvent);
  }

  private async store(event: AuditEvent) {
    // Implémentation du stockage
  }
}
```

## Mises à Jour de Sécurité

### Process de Mise à Jour

1. Surveillance des CVE
2. Évaluation des dépendances
3. Tests de compatibilité
4. Déploiement des mises à jour

### Vérification des Dépendances

```bash
# Vérifier les vulnérabilités
npm audit

# Mettre à jour les dépendances
npm update

# Vérifier les mises à jour majeures
npm outdated
```

### Automatisation

```yaml
# .github/workflows/security.yml
name: Security Checks

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * *'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run npm audit
        run: npm audit
        
      - name: Run SAST
        uses: github/codeql-action/analyze@v1
        
      - name: Run Dependency Check
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
``` 