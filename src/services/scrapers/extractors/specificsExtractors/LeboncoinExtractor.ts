import axios from 'axios';
import { LeboncoinSearchParams, LeboncoinSearchResponse } from '../../../../types/leboncoin.types';
import { UnifiedVehicleAd } from '../../../../types/unified.types';

const LEBONCOIN_API_URL = 'https://api.leboncoin.fr/finder/search';

export class LeboncoinExtractor {
  private normalizeData(ad: any): UnifiedVehicleAd {
    // Extraction des attributs du véhicule
    const attributes = ad.attributes?.reduce((acc: any, attr: any) => {
      acc[attr.key] = attr.value;
      return acc;
    }, {}) || {};

    return {
      id: `leboncoin_${ad.list_id}`,
      platform: 'leboncoin',
      url: `https://www.leboncoin.fr/voitures/${ad.list_id}.htm`,
      externalId: ad.list_id.toString(),

      title: ad.subject,
      description: ad.body,
      price: ad.price?.[0] || 0,

      location: {
        city: ad.location?.city || '',
        postalCode: ad.location?.zipcode || '',
        region: ad.location?.region_name || '',
        department: ad.location?.department_name || '',
        coordinates: ad.location?.lat && ad.location?.lng ? {
          lat: ad.location.lat,
          lng: ad.location.lng
        } : undefined
      },

      vehicle: {
        brand: attributes.brand || attributes.u_car_brand || '',
        model: attributes.model || attributes.u_car_model || '',
        version: attributes.u_car_version || '',
        year: parseInt(attributes.regdate) || 0,
        mileage: parseInt(attributes.mileage) || 0,
        fuel: attributes.fuel === '1' ? 'essence' : attributes.fuel || '',
        transmission: attributes.gearbox === '2' ? 'automatique' : 'manuelle',
        power: {
          fiscal: parseInt(attributes.horsepower) || 0,
          din: parseInt(attributes.horse_power_din) || 0
        },
        color: attributes.vehicule_color || '',
        doors: parseInt(attributes.doors) || 0,
        seats: parseInt(attributes.seats) || 0,
        technicalInspection: {
          validUntil: attributes.vehicle_technical_inspection_a || ''
        },
        features: attributes.vehicle_interior_specs?.values_label || [],
        condition: attributes.vehicle_damage === 'undamaged' ? 'excellent' : attributes.vehicle_damage || 'unknown'
      },

      images: {
        urls: ad.images?.urls || [],
        thumbnail: ad.images?.small_url
      },

      seller: {
        name: ad.owner?.name || '',
        type: ad.owner?.type || 'private',
        phone: ad.has_phone || false
      },

      metadata: {
        publishedAt: ad.first_publication_date || '',
        expiresAt: ad.expiration_date || '',
        status: ad.status || 'active',
        category: ad.category_name || 'car',
        lastUpdated: ad.index_date || new Date().toISOString()
      }
    };
  }

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

      // Normaliser les données avant de les retourner
      return {
        ...response.data,
        ads: response.data.ads.map((ad: any) => this.normalizeData(ad))
      };
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