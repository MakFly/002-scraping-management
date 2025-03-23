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
  ads: Array<any>;
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
        'cookie': '__Secure-Install=6e653794-bb44-43ef-82cc-834b33e9874d; deviceId=78e8830f-9a9d-46d9-91d2-307a10cfa4a5; ry_ry-l3b0nco_realytics=eyJpZCI6InJ5XzZENERERTYwLUI3NUMtNDFGMi04RUFGLUU4RUFFOUFCQkJFOCIsImNpZCI6bnVsbCwiZXhwIjoxNzU2OTc2NTU5NDE3LCJjcyI6Mn0%3D; didomi_token=eyJ1c2VyX2lkIjoiMTkxYmM0NTgtNTNmNS02NmM2LWIzMTMtODk1NTZkMjZmMWQ0IiwiY3JlYXRlZCI6IjIwMjQtMDktMDRUMDk6MDI6MzguMzk5WiIsInVwZGF0ZWQiOiIyMDI0LTA5LTA0VDA5OjAyOjM5Ljc1M1oiLCJ2ZW5kb3JzIjp7ImRpc2FibGVkIjpbImdvb2dsZSIsImM6bGJjZnJhbmNlIiwiYzpyZXZsaWZ0ZXItY1JwTW5wNXgiLCJjOnB1cnBvc2VsYS0zdzRaZktLRCIsImM6aW5mZWN0aW91cy1tZWRpYSIsImM6dHVyYm8iLCJjOmFkaW1vLVBoVVZtNkZFIiwiYzpnb29nbGVhbmEtNFRYbkppZ1IiLCJjOnVuZGVydG9uZS1UTGpxZFRwZiIsImM6bTZwdWJsaWNpLXRYVFlETkFjIiwiYzpyb2NrZXJib3gtZlRNOEVKOVAiLCJjOmFmZmlsaW5ldCIsImM6c3BvbmdlY2VsbC1ueXliQUtIMiIsImM6dGFpbHRhcmdlLW5HV1VuYXk3IiwiYzp0aWt0b2stcktBWURnYkgiLCJjOnphbm94LWFZWXo2elc0IiwiYzpwaW50ZXJlc3QiLCJjOmlnbml0aW9uby1MVkFNWmRuaiIsImM6ZGlkb21pIiwiYzpsYmNmcmFuY2UtSHkza1lNOUYiXX0sInB1cnBvc2VzIjp7ImRpc2FibGVkIjpbImV4cGVyaWVuY2V1dGlsaXNhdGV1ciIsIm1lc3VyZWF1ZGllbmNlIiwicGVyc29ubmFsaXNhdGlvbm1hcmtldGluZyIsInByaXgiLCJkZXZpY2VfY2hhcmFjdGVyaXN0aWNzIiwiY29tcGFyYWlzby1ZM1p5M1VFeCJdfSwidmVuZG9yc19saSI6eyJkaXNhYmxlZCI6WyJnb29nbGUiLCJjOnB1cnBvc2VsYS0zdzRaZktLRCIsImM6dHVyYm8iXX0sInZlcnNpb24iOjIsImFjIjoiQUFBQS5BQUFBIn0=; euconsent-v2=CQEbF4AQEbF4AAHABBENBFFgAAAAAAAAAAAAAAAAAABigAMAAQU1GAAYAAgpqQAAwABBTUAA.YAAAAAAAAAAA; __Secure-InstanceId=6e653794-bb44-43ef-82cc-834b33e9874d; include_in_experiment=false; adview_clickmeter=search__listing__8__41717b85-1346-4c93-89f8-88a14e926c3e; luat=eyJhbGciOiJSUzI1NiIsImtpZCI6IjgyYjFjNmYwLWRiM2EtNTQ2Ny1hYmI2LTJlMzAxNDViZjc3MiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjoiMmFlNTc1YmMtNDFiZC00YjRiLWFjYmUtMDA4ZjEyNDE3MzJiIiwiY2xpZW50X2lkIjoibGJjLWZyb250LXdlYiIsImRlcHJlY2F0ZWRfc3RvcmVfaWQiOjg4MjY3NzgsImV4cCI6MTcyNTY0NjYxNSwiaWF0IjoxNzI1NjM5NDE1LCJpbnN0YWxsX2lkIjoiNmU2NTM3OTQtYmI0NC00M2VmLTgyY2MtODM0YjMzZTk4NzRkIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmxlYm9uY29pbi5mciIsImp0aSI6IjRmYWFlYjA3LWYxMTAtNDExOS1hYzJlLTdlNWM0ZTVhZTg2YSIsInNjb3BlIjoib2ZmbGluZSBsYmNncnAuYXV0aC50d29mYWN0b3Iuc21zLm1lLmFjdGl2YXRlIHBvbGFyaXMuKi4qLm1lLiogbGJjZ3JwLmF1dGgudHdvZmFjdG9yLm1lLiogcG9sYXJpcy4qLm1lLiogbGJjZ3JwLmF1dGguc2Vzc2lvbi5tZS5kaXNwbGF5IGxiYy5hdXRoLmVtYWlsLnBhcnQuY2hhbmdlIGxiY2dycC5hdXRoLnNlc3Npb24ubWUuZGVsZXRlIGxiYy4qLm1lLiogbGJjLiouKi5tZS4qIGxiYy5lc2Nyb3dhY2NvdW50Lm1haW50ZW5hbmNlLnJlYWQgbGJjbGVnYWN5LnVzZXJzIGJldGEubGJjLmF1dGgudHdvZmFjdG9yLm1lLiogbGJjZ3JwLmF1dGguc2Vzc2lvbi5tZS5yZWFkIGxiYy5wcml2YXRlIGxiY2xlZ2FjeS5wYXJ0Iiwic2NvcGVzIjpbIm9mZmxpbmUiLCJsYmNncnAuYXV0aC50d29mYWN0b3Iuc21zLm1lLmFjdGl2YXRlIiwicG9sYXJpcy4qLioubWUuKiIsImxiY2dycC5hdXRoLnR3b2ZhY3Rvci5tZS4qIiwicG9sYXJpcy4qLm1lLioiLCJsYmNncnAuYXV0aC5zZXNzaW9uLm1lLmRpc3BsYXkiLCJsYmMuYXV0aC5lbWFpbC5wYXJ0LmNoYW5nZSIsImxiY2dycC5hdXRoLnNlc3Npb24ubWUuZGVsZXRlIiwibGJjLioubWUuKiIsImxiYy4qLioubWUuKiIsImxiYy5lc2Nyb3dhY2NvdW50Lm1haW50ZW5hbmNlLnJlYWQiLCJsYmNsZWdhY3kudXNlcnMiLCJiZXRhLmxiYy5hdXRoLnR3b2ZhY3Rvci5tZS4qIiwibGJjZ3JwLmF1dGguc2Vzc2lvbi5tZS5yZWFkIiwibGJjLnByaXZhdGUiLCJsYmNsZWdhY3kucGFydCJdLCJzZXNzaW9uX2lkIjoiMzZjYjM0ZDYtZmYzNC00OTY0LWI5YjUtNTM3NTU2OWFmODI4Iiwic2lkIjoiMzZjYjM0ZDYtZmYzNC00OTY0LWI5YjUtNTM3NTU2OWFmODI4Iiwic3ViIjoibGJjOzJhZTU3NWJjLTQxYmQtNGI0Yi1hY2JlLTAwOGYxMjQxNzMyYjs4ODI2Nzc4In0.jCtAJAHM3B1MDHJxJXsV0iY42sKqxtLYsTvKnSzmuceWPSiNHgfeBVI-LqOP8VQuP4Sb4YKgqCXT6insRFnSm7fjfRFXA3Xt4W2CmW3y7gC7BVfkrbWgDaYNm9VSW3rYvnjK6WgWg-2ZHVZttCiDbv6DzVakhon8Qf5OXWTQWPobLIxNZNGbenDb3-PqOWHNqzB5ZidE6Qt2_cKSBZSSTYdZmQxjN4WiUctk_PhuQBUfSe2YS8q-rou009sCPTM111Yr4wP3JsyD-oliBMA_6qHuBl_z4lzyuLivU7gRBTRPq34Bf44rOAqyVyXoFuSJBvGY0uxPPhT9cMejQR-5Nuutbn7c8OUgyie9j-nzGZewKxSrfVNDMn_SE4NJoO1_c9dcNQBfjsfVaKZ7tQxYUK_ivM2tDctZ0tsYac5SGylSFK02jVrHF6KiJTtHIXA3Dk68ZZDmEAe0XKfWch969m4EbuyxQ9YZlgvjNmg0oQ3W0agman-Z_j_jutsp2tt6d7ev35qiei2n0_dcE2s9M1pOePBvYy_GloWZll8a8HITHQr4EgOHgEZ8ensr_G61eg-vP7F-frKBiSx6jY-wr9VZcA0acmkOoLTa0QYLb4iv-iOHHoHlX4vxuyE8PVCwgh-qBh1Ie5BxVbug8-YPMoC8e5L88Coyc0hQkWEy9jk; ry_ry-l3b0nco_so_realytics=eyJpZCI6InJ5XzZENERERTYwLUI3NUMtNDFGMi04RUFGLUU4RUFFOUFCQkJFOCIsImNpZCI6bnVsbCwib3JpZ2luIjp0cnVlLCJyZWYiOm51bGwsImNvbnQiOm51bGwsIm5zIjp0cnVlLCJzYyI6ImtvIiwic3AiOm51bGx9; datadome=eHD~lzQ8xvxjJvLp1nodDIfQdGsoWFa38HNi_89jOIFlpbmR_1efphYHlri3s7HmwQ1CfRpNCgNtN7J26XIRZqEBsBJsgnFrcnB9e~xwGVdYMmcgx0Pp7XwzhgjgB4Px; utag_main=v_id:0191bc45874d0019551558ae1c470206f001906700fb8$_sn:10$_ss:0$_st:1725641220734$_pn:2%3Bexp-session$ses_id:1725639414613%3Bexp-session; datadome=m3t3ogPhibDWf7RMcc2vWDe_R_J2leZPjwLgZLYV7NoY7MdfMGCdsAXB5YLTAXCvaTVg5y2xylf~mbMnjGwOYl_JxvWeKHhhXTF0ZBSvXF7qeqFsmVcG_zBJ~Rm_hgOm',
        'origin': 'https://www.leboncoin.fr',
        'pragma': 'no-cache',
        'priority': 'u=1, i',
        'referer': 'https://www.leboncoin.fr/f/voitures/u_car_brand--AUDI?locations=Lille__50.63279348052798_3.0572228143903684_10000_5000',
        'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
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
        u_car_brand: ["BMW"]
      },
      location: {}
    },
    limit: 35,
    limit_alu: 3,
    sort_by: "time",
    sort_order: "desc",
    offset: 0,
    user_id: "2ae575bc-41bd-4b4b-acbe-008f1241732b",
    store_id: "8826778",
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