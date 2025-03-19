# Swagger API Documentation

This project includes a Swagger UI interface that provides interactive documentation for the API. The Swagger UI allows you to explore the available endpoints, understand the request/response formats, and even test the API directly from your browser.

## Accessing Swagger UI

After starting the application, the Swagger UI is available at:

```
http://localhost:3000/swagger
```

## OpenAPI Specification

The raw OpenAPI specification document is available at:

```
http://localhost:3000/doc
```

You can use this URL to import the API specification into other tools like Postman.

## Features

- **Interactive Documentation**: Test endpoints directly from the browser
- **Request/Response Models**: See the exact structure of request and response data
- **Authentication**: Test endpoints with authentication included
- **Schema Validation**: Understand the validation rules for each endpoint

## Using Swagger UI

1. **Exploring Endpoints**: Endpoints are grouped by tags. Click on an endpoint to expand it and see more details.

2. **Testing Endpoints**: 
   - Click the "Try it out" button on any endpoint
   - Fill in the required parameters
   - Click "Execute" to send the request
   - View the response below

3. **Authentication**:
   - For secured endpoints, you'll need to authenticate
   - Click the "Authorize" button at the top of the page
   - Enter your credentials
   - All subsequent requests will include your authentication

## API Endpoints

The API provides the following main endpoints:

### Scraping Endpoints

- `POST /api/scrape` - Create a new scraping job
- `GET /api/scrape/{id}` - Get details of a specific scraping job
- `GET /api/scrape` - List all scraping jobs with pagination

## Development Notes

The Swagger UI is generated using [@hono/swagger-ui](https://github.com/honojs/middleware/tree/main/packages/swagger-ui) and [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) packages.

To modify the API documentation:

1. Update the schema definitions in `src/types/ScrapeJobTypes.ts`
2. Update the route definitions in `src/routes/swaggerRoute.ts`

The OpenAPI specification is automatically generated from the type definitions and route handlers. 