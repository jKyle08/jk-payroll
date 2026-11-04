// ==============================================================================
// JK-PAYROLL: REUSABLE ZOD REQUEST VALIDATION MIDDLEWARE
// File: src/middleware/validate.middleware.ts
// ==============================================================================

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationSchemas {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}

/**
 * Standardized Zod request validation middleware.
 * Accepts either a single Zod schema (validates req.body) or a map for body, query, and params.
 * Returns a standardized JSON 400 response with formatted error details upon failure.
 */
export function validate(schemaOrSchemas: ZodSchema<any> | ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if ('parseAsync' in schemaOrSchemas) {
        // Single schema passed -> validate req.body
        req.body = await schemaOrSchemas.parseAsync(req.body);
      } else {
        // ValidationSchemas map
        if (schemaOrSchemas.body) {
          req.body = await schemaOrSchemas.body.parseAsync(req.body);
        }
        if (schemaOrSchemas.query) {
          req.query = await schemaOrSchemas.query.parseAsync(req.query);
        }
        if (schemaOrSchemas.params) {
          req.params = await schemaOrSchemas.params.parseAsync(req.params);
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal request validation error',
      });
    }
  };
}

export default validate;
