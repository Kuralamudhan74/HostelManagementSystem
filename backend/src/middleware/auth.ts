import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models';

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Generate JWT token
export const generateToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  } as jwt.SignOptions);
};

// Generate refresh token
export const generateRefreshToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  } as jwt.SignOptions);
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
};

// Verify refresh token
export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Compare password
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Authentication middleware
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Access token required' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Invalid token or user not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin authorization middleware
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
};

// Tenant authorization middleware
export const requireTenant = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'tenant') {
    res.status(403).json({ message: 'Tenant access required' });
    return;
  }
  next();
};
