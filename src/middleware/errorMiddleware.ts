import { Context, Next } from 'hono';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export const errorMiddleware = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    // Log détaillé de l'erreur dans le terminal
    if (error instanceof Error) {
      logger.error({
        message: 'Request error',
        error: error.message,
        stack: error.stack,
        name: error.name,
        path: c.req.path,
        method: c.req.method
      });
    } else {
      logger.error('Unknown error:', error);
    }

    // Gestion spécifique des erreurs Zod
    if (error instanceof ZodError) {
      return c.json({
        success: false,
        error: {
          name: 'ValidationError',
          message: 'Validation failed',
          issues: error.issues
        }
      }, 400);
    }

    // Gestion spécifique des erreurs Prisma
    if (error instanceof PrismaClientKnownRequestError) {
      return c.json({
        success: false,
        error: {
          name: 'DatabaseError',
          message: error.message,
          code: error.code
        }
      }, 400);
    }

    // Gestion des autres types d'erreurs
    const status = error instanceof Error && error.message.includes('validation') 
      ? 400 
      : 500;

    return c.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        name: error instanceof Error ? error.name : 'UnknownError'
      }
    }, status);
  }
}; 