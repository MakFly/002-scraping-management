import axios from 'axios';
import { ScrapeStrategy, ScrapedData, ScraperType } from '../../types/scraper.types';
import { ScrapeJob } from '../../queues/scrape.queue';
import { logger } from '../../config/logger';
import { LeboncoinParamsBuilder } from './utils/LeboncoinParamsBuilder';
import carBrands from '../../config/car-brands.json';

const LEBONCOIN_API_URL = 'https://api.leboncoin.fr/finder/search';

export const leboncoinStrategy: ScrapeStrategy = {
  getType() {
    return ScraperType.LEBONCOIN;
  },

  async scrape(job: ScrapeJob): Promise<ScrapedData> {
    try {
      const startTime = Date.now();
      // Parse les paramètres de recherche depuis la query du job
      const searchParams = job.query ? JSON.parse(job.query) : {};
      const pageCount = job.pageCount || 1;
      
      let allItems: any[] = [];
      let totalPages = 0;
      
      // Récupère la liste des marques à scraper
      const brandsToScrape = searchParams.filters.enums.u_car_brand?.[0] === '*' 
        ? Object.keys(carBrands)
        : searchParams.filters.enums.u_car_brand || [];

      logger.info(`Marques à scraper: ${brandsToScrape.join(', ')}`);

      // Pour chaque marque
      for (const brand of brandsToScrape) {
        logger.info(`Début du scraping pour la marque: ${brand}`);

        // Boucle sur chaque page pour cette marque
        for (let page = 0; page < pageCount; page++) {
          const currentParams = {
            ...searchParams,
            filters: {
              ...searchParams.filters,
              enums: {
                ...searchParams.filters.enums,
                u_car_brand: [brand]
              }
            },
            offset: page * (searchParams.limit || 35)
          };

          // Ajoute les paramètres spécifiques à la marque
          const enrichedParams = LeboncoinParamsBuilder.addBrandSpecificParams(currentParams);

          logger.info(`Scraping de la page ${page + 1}/${pageCount} pour ${brand}`);
          
          try {
            // Appel à l'API Leboncoin
            const response = await axios.post(LEBONCOIN_API_URL, enrichedParams, {
              headers: {
                'accept': '*/*',
                'accept-language': 'en,fr-FR;q=0.9,fr;q=0.8',
                'api_key': 'ba0c2dad52b3ec',
                'cache-control': 'no-cache',
                'content-type': 'application/json',
                'origin': 'https://www.leboncoin.fr',
                'pragma': 'no-cache',
                'referer': 'https://www.leboncoin.fr',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
              }
            });

            // Ajouter les résultats à notre tableau avec la marque
            const itemsWithBrand = response.data.ads.map((ad: any) => ({
              ...ad,
              scrapedBrand: brand // Ajoute la marque aux métadonnées
            }));
            allItems = [...allItems, ...itemsWithBrand];
            
            // Si on n'a plus de résultats pour cette marque, passer à la suivante
            if (response.data.ads.length < (searchParams.limit || 35)) {
              logger.info(`Plus de résultats pour ${brand}, passage à la marque suivante`);
              break;
            }

            // Attendre entre chaque requête pour éviter de surcharger l'API
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            logger.error(`Erreur lors du scraping de ${brand} page ${page + 1}:`, error);
            // Continue avec la marque suivante en cas d'erreur
            break;
          }
        }

        // Attendre un peu plus longtemps entre chaque marque
        if (brandsToScrape.indexOf(brand) < brandsToScrape.length - 1) {
          logger.info(`Pause entre les marques (3 secondes)`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // Formatage des résultats
      return {
        items: allItems.map((ad: any) => ({
          id: ad.list_id,
          title: ad.subject,
          description: ad.body,
          url: `https://www.leboncoin.fr/voitures/${ad.list_id}.htm`,
          price: ad.price?.[0],
          images: ad.images?.urls || [],
          metadata: {
            category: ad.category_name,
            publicationDate: ad.first_publication_date,
            expirationDate: ad.expiration_date,
            status: ad.status,
            scrapedBrand: ad.scrapedBrand, // Inclure la marque dans les métadonnées
            ...ad
          }
        })),
        metadata: {
          source: 'leboncoin',
          query: job.query,
          timestamp: new Date().toISOString(),
          scraperUsed: ScraperType.LEBONCOIN,
          executionTimeMs: Date.now() - startTime,
          pagesScraped: pageCount,
          brandsScraped: brandsToScrape,
          totalBrands: brandsToScrape.length
        }
      };
    } catch (error) {
      logger.error('Erreur lors du scraping Leboncoin:', error);
      throw error;
    }
  }
}; 