import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models';

export interface AuthRequest extends Request {
  user?: IUser;
}

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Compare password
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Authentication middleware - NO JWT validation, just get userId from header
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get userId from custom header (set by frontend from localStorage)
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      console.error('No user ID found in headers');
      res.status(401).json({ message: 'User ID required' });
      return;
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      console.error('User not found:', userId);
      res.status(401).json({ message: 'User not found' });
      return;
    }

    if (!user.isActive) {
      console.error('User is not active:', userId);
      res.status(401).json({ message: 'User account is inactive' });
      return;
    }

    console.log('User authenticated:', { id: user._id, email: user.email, role: user.role });
    req.user = user;
    next();
  } catch (error: any) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ message: error.message || 'Invalid user ID' });
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

