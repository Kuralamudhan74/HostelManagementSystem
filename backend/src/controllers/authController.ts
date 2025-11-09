import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models';
import {
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

// Refresh token schema removed - no longer needed

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6).optional(),
    secretCode: z.string().optional(),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6)
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }).refine((data) => data.currentPassword || data.secretCode, {
    message: "Either current password or secret code is required",
    path: ["currentPassword"]
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

    // Log login action (non-blocking - don't fail login if audit log fails)
    try {
      await logAction(user, 'User', user._id, 'update', null, { lastLogin: new Date() });
    } catch (auditError) {
      console.error('Failed to create audit log for login:', auditError);
      // Continue with login even if audit logging fails
    }

    // Return user data (frontend will store in localStorage)
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error stack:', error?.stack);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Refresh token controller - No longer needed, but keeping for API compatibility
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // No refresh token logic needed
    res.json({
      message: 'Token refresh not required in current setup'
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Token refresh not required' });
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

// Logout controller - Frontend handles clearing localStorage
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Change password controller (with secret code option)
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, secretCode, newPassword } = req.body;
    const userId = req.user!._id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Verify authentication method
    let isAuthenticated = false;

    // Method 1: Verify current password
    if (currentPassword) {
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (isPasswordValid) {
        isAuthenticated = true;
      }
    }

    // Method 2: Verify secret code (93959)
    if (secretCode && secretCode === '93959') {
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      res.status(401).json({ message: 'Invalid current password or secret code' });
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    const oldPasswordHash = user.password;
    user.password = hashedPassword;
    await user.save();

    // Log password change
    await logAction(req.user!, 'User', userId, 'update',
      { passwordChanged: true },
      { passwordChanged: true, timestamp: new Date() }
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export { loginSchema, registerSchema, changePasswordSchema };
