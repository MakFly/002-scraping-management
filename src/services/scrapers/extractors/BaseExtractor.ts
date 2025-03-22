import { Page } from 'puppeteer';
import { Extractor } from '../../../types/extractor.types';
import { ScrapedItem, ExtendedScrapeJob } from '../../../types/scraper.types';

/**
 * Extracteur de base avec implémentations partagées
 */
export abstract class BaseExtractor implements Extractor {
  /**
   * Vérifie si l'extracteur peut gérer cette source
   * Méthode abstraite à implémenter par chaque extracteur concret
   */
  abstract canHandle(source: string): boolean;

  /**
   * Extrait les éléments de la page
   * Méthode abstraite à implémenter par chaque extracteur concret
   */
  abstract extractItems(page: Page, selectors: any): Promise<ScrapedItem[]>;

  /**
   * Construit l'URL de recherche
   * Implémentation par défaut qui peut être surchargée par les sous-classes
   */
  buildUrl(domain: string, query: string = '', page: number = 1, job?: ExtendedScrapeJob): string {
    // Si le domaine contient déjà http:// ou https://, on l'utilise tel quel
    if (domain.startsWith('http')) {
      // Ajouter le paramètre de recherche si nécessaire
      if (query) {
        const url = new URL(domain);
        url.searchParams.set('q', query);
        if (page > 1) {
          url.searchParams.set('page', page.toString());
        }
        return url.toString();
      }
      return domain;
    }

    // Format générique pour les domaines
    const baseUrl = `https://${domain}`;
    const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
    return page > 1 ? `${url}&page=${page}` : url;
  }

  /**
   * Gestion par défaut de la pagination
   * Retourne false pour indiquer que la logique par défaut doit être appliquée
   */
  handlePagination(currentPage: number, pageCount: number, job: ExtendedScrapeJob): boolean {
    return false; // Pas de traitement spécial, utiliser la logique par défaut
  }

  /**
   * Utilitaire pour nettoyer et convertir un texte de prix en nombre
   */
  protected cleanPrice(priceText: string | undefined | null): number | string {
    if (!priceText) return '';
    
    // Nettoyage du prix
    const cleaned = priceText.replace(/[^\d.,]/g, '').trim();
    const normalized = cleaned.replace(',', '.');
    
    // Tentative de conversion en nombre
    const number = parseFloat(normalized);
    return isNaN(number) ? priceText : number;
  }
} 