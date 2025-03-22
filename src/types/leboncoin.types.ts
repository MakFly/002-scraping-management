export interface LeboncoinSearchParams {
  filters: {
    category: {
      id: string;
    };
    enums: {
      ad_type: string[];
      u_car_brand?: string[];
    };
    location: Record<string, any>;
  };
  limit: number;
  limit_alu: number;
  sort_by: string;
  sort_order: 'desc' | 'asc';
  offset: number;
  user_id?: string;
  store_id?: string;
  extend: boolean;
  listing_source: string;
}

export interface LeboncoinSearchResponse {
  total: number;
  total_all: number;
  total_pro: number;
  total_private: number;
  total_active: number;
  ads: Array<any>; // On garde any pour le moment car on ne modifie pas le prisma
  ranges: any;
  pivot: any;
}

export interface LeboncoinScrapeRequest {
  source: 'leboncoin';
  params: LeboncoinSearchParams;
  pagination?: number; // Nombre de pages à scraper
} 