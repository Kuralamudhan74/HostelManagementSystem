import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models';
import { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  hashPassword, 
  comparePassword,
  AuthRequest 
} from '../middleware/auth';
import { logAction } from '../utils/auditLogger';

// Validation schemas
const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    role: z.enum(['admin', 'tenant'])
  })
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string()
  })
});

// Login controller
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({ message: 'Account is deactivated' });
      return;
    }

    // Generate tokens
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Log login action
    await logAction(user, 'User', user._id, 'update', null, { lastLogin: new Date() });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Register controller (admin only)
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role
    });

    await user.save();

    // Log user creation
    await logAction(req.user!, 'User', user._id, 'create', null, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Refresh token controller
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token required' });
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Invalid refresh token' });
      return;
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const newAccessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select('-password');
    
    res.json({
      user: {
        id: user!._id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        phone: user!.phone,
        role: user!.role,
        createdAt: user!.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update profile
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone } = req.body;
    const userId = req.user!._id;

    // Get current user data for audit
    const currentUser = await User.findById(userId);
    const beforeData = {
      firstName: currentUser!.firstName,
      lastName: currentUser!.lastName,
      phone: currentUser!.phone
    };

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, phone },
      { new: true }
    ).select('-password');

    // Log profile update
    await logAction(req.user!, 'User', userId, 'update', beforeData, {
      firstName,
      lastName,
      phone
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser!._id,
        email: updatedUser!.email,
        firstName: updatedUser!.firstName,
        lastName: updatedUser!.lastName,
        phone: updatedUser!.phone,
        role: updatedUser!.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout controller
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll just return a success message
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export { loginSchema, registerSchema, refreshTokenSchema };
