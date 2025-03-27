import { LeboncoinSearchParams } from '../../../types/leboncoin.types';
import carBrands from '../../../config/car-brands.json';

export class LeboncoinParamsBuilder {
  /**
   * Ajoute des paramètres de recherche spécifiques en fonction de la marque
   * @param params Les paramètres de base
   * @param brand La marque de voiture
   * @returns Les paramètres enrichis
   */
  static addBrandSpecificParams(params: LeboncoinSearchParams): LeboncoinSearchParams {
    const brand = params.filters.enums.u_car_brand?.[0];
    if (!brand) return params;

    const brandConfig = (carBrands as any)[brand];
    if (!brandConfig) return params;

    let additionalParams: Partial<LeboncoinSearchParams> = {};

    // Paramètres spécifiques pour Volkswagen
    if (brand === 'VOLKSWAGEN') {
      additionalParams = {
        filters: {
          ...params.filters,
          keywords: {
            text: 'gti'
          }
        }
      };
    }

    // Paramètres spécifiques pour les marques premium
    if (brandConfig.premium_models && brandConfig.premium_models.length > 0) {
      // Si la marque a des modèles premium spécifiques, on peut ajouter des filtres supplémentaires
      // Par exemple, on pourrait ajouter des filtres sur les modèles ou d'autres critères
      additionalParams = {
        filters: {
          ...params.filters,
          ...additionalParams.filters,
          ranges: {
            ...params.filters.ranges,
            price: {
              min: 10000 // Prix minimum pour les modèles premium
            }
          }
        }
      };
    }

    // Fusion des paramètres
    return {
      ...params,
      ...additionalParams,
      filters: {
        ...params.filters,
        ...additionalParams.filters
      }
    };
  }

  /**
   * Vérifie si un modèle est premium pour une marque donnée
   * @param brand La marque de voiture
   * @param model Le modèle à vérifier
   * @returns true si le modèle est premium
   */
  static isPremiumModel(brand: string, model: string): boolean {
    const brandConfig = (carBrands as any)[brand];
    if (!brandConfig || !brandConfig.premium_models) return false;

    const formattedModel = `${brand}_${model}`;
    return brandConfig.premium_models.includes(formattedModel);
  }

  /**
   * Obtient la liste des modèles premium pour une marque donnée
   * @param brand La marque de voiture
   * @returns La liste des modèles premium
   */
  static getPremiumModels(brand: string): string[] {
    const brandConfig = (carBrands as any)[brand];
    if (!brandConfig || !brandConfig.premium_models) return [];
    return brandConfig.premium_models;
  }
} 