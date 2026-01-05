import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

/**
 * Express middleware for validating request bodies using Zod schemas
 *
 * @param schema - Zod schema to validate the request body against
 * @returns Express middleware function
 *
 * @example
 * app.post('/api/colors', validateBody(DyeArraySchema), async (req, res) => {
 *   // req.body is now validated and typed
 * })
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and validate the request body
      // If successful, replace req.body with the validated/transformed data
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        console.warn('🚫 Validation error:', error.errors)
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        })
      } else {
        // Handle unexpected errors
        console.error('❌ Unexpected validation error:', error)
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        })
      }
    }
  }
}
