import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate API key from request headers
 * Checks for x-api-key header and validates against API_KEY environment variable
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'];

    // Check if API key is provided
    if (!apiKey) {
      res.status(401).json({
        message: 'API key required. Please provide x-api-key header.'
      });
      return;
    }

    // Validate API key against environment variable
    if (apiKey !== process.env.API_KEY) {
      res.status(401).json({
        message: 'Invalid API key'
      });
      return;
    }

    // API key is valid, proceed to next middleware
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({
      message: 'Internal server error during API key validation'
    });
  }
};
