import axios from 'axios';
import { LeboncoinSearchParams, LeboncoinSearchResponse } from '../../../../types/leboncoin.types';

const LEBONCOIN_API_URL = 'https://api.leboncoin.fr/finder/search';

export class LeboncoinExtractor {
  async search(params: LeboncoinSearchParams): Promise<LeboncoinSearchResponse> {
    try {
      const response = await axios.post(LEBONCOIN_API_URL, params, {
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

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Leboncoin API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      throw error;
    }
  }

  async searchWithPagination(params: LeboncoinSearchParams, pageCount: number): Promise<LeboncoinSearchResponse[]> {
    const results: LeboncoinSearchResponse[] = [];
    
    for (let i = 0; i < pageCount; i++) {
      const currentParams = {
        ...params,
        offset: i * params.limit
      };
      
      const result = await this.search(currentParams);
      results.push(result);
      
      // Si on n'a plus de résultats, on arrête la pagination
      if (result.ads.length < params.limit) {
        break;
      }
      
      // Petit délai entre les requêtes pour éviter de surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
} 