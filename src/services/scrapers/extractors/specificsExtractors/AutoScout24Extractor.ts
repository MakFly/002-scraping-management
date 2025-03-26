import { Page } from 'puppeteer';
import { BaseExtractor } from '../BaseExtractor';
import { ScrapedItem, ExtendedScrapeJob } from '../../../../types/scraper.types';
import { logger } from '../../../../config/logger';
import { domainRegistry } from '../../DomainRegistry';
import { UnifiedVehicleAd } from '../../../../types/unified.types';

/**
 * Extracteur spécifique pour AutoScout24
 */
export class AutoScout24Extractor extends BaseExtractor {
  /**
   * Vérifie si la source est AutoScout24
   */
  canHandle(source: string): boolean {
    return source.includes('autoscout24');
  }

  /**
   * Gère la pagination spécifique d'AutoScout24
   * Au lieu de chercher un bouton "suivant", on modifie l'URL directement
   */
  handlePagination(currentPage: number, pageCount: number, job: ExtendedScrapeJob): boolean {
    // Si on n'a pas fini toutes les pages
    if (currentPage < pageCount) {
      logger.info(`AutoScout24: pagination par URL pour la page ${currentPage + 1}`);
      
      // Récupérer la configuration du domaine
      const domainConfig = domainRegistry.getConfig(job.source);
      
      // Ajouter un délai entre les pages si la configuration le spécifie
      if (domainConfig?.options?.puppeteerOptions?.delayBetweenPages) {
        const minDelay = domainConfig.options.puppeteerOptions.delayBetweenPages.min || 1500;
        const maxDelay = domainConfig.options.puppeteerOptions.delayBetweenPages.max || 2500;
        // Le délai sera appliqué par la classe principale
      }
      
      return true; // Indique que la pagination est gérée
    }
    
    return false; // Pas de pagination nécessaire
  }

  /**
   * Construit l'URL de recherche spécifique à AutoScout24
   */
  buildUrl(domain: string, query: string = '', page: number = 1, job?: ExtendedScrapeJob): string {
    // Récupérer la configuration du domaine pour les options spécifiques
    const domainConfig = domainRegistry.getConfig(domain);
    
    // Pour AutoScout24, la query est optionnelle, on utilise l'URL par défaut si aucune query
    if (!query && domainConfig?.options?.defaultSearchUrl) {
      let defaultUrl = String(domainConfig.options.defaultSearchUrl);
      
      // Ajouter le code postal et le rayon si fournis
      if (job?.zip) {
        if (defaultUrl.includes('?')) {
          defaultUrl += `&zip=${job.zip}`;
        } else {
          defaultUrl += `?zip=${job.zip}`;
        }
        // Ajouter le rayon de recherche si fourni
        if (job?.zipr) {
          defaultUrl += `&zipr=${job.zipr}`;
        }
      }
      
      // Si on doit paginer, remplacer le paramètre de page
      if (page > 1) {
        return defaultUrl.replace(/([&?])page=\d+/, `$1page=${page}`);
      }
      
      logger.info(`Utilisation de l'URL par défaut pour AutoScout24: ${defaultUrl}`);
      return defaultUrl;
    }
    
    // Si une query est fournie, l'ajouter à l'URL
    const baseUrl = `https://${domain}`;
    if (query) {
      let url = `${baseUrl}/lst?q=${encodeURIComponent(query)}`;
      
      // Ajouter les paramètres de localisation si fournis
      if (job?.zip) {
        url += `&zip=${job.zip}`;
        if (job?.zipr) {
          url += `&zipr=${job.zipr}`;
        }
      }
      
      // Ajouter le numéro de page
      if (page > 1) {
        url += `&page=${page}`;
      }
      
      logger.info(`URL de recherche construite pour AutoScout24: ${url}`);
      return url;
    }
    
    // Si on arrive ici, c'est qu'il n'y a ni query ni defaultSearchUrl
    // On utilise alors la baseUrl depuis la configuration
    if (domainConfig?.options?.baseUrl) {
      logger.info(`Utilisation de baseUrl pour AutoScout24: ${domainConfig.options.baseUrl}`);
      return String(domainConfig.options.baseUrl);
    }
    
    // Dernier recours: retourner le domaine avec https://
    const fullUrl = `https://www.${domain}/lst`;
    logger.info(`Utilisation de l'URL générée pour AutoScout24: ${fullUrl}`);
    return fullUrl;
  }

  /**
   * Normalise les données extraites en format unifié
   */
  private normalizeData(item: any): UnifiedVehicleAd {
    return {
      id: `autoscout24_${item.id || Date.now()}`,
      platform: 'autoscout24',
      url: item.url || '',
      externalId: item.id || '',

      title: item.title || '',
      description: item.description || '',
      price: item.price || 0,

      location: {
        city: item.city || '',
        postalCode: item.postalCode || '',
        region: '', // À compléter si disponible dans l'API
        department: '', // À compléter si disponible dans l'API
        coordinates: undefined // À compléter si disponible dans l'API
      },

      vehicle: {
        brand: item.brand || '',
        model: item.model || '',
        version: item.version || '',
        year: item.year || 0,
        mileage: item.mileage || 0,
        fuel: item.fuel || '',
        transmission: item.transmission || '',
        power: {
          fiscal: item.fiscalPower || 0,
          din: item.dinPower || 0
        },
        color: item.color || '',
        doors: item.doors || 0,
        seats: item.seats || 0,
        technicalInspection: {
          validUntil: item.technicalInspectionDate || ''
        },
        features: item.features || [],
        condition: item.condition || 'unknown'
      },

      images: {
        urls: item.images || [],
        thumbnail: item.thumbnail
      },

      seller: {
        name: item.fullname || '',
        type: item.dealerType || 'private',
        phone: item.hasPhone || false
      },

      metadata: {
        publishedAt: item.publishedAt || '',
        expiresAt: item.expiresAt || '',
        status: item.status || 'active',
        category: item.category || 'car',
        lastUpdated: item.lastUpdated || new Date().toISOString()
      }
    };
  }

  /**
   * Extrait les éléments spécifiques à AutoScout24
   */
  async extractItems(page: Page, selectors: any): Promise<ScrapedItem[]> {
    const rawItems = await page.evaluate((selectors) => {
      const items: any[] = [];
      
      // Trouver tous les conteneurs d'articles
      const containers = document.querySelectorAll(selectors.container);
      
      containers.forEach((container) => {
        const item: any = {};
        
        // Extraction du titre (avec fallback)
        if (selectors.title) {
          const titleElement = container.querySelector(selectors.title) || container.querySelector(selectors.fallbackTitle);
          if (titleElement) {
            item.title = titleElement.textContent?.trim();
            
            // Récupérer également l'URL du véhicule si c'est un lien
            if (titleElement.tagName === 'A' && titleElement instanceof HTMLAnchorElement) {
              item.url = titleElement.href;
            }
          }
        }
        
        // Extraction du prix (avec fallback)
        if (selectors.price) {
          const priceElement = container.querySelector(selectors.price) || container.querySelector(selectors.fallbackPrice);
          if (priceElement) {
            const priceText = priceElement.textContent?.trim();
            if (priceText) {
              // Nettoyage du prix
              const cleaned = priceText.replace(/[^\d.,]/g, '').trim();
              const normalized = cleaned.replace(',', '.');
              // Tentative de conversion en nombre
              const number = parseFloat(normalized);
              item.price = isNaN(number) ? priceText : number;
            }
          }
        }
        
        // Extraction de l'URL si pas déjà extraite via le titre
        if (selectors.url && !item.url) {
          const urlElement = container.querySelector('a');
          if (urlElement && urlElement instanceof HTMLAnchorElement) {
            item.url = urlElement.href;
          }
        }
        
        // Extraction de l'image
        if (selectors.image) {
          const imgElement = container.querySelector(selectors.image);
          if (imgElement && imgElement instanceof HTMLImageElement) {
            item.image = imgElement.src || imgElement.dataset.src;
            
            // Si srcset est présent, prendre la première URL
            if (!item.image && imgElement.srcset) {
              const firstSrc = imgElement.srcset.split(',')[0];
              if (firstSrc) {
                item.image = firstSrc.trim().split(' ')[0];
              }
            }
          }
        }
        
        // Extraction du kilométrage
        if (selectors.mileage) {
          const mileageElement = container.querySelector(selectors.mileage);
          if (mileageElement) {
            const mileageText = mileageElement.textContent?.trim();
            if (mileageText) {
              // Nettoyage du kilométrage
              const cleaned = mileageText.replace(/[^\d.,]/g, '').trim();
              const normalized = cleaned.replace(',', '.');
              const number = parseFloat(normalized);
              item.mileage = isNaN(number) ? mileageText : number;
            }
          }
        }
        
        // Extraction de la description
        if (selectors.description) {
          const descElement = container.querySelector(selectors.description);
          if (descElement) {
            item.description = descElement.textContent?.trim();
          }
        }
        
        // Extraction de la ville/emplacement et séparation en champs distincts
        if (selectors.city) {
          // Si city est un tableau de sélecteurs, essayer chacun jusqu'à trouver quelque chose
          if (Array.isArray(selectors.city)) {
            for (const citySelector of selectors.city) {
              const cityElement = container.querySelector(citySelector);
              if (cityElement && cityElement.textContent?.trim()) {
                const dealerInfo = cityElement.textContent.trim();
                item.originalDealer = dealerInfo; // Conserver l'information complète
                
                // Utiliser regex pour extraire le fullname, code postal et ville
                // Format attendu: "Victor Lenoble • FR-01630 SAINT-GENIS-POUILLY"
                const dealerRegex = /^(.*?)(?:\s+•\s+(?:FR-(\d+)\s+)?(.*))?$/;
                const matches = dealerInfo.match(dealerRegex);
                
                if (matches) {
                  // Avant le '•' c'est 'fullname'
                  item.fullname = matches[1]?.trim() || '';
                  
                  // Après le '•' si c'est FR-***** alors c'est le code postal
                  item.postalCode = matches[2] || '';
                  
                  // Et seulement après c'est la ville
                  item.city = matches[3]?.trim() || dealerInfo; // Utiliser la ville extraite ou conserver la valeur originale si pas de match
                } else {
                  item.city = dealerInfo;
                }
                break;
              }
            }
          } else {
            const cityElement = container.querySelector(selectors.city);
            if (cityElement) {
              const dealerInfo = cityElement.textContent?.trim() || '';
              item.originalDealer = dealerInfo; // Conserver l'information complète
              
              // Utiliser regex pour extraire le fullname, code postal et ville
              // Format attendu: "Victor Lenoble • FR-01630 SAINT-GENIS-POUILLY"
              const dealerRegex = /^(.*?)(?:\s+•\s+(?:FR-(\d+)\s+)?(.*))?$/;
              const matches = dealerInfo.match(dealerRegex);
              
              if (matches) {
                // Avant le '•' c'est 'fullname'
                item.fullname = matches[1]?.trim() || '';
                
                // Après le '•' si c'est FR-***** alors c'est le code postal
                item.postalCode = matches[2] || '';
                
                // Et seulement après c'est la ville
                item.city = matches[3]?.trim() || dealerInfo; // Utiliser la ville extraite ou conserver la valeur originale si pas de match
              } else {
                item.city = dealerInfo; // Pas de correspondance de format, garder la valeur originale
              }
            }
          }
        }
        
        // Ne garder que les éléments qui ont au moins l'URL ou le titre
        if (item.url || item.title) {
          items.push(item);
        }
      });
      
      return items;
    }, selectors);

    // Normaliser les données extraites
    return rawItems.map(item => this.normalizeData(item));
  }
} 