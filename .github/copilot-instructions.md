# Hono.js Usage Guidelines

## Error Handling with try/catch/finally

When handling errors in your Hono.js application, follow these best practices:

1. Always type your errors properly:
    ```typescript
    try {
      // Your code here
    } catch (error) {
      // Type the error correctly
      if (error instanceof Error) {
         c.status(500)
         return c.json({ error: error.message })
      }
      
      // Handle unknown errors
      c.status(500)
      return c.json({ error: 'Unknown error occurred' })
    }
    ```

2. Use custom error classes for better error handling:
    ```typescript
    class ApiError extends Error {
      statusCode: number
      
      constructor(message: string, statusCode = 500) {
         super(message)
         this.statusCode = statusCode
      }
    }
    
    try {
      throw new ApiError('Resource not found', 404)
    } catch (error) {
      if (error instanceof ApiError) {
         c.status(error.statusCode)
         return c.json({ error: error.message })
      }
      
      // Fallback
      c.status(500)
      return c.json({ error: 'Internal server error' })
    }
    ```

3. Use `finally` for cleanup operations:
    ```typescript
    let connection = null
    try {
      connection = await db.connect()
      const result = await connection.query('SELECT * FROM users')
      return c.json(result)
    } catch (error) {
      if (error instanceof Error) {
         c.status(500)
         return c.json({ error: error.message })
      }
      return c.status(500)
    } finally {
      // Always close the connection, regardless of success or failure
      if (connection) {
         await connection.close()
      }
    }
    ```

4. Centralize error handling with middleware:
    ```typescript
    app.onError((err, c) => {
      console.error(`${err}`)
      
      // Type checking for custom errors
      if (err instanceof ApiError) {
         return c.json({ error: err.message }, err.statusCode)
      }
      
      return c.json({ error: 'Internal Server Error' }, 500)
    })
    ```

## Installation
```bash
pnpm add hono
```

## Basic Rules

0. Always using `pnpm` for install packages

1. Always import Hono correctly:
     ```typescript
     import { Hono } from 'hono'
     ```

2. Initialize app instance properly:
     ```typescript
     const app = new Hono()
     ```

3. Use middleware in correct order:
     - Authentication middleware first
     - Logging middleware second
     - Route-specific middleware last

4. Follow route naming conventions:
     - Use lowercase
     - Separate words with hyphens
     - Include version prefix when needed
     ```typescript
     app.get('/api/v1/users', (c) => {})
     ```

5. Error Handling:
     - Always implement error middleware
     - Use proper HTTP status codes
     - Return consistent error formats

6. TypeScript Best Practices:
     - Define request/response types
     - Use zod for validation
     - Leverage Hono's built-in type safety

7. Performance Guidelines:
     - Use caching when appropriate
     - Implement proper CORS settings
     - Keep middleware chain minimal

## Security Considerations

- Always validate user input
- Implement rate limiting
- Use HTTPS in production
- Set appropriate security headers

## Testing

- Write unit tests for routes
- Test middleware separately
- Use Hono's test utilities
- Implement integration tests

Remember to check [official documentation](https://hono.dev) for updates and best practices.