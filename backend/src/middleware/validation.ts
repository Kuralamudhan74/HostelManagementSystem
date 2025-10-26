import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Validation middleware
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: 'Validation error',
          errors: error.errors
        });
        return;
      }
      next(error);
    }
  };
};

// Error handling middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  if (error.name === 'ValidationError') {
    res.status(400).json({
      message: 'Validation error',
      errors: Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }))
    });
    return;
  }

  if (error.name === 'CastError') {
    res.status(400).json({
      message: 'Invalid ID format'
    });
    return;
  }

  if (error.code === 11000) {
    res.status(400).json({
      message: 'Duplicate field value',
      field: Object.keys(error.keyPattern)[0]
    });
    return;
  }

  res.status(error.status || 500).json({
    message: error.message || 'Internal server error'
  });
};

// Not found middleware
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`
  });
};
