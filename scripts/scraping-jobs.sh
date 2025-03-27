#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3000/api/v1/scraping/jobs"

# Function to make Autoscout24 scraping request
scrape_autoscout24() {
    echo -e "${GREEN}Starting Autoscout24 scraping job...${NC}"
    
    curl --location "$BASE_URL" \
        --header 'Content-Type: application/json' \
        --data '{
            "source": "autoscout24",
            "pageCount": 10
        }' \
        || { echo -e "${RED}Failed to start Autoscout24 scraping job${NC}"; exit 1; }
        
    echo -e "\n${GREEN}Autoscout24 scraping job request completed${NC}"
}

# Function to make Leboncoin scraping request
scrape_leboncoin() {
    echo -e "${GREEN}Starting Leboncoin scraping job...${NC}"
    
    curl --location "$BASE_URL" \
        --header 'Content-Type: application/json' \
        --data '{
            "source": "leboncoin",
            "params": {
                "filters": {
                    "category": {
                        "id": "2"
                    },
                    "enums": {
                        "ad_type": [
                            "offer"
                        ],
                        "u_car_brand": [
                            "*"
                        ] 
                    },
                    "ranges": {
                        "mileage": {
                            "max": 80000
                        }
                    },
                    "location": {}
                },
                "limit": 35,
                "limit_alu": 3,
                "sort_by": "time",
                "sort_order": "desc",
                "offset": 0,
                "extend": true,
                "listing_source": "direct-search"
            },
            "pagination": 20 
        }' \
        || { echo -e "${RED}Failed to start Leboncoin scraping job${NC}"; exit 1; }
        
    echo -e "\n${GREEN}Leboncoin scraping job request completed${NC}"
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 [autoscout24|leboncoin|all]"
    exit 1
fi

# Process command line arguments
case "$1" in
    "autoscout24")
        scrape_autoscout24
        ;;
    "leboncoin")
        scrape_leboncoin
        ;;
    "all")
        scrape_autoscout24
        echo -e "\n"
        scrape_leboncoin
        ;;
    *)
        echo "Invalid argument. Use: autoscout24, leboncoin, or all"
        exit 1
        ;;
esac 