import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { log } from '../../config/logger';

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) Object.assign(req, { query: parsed.query });
      if (parsed.params !== undefined) Object.assign(req, { params: parsed.params });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        log.warn('Zod Validation Error', {
          path: req.originalUrl,
          issues: error.issues,
        });
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      next(error);
    }
  };
