import axios from 'axios';
import { ScrapeStrategy, ScrapedData, ScraperType } from '../../types/scraper.types';
import { ScrapeJob } from '../../queues/scrape.queue';
import { logger } from '../../config/logger';

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
      
      // Boucle sur chaque page
      for (let page = 0; page < pageCount; page++) {
        const currentParams = {
          ...searchParams,
          offset: page * (searchParams.limit || 35)
        };

        logger.info(`Scraping de la page ${page + 1}/${pageCount} pour leboncoin`);
        
        // Appel à l'API Leboncoin
        const response = await axios.post(LEBONCOIN_API_URL, currentParams, {
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

        // Ajouter les résultats à notre tableau
        allItems = [...allItems, ...response.data.ads];
        totalPages = Math.ceil(response.data.total / (searchParams.limit || 35));

        // Si on n'a plus de résultats, on arrête
        if (response.data.ads.length < (searchParams.limit || 35)) {
          break;
        }

        // Attendre un peu entre chaque requête pour éviter de surcharger l'API
        if (page < pageCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
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
            ...ad
          }
        })),
        metadata: {
          source: 'leboncoin',
          query: job.query,
          timestamp: new Date().toISOString(),
          scraperUsed: ScraperType.LEBONCOIN,
          executionTimeMs: Date.now() - startTime,
          pagesScraped: pageCount
        }
      };
    } catch (error) {
      logger.error('Erreur lors du scraping Leboncoin:', error);
      throw error;
    }
  }
}; 