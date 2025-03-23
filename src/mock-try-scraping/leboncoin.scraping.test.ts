import axios from 'axios';

interface LeboncoinSearchParams {
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

interface LeboncoinSearchResponse {
  total: number;
  total_all: number;
  total_pro: number;
  total_private: number;
  total_active: number;
  ads: Array<any>; // You can type this more specifically based on the response
  ranges: any;
  pivot: any;
}

const LEBONCOIN_API_URL = 'https://api.leboncoin.fr/finder/search';

async function searchLeboncoin(params: LeboncoinSearchParams): Promise<LeboncoinSearchResponse> {
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

// Test the search function
async function testLeboncoinSearch() {
  const searchParams: LeboncoinSearchParams = {
    filters: {
      category: {
        id: "2" // Voitures category
      },
      enums: {
        ad_type: ["offer"],
        u_car_brand: ["AUDI"]
      },
      location: {}
    },
    limit: 35,
    limit_alu: 3,
    sort_by: "time",
    sort_order: "desc",
    offset: 0,
    extend: true,
    listing_source: "direct-search"
  };

  try {
    const results = await searchLeboncoin(searchParams);
    console.log('Search Results:', {
      total: results.total,
      totalAds: results.ads.length,
      firstAd: results.ads[0]
    });
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLeboncoinSearch(); 