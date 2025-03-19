import { Context, Next } from 'hono';
import { logger } from '../config/logger';

export const loggerMiddleware = async (c: Context, next: Next) => {
    const start = performance.now();
    
    await next();
    
    // Ne pas logger les routes commençant par /ui
    if (!c.req.path.startsWith('/ui')) {
        const end = performance.now();
        const duration = end - start;
        
        logger.info({
            method: c.req.method,
            path: c.req.path,
            status: c.res.status,
            duration: `${duration.toFixed(2)}ms`
        });
    }
};