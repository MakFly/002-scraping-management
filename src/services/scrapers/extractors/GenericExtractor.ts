import { Page } from 'puppeteer';
import { BaseExtractor } from './BaseExtractor';
import { ScrapedItem } from '../../../types/Scraper';

/**
 * Extracteur générique pour les sources sans logique spécifique
 */
export class GenericExtractor extends BaseExtractor {
  /**
   * Cet extracteur peut gérer n'importe quelle source comme fallback
   */
  canHandle(source: string): boolean {
    return true; // Accepte toutes les sources comme dernier recours
  }

  /**
   * Extrait les éléments génériques de la page
   */
  async extractItems(page: Page, selectors: any): Promise<ScrapedItem[]> {
    return page.evaluate((selectors) => {
      const items: ScrapedItem[] = [];
      
      // Trouver tous les conteneurs d'items
      const containers = document.querySelectorAll(selectors.container);
      
      containers.forEach((container) => {
        const item: any = {};
        
        // Extraire les différentes données pour chaque item
        if (selectors.title) {
          const titleElement = container.querySelector(selectors.title);
          if (titleElement) {
            item.title = titleElement.textContent?.trim();
          }
        }
        
        if (selectors.description) {
          const descElement = container.querySelector(selectors.description);
          if (descElement) {
            item.description = descElement.textContent?.trim();
          }
        }
        
        if (selectors.price) {
          const priceElement = container.querySelector(selectors.price);
          if (priceElement) {
            item.price = priceElement.textContent?.trim();
          }
        }
        
        if (selectors.url) {
          const urlElement = container.querySelector(selectors.url);
          if (urlElement && urlElement instanceof HTMLAnchorElement) {
            item.url = urlElement.href;
          }
        }
        
        if (selectors.image) {
          const imgElement = container.querySelector(selectors.image);
          if (imgElement && imgElement instanceof HTMLImageElement) {
            item.image = imgElement.src || imgElement.dataset.src;
          }
        }
        
        // Vérifier que l'item a au moins un champ non vide
        if (Object.values(item).some(value => value)) {
          items.push(item);
        }
      });
      
      return items;
    }, selectors);
  }
} 