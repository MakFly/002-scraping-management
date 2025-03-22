import { Page } from 'puppeteer';
import { ScrapedItem, ExtendedScrapeJob } from './scraper.types';

/**
 * Interface commune pour tous les extracteurs spécifiques à une source
 */
export interface Extractor {
  /**
   * Extrait les éléments de la page en utilisant Puppeteer
   * @param page Page Puppeteer
   * @param selectors Sélecteurs CSS pour extraire les données
   * @returns Liste des éléments extraits
   */
  extractItems(page: Page, selectors: any): Promise<ScrapedItem[]>;

  /**
   * Construit l'URL de recherche spécifique à la source
   * @param domain Domaine de base
   * @param query Requête de recherche
   * @param page Numéro de page
   * @param job Informations sur la tâche de scraping
   * @returns URL complète
   */
  buildUrl(domain: string, query: string, page: number, job: ExtendedScrapeJob): string;

  /**
   * Indique si l'extracteur peut gérer la source donnée
   * @param source Nom de la source/domaine
   * @returns Vrai si l'extracteur peut gérer cette source
   */
  canHandle(source: string): boolean;

  /**
   * Gère la navigation vers la page suivante
   * @param currentPage Page actuelle
   * @param pageCount Nombre total de pages
   * @param job Informations sur la tâche de scraping
   * @returns Vrai si la navigation est gérée, faux si elle doit être traitée par défaut
   */
  handlePagination?(currentPage: number, pageCount: number, job: ExtendedScrapeJob): boolean;
} 