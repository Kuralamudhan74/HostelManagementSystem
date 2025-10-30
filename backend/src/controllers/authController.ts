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

    // Block tenant login for Phase 1
    if (user.role === 'tenant') {
      res.status(401).json({ message: 'Tenant login is disabled. Please contact admin.' });
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
        createdAt: user!.createdAt,
        // Extended profile fields
        fatherName: user!.fatherName,
        dateOfBirth: user!.dateOfBirth,
        whatsappNumber: user!.whatsappNumber,
        permanentAddress: user!.permanentAddress,
        city: user!.city,
        state: user!.state,
        aadharNumber: user!.aadharNumber,
        occupation: user!.occupation,
        collegeCompanyName: user!.collegeCompanyName,
        officeAddress: user!.officeAddress,
        expectedDurationStay: user!.expectedDurationStay,
        emergencyContactName: user!.emergencyContactName,
        emergencyContactNumber: user!.emergencyContactNumber,
        emergencyContactRelation: user!.emergencyContactRelation
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
    const updateData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      fatherName: req.body.fatherName,
      dateOfBirth: req.body.dateOfBirth,
      whatsappNumber: req.body.whatsappNumber,
      permanentAddress: req.body.permanentAddress,
      city: req.body.city,
      state: req.body.state,
      aadharNumber: req.body.aadharNumber,
      occupation: req.body.occupation,
      collegeCompanyName: req.body.collegeCompanyName,
      officeAddress: req.body.officeAddress,
      expectedDurationStay: req.body.expectedDurationStay,
      emergencyContactName: req.body.emergencyContactName,
      emergencyContactNumber: req.body.emergencyContactNumber,
      emergencyContactRelation: req.body.emergencyContactRelation,
    };

    const userId = req.user!._id;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    // Log profile update
    await logAction(req.user!, 'User', userId, 'update', null, updateData);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
