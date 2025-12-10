import { Response } from 'express';
import { z } from 'zod';
import { hashPassword } from '../middleware/auth';
import {
  Hostel,
  Room,
  RoomEBBill,
  Tenancy,
  User,
  MonthlyRent,
  Bill,
  ExpenseCategory,
  Expense,
  Payment,
  PaymentAllocation,
  IHostel,
  IRoom,
  ITenancy,
  IUser
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/auditLogger';
import { recordPaymentWithAllocations, suggestPaymentAllocation } from '../utils/paymentUtils';

// Validation schemas
const createHostelSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    ownerId: z.string().min(1)
  })
});

const createRoomSchema = z.object({
  body: z.object({
    roomNumber: z.string().min(1),
    hostelId: z.string().min(1),
    capacity: z.number().min(1),
    rentAmount: z.number().min(0),
    isAC: z.boolean().optional(),
    bathroomAttached: z.boolean().optional()
  })
});

const addTenantToRoomSchema = z.object({
  body: z.object({
    tenantId: z.string().min(1),
    startDate: z.string().min(1),
    tenantShare: z.number().optional(),
    withFood: z.boolean().optional()
  })
});

const updateTenancySchema = z.object({
  body: z.object({
    roomId: z.string().optional(),
    tenantShare: z.number().optional(),
    startDate: z.string().optional()
  })
});

const recordPaymentSchema = z.object({
  body: z.object({
    tenantId: z.string().min(1),
    amount: z.number().min(0),
    paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque', 'other']),
    paymentDate: z.string().datetime(),
    description: z.string().optional(),
    allocations: z.array(z.object({
      dueId: z.string().min(1),
      dueType: z.enum(['rent', 'bill']),
      amount: z.number().min(0)
    })).optional()
  })
});

const createExpenseSchema = z.object({
  body: z.object({
    hostelId: z.string().min(1),
    categoryId: z.string().min(1),
    amount: z.number().min(0),
    description: z.string().min(1),
    expenseDate: z.string().datetime()
  })
});

// Hostel management
export const createHostel = async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, ownerId } = req.body;

    const hostel = new Hostel({
      name,
      address,
      ownerId
    });

    await hostel.save();

    await logAction(req.user!, 'Hostel', hostel._id, 'create', null, {
      name: hostel.name,
      address: hostel.address,
      ownerId: hostel.ownerId
    });

    res.status(201).json({
      message: 'Hostel created successfully',
      hostel
    });
  } catch (error) {
    console.error('Create hostel error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getHostels = async (req: AuthRequest, res: Response) => {
  try {
    const hostels = await Hostel.find({ isActive: true })
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ hostels });
  } catch (error) {
    console.error('Get hostels error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteHostel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { hostelId } = req.params;

    const hostel = await Hostel.findById(hostelId);
    
    if (!hostel) {
      res.status(404).json({ message: 'Hostel not found' });
      return;
    }

    // Check if hostel has any active rooms with tenants
    const rooms = await Room.find({ hostelId, isActive: true });
    
    for (const room of rooms) {
      const activeTenancies = await Tenancy.countDocuments({
        roomId: room._id,
        isActive: true
      });

      if (activeTenancies > 0) {
        res.status(400).json({ 
          message: 'Cannot delete hostel with active tenants. Please remove or reassign all tenants first.'
        });
        return;
      }
    }

    // Set hostel to inactive instead of actually deleting
    hostel.isActive = false;
    await hostel.save();

    // Set all rooms to inactive
    await Room.updateMany({ hostelId }, { isActive: false });

    await logAction(req.user!, 'Hostel', hostel._id, 'delete', {
      name: hostel.name,
      address: hostel.address
    }, null);

    res.json({
      message: 'Hostel deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete hostel error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Room management
export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomNumber, hostelId, capacity, rentAmount, isAC, bathroomAttached } = req.body;

    console.log('Creating room with data:', { roomNumber, hostelId, capacity, rentAmount });

    // Validate input
    if (!roomNumber || !hostelId || !capacity || !rentAmount) {
      res.status(400).json({ 
        message: 'Missing required fields',
        required: ['roomNumber', 'hostelId', 'capacity', 'rentAmount']
      });
      return;
    }

    const room = new Room({
      roomNumber,
      hostelId,
      capacity,
      rentAmount,
      isAC: isAC || false,
      bathroomAttached: bathroomAttached || false
    });

    await room.save();
    console.log('Room saved successfully:', room._id);

    // Update hostel room count
    const updatedHostel = await Hostel.findByIdAndUpdate(hostelId, {
      $inc: { totalRooms: 1 }
    }, { new: true });

    if (!updatedHostel) {
      console.error('Hostel not found:', hostelId);
      res.status(404).json({ message: 'Hostel not found' });
      return;
    }

    console.log('Hostel room count updated:', updatedHostel.totalRooms);

    await logAction(req.user!, 'Room', room._id, 'create', null, {
      roomNumber: room.roomNumber,
      hostelId: room.hostelId,
      capacity: room.capacity,
      rentAmount: room.rentAmount
    });

    res.status(201).json({
      message: 'Room created successfully',
      room
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getRooms = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.query;

    const query: any = { isActive: true };
    if (hostelId) {
      query.hostelId = hostelId;
    }

    const rooms = await Room.find(query)
      .populate('hostelId', 'name address')
      .sort({ roomNumber: 1 });

    res.json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { roomNumber, capacity, rentAmount, isAC, bathroomAttached } = req.body;

    const room = await Room.findById(roomId);

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    // Store old values for audit log
    const oldData = {
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      rentAmount: room.rentAmount,
      isAC: room.isAC,
      bathroomAttached: room.bathroomAttached
    };

    // Update fields if provided
    if (roomNumber !== undefined) room.roomNumber = roomNumber;
    if (capacity !== undefined) room.capacity = capacity;
    if (rentAmount !== undefined) room.rentAmount = rentAmount;
    if (isAC !== undefined) room.isAC = isAC;
    if (bathroomAttached !== undefined) room.bathroomAttached = bathroomAttached;

    await room.save();

    await logAction(req.user!, 'Room', room._id, 'update', oldData, {
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      rentAmount: room.rentAmount,
      isAC: room.isAC,
      bathroomAttached: room.bathroomAttached
    });

    // Populate hostel details for response
    const updatedRoom = await Room.findById(roomId).populate('hostelId', 'name address');

    res.json({
      message: 'Room updated successfully',
      room: updatedRoom
    });
  } catch (error: any) {
    console.error('Update room error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const deleteRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    // Check if room has any active tenants
    const activeTenancies = await Tenancy.countDocuments({
      roomId: room._id,
      isActive: true
    });

    if (activeTenancies > 0) {
      res.status(400).json({
        message: 'Cannot delete room with active tenants. Please remove all tenants first.'
      });
      return;
    }

    // Set room to inactive instead of actually deleting
    room.isActive = false;
    await room.save();

    // Update hostel room count
    await Hostel.findByIdAndUpdate(room.hostelId, {
      $inc: { totalRooms: -1 }
    });

    await logAction(req.user!, 'Room', room._id, 'delete', {
      roomNumber: room.roomNumber,
      hostelId: room.hostelId
    }, null);

    res.json({
      message: 'Room deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete room error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Tenant management
export const addTenantToRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { tenantId, startDate, tenantShare } = req.body;

    console.log('Adding tenant to room:', { roomId, tenantId, startDate, tenantShare });

    // Get the tenant user
    const tenantUser = await User.findById(tenantId);
    if (!tenantUser) {
      res.status(404).json({ 
        message: 'Tenant not found' 
      });
      return;
    }

    // Check if tenant is already in an active tenancy
    const existingTenancy = await Tenancy.findOne({
      tenantId,
      isActive: true
    });

    if (existingTenancy) {
      res.status(400).json({ 
        message: 'Tenant is already assigned to a room' 
      });
      return;
    }

    // Check room capacity
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ 
        message: 'Room not found' 
      });
      return;
    }

    const currentTenantsCount = await Tenancy.countDocuments({
      roomId,
      isActive: true
    });

    if (currentTenantsCount >= room.capacity) {
      res.status(400).json({ 
        message: 'Room is at full capacity' 
      });
      return;
    }

    // Reactivate tenant if they were inactive (past tenant)
    if (!tenantUser.isActive) {
      tenantUser.isActive = true;
      await tenantUser.save();
      console.log(`Reactivated tenant ${tenantUser.firstName} ${tenantUser.lastName}`);
    }

    const tenancy = new Tenancy({
      roomId,
      tenantId,
      startDate: new Date(startDate),
      tenantShare: tenantShare || undefined,
      withFood: req.body.withFood || false
    });

    await tenancy.save();

    await logAction(req.user!, 'Tenancy', tenancy._id, 'create', null, {
      roomId: tenancy.roomId,
      tenantId: tenancy.tenantId,
      startDate: tenancy.startDate,
      tenantShare: tenancy.tenantShare
    });

    res.status(201).json({
      message: 'Tenant added to room successfully',
      tenancy
    });
  } catch (error: any) {
    console.error('Add tenant to room error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const endTenancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenancyId } = req.params;

    const tenancy = await Tenancy.findById(tenancyId);

    if (!tenancy) {
      res.status(404).json({
        message: 'Tenancy not found'
      });
      return;
    }

    // Set tenancy to inactive
    tenancy.isActive = false;
    tenancy.endDate = new Date();
    await tenancy.save();

    await logAction(req.user!, 'Tenancy', tenancy._id, 'update', {
      isActive: true,
      endDate: null
    }, {
      isActive: false,
      endDate: tenancy.endDate
    });

    res.json({
      message: 'Tenancy ended successfully',
      tenancy
    });
  } catch (error: any) {
    console.error('End tenancy error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const updateTenancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenancyId } = req.params;
    const { roomId, tenantShare, startDate } = req.body;

    const tenancy = await Tenancy.findById(tenancyId);

    if (!tenancy) {
      res.status(404).json({
        message: 'Tenancy not found'
      });
      return;
    }

    // Store old values for audit log
    const oldData = {
      roomId: tenancy.roomId,
      tenantShare: tenancy.tenantShare,
      startDate: tenancy.startDate
    };

    // Update fields if provided
    if (roomId !== undefined) {
      // Validate the new room exists
      const room = await Room.findById(roomId);
      if (!room) {
        res.status(404).json({
          message: 'Room not found'
        });
        return;
      }
      tenancy.roomId = roomId as any;
    }

    if (tenantShare !== undefined) {
      tenancy.tenantShare = tenantShare;
    }

    if (startDate !== undefined) {
      tenancy.startDate = new Date(startDate);
    }

    await tenancy.save();

    await logAction(req.user!, 'Tenancy', tenancy._id, 'update', oldData, {
      roomId: tenancy.roomId,
      tenantShare: tenancy.tenantShare,
      startDate: tenancy.startDate
    });

    // Populate the updated tenancy with room and hostel details
    const updatedTenancy = await Tenancy.findById(tenancyId)
      .populate({
        path: 'roomId',
        populate: {
          path: 'hostelId'
        }
      })
      .populate('tenantId');

    res.json({
      message: 'Tenancy updated successfully',
      tenancy: updatedTenancy
    });
  } catch (error: any) {
    console.error('Update tenancy error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update tenancy EB bill (admin only)
export const updateTenancyEBBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenancyId } = req.params;
    const { currentMonthEBBill } = req.body;

    if (currentMonthEBBill === undefined || currentMonthEBBill === null) {
      res.status(400).json({ message: 'EB bill amount is required' });
      return;
    }

    if (currentMonthEBBill < 0) {
      res.status(400).json({ message: 'EB bill amount cannot be negative' });
      return;
    }

    const tenancy = await Tenancy.findById(tenancyId);

    if (!tenancy) {
      res.status(404).json({ message: 'Tenancy not found' });
      return;
    }

    // Store old EB bill for audit log
    const oldEBBill = tenancy.currentMonthEBBill || 0;

    // Update EB bill
    tenancy.currentMonthEBBill = currentMonthEBBill;
    await tenancy.save();

    // Log the change
    await logAction(
      req.user!,
      'Tenancy',
      tenancyId,
      'update',
      { currentMonthEBBill: oldEBBill },
      { currentMonthEBBill: currentMonthEBBill }
    );

    res.json({
      message: 'EB bill updated successfully',
      currentMonthEBBill: tenancy.currentMonthEBBill
    });
  } catch (error: any) {
    console.error('Update EB bill error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update tenancy previous rent due (admin only)
export const updateTenancyPreviousRentDue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenancyId } = req.params;
    const { previousRentDue } = req.body;

    if (previousRentDue === undefined || previousRentDue === null) {
      res.status(400).json({ message: 'Previous rent due amount is required' });
      return;
    }

    if (previousRentDue < 0) {
      res.status(400).json({ message: 'Previous rent due amount cannot be negative' });
      return;
    }

    const tenancy = await Tenancy.findById(tenancyId);

    if (!tenancy) {
      res.status(404).json({ message: 'Tenancy not found' });
      return;
    }

    // Store old previous rent due for audit log
    const oldPreviousRentDue = tenancy.previousRentDue || 0;

    // Update previous rent due
    tenancy.previousRentDue = previousRentDue;
    await tenancy.save();

    // Log the change
    await logAction(
      req.user!,
      'Tenancy',
      tenancyId,
      'update',
      { previousRentDue: oldPreviousRentDue },
      { previousRentDue: previousRentDue }
    );

    res.json({
      message: 'Previous rent due updated successfully',
      previousRentDue: tenancy.previousRentDue
    });
  } catch (error: any) {
    console.error('Update previous rent due error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getTenants = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      hostelId, 
      room, 
      name, 
      month, 
      active = 'true',
      page = '1',
      limit = '10',
      includeUnassigned = 'false'
    } = req.query;

    // Get all tenant users if includeUnassigned is true
    // Filter by active status if specified
    let allTenantUsers: any[] = [];
    if (includeUnassigned === 'true') {
      const userQuery: any = { role: 'tenant' };
      if (active === 'true') {
        userQuery.isActive = true;
      } else if (active === 'false') {
        userQuery.isActive = false;
      }
      // Include ALL profile fields for CSV export (exclude only password)
      allTenantUsers = await User.find(userQuery).select('-password');
    }

    const query: any = {};

    if (hostelId) {
      query['room.hostelId'] = hostelId;
    }

    if (room) {
      query['room.roomNumber'] = { $regex: room, $options: 'i' };
    }

    if (name) {
      query['tenant.firstName'] = { $regex: name, $options: 'i' };
    }

    if (active === 'true') {
      query.isActive = true;
    } else if (active === 'false') {
      query.isActive = false;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const tenancies = await Tenancy.find(query)
      .populate('roomId', 'roomNumber hostelId isAC bathroomAttached')
      .populate({
        path: 'tenantId',
        select: '-password' // Include all fields except password
      })
      .populate('roomId.hostelId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Tenancy.countDocuments(query);

    res.json({
      tenancies,
      allTenantUsers: allTenantUsers,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Payment management
export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      tenantId, 
      amount, 
      paymentMethod, 
      paymentDate, 
      paymentPeriodStart,
      paymentPeriodEnd,
      description, 
      paymentType = 'full',
      remainingAmount = 0,
      allocations = [] 
    } = req.body;

    let finalAllocations = allocations;

    // If no allocations provided, auto-allocate to current month dues
    if (!allocations || allocations.length === 0) {
      // Get current month dues
      const currentDate = new Date();
      const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Find active tenancy
      const activeTenancy = await Tenancy.findOne({ tenantId, isActive: true });
      
      if (activeTenancy) {
        // Get current month rent
        const currentRent = await MonthlyRent.findOne({
          tenancyId: activeTenancy._id,
          period: currentPeriod
        });

        // Get EB bill for this room
        const roomEBBill = await RoomEBBill.findOne({
          roomId: activeTenancy.roomId,
          period: currentPeriod
        });

        // Calculate total due (rent + EB share)
        const activeTenantsCount = await Tenancy.countDocuments({
          roomId: activeTenancy.roomId,
          isActive: true
        });
        const ebShare = roomEBBill ? roomEBBill.amount / activeTenantsCount : 0;
        const baseRent = currentRent?.amount || 0;
        const totalDue = baseRent + ebShare;
        const alreadyPaid = currentRent?.amountPaid || 0;
        const remainingDue = totalDue - alreadyPaid;

        finalAllocations = [];
        let remainingAmount = amount;

        // Allocate to rent (this includes the base rent, and we'll treat EB as part of rent)
        if (currentRent && remainingDue > 0) {
          const allocateAmount = Math.min(remainingAmount, remainingDue);
          
          finalAllocations.push({
            dueId: currentRent._id.toString(),
            dueType: 'rent',
            amount: allocateAmount
          });
        }
      }
    }

    // Use the allocation function to record payment
    const payment = await recordPaymentWithAllocations({
      tenantId,
      amount,
      paymentMethod,
      paymentDate: new Date(paymentDate),
      paymentPeriodStart: paymentPeriodStart ? new Date(paymentPeriodStart) : undefined,
      paymentPeriodEnd: paymentPeriodEnd ? new Date(paymentPeriodEnd) : undefined,
      description,
      paymentType: paymentType || 'full',
      remainingAmount: paymentType === 'partial' ? (remainingAmount || 0) : 0,
      allocations: finalAllocations
    });

    // If payment is marked as "full", set the tenant's current month EB bill to 0
    // This indicates that when rent is fully paid, EB is also considered paid
    if (paymentType === 'full') {
      const activeTenancy = await Tenancy.findOne({ tenantId, isActive: true });
      if (activeTenancy && (activeTenancy.currentMonthEBBill || 0) > 0) {
        activeTenancy.currentMonthEBBill = 0;
        await activeTenancy.save();
      }
    }

    await logAction(req.user!, 'Payment', payment._id, 'create', null, {
      tenantId,
      amount,
      paymentMethod,
      paymentDate,
      allocations: finalAllocations
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment
    });
  } catch (error: any) {
    console.error('Record payment error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const suggestPaymentAllocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, amount } = req.query;

    if (!tenantId || !amount) {
      res.status(400).json({ 
        message: 'Tenant ID and amount are required' 
      });
      return;
    }

    const suggestions = await suggestPaymentAllocation(
      tenantId as string,
      parseFloat(amount as string)
    );

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggest payment allocations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      tenantId,
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    const query: any = {};

    if (tenantId) {
      query.tenantId = tenantId;
    }

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate as string);
      if (endDate) query.paymentDate.$lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const payments = await Payment.find(query)
      .populate('tenantId', 'firstName lastName email')
      .populate('receiptAttachmentId')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete payment permanently
export const deletePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    // Log the payment data before deleting
    await logAction(req.user!, 'Payment', payment._id, 'delete', {
      tenantId: payment.tenantId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate
    }, null);

    // Delete all payment allocations associated with this payment
    await PaymentAllocation.deleteMany({ paymentId: payment._id });

    // Delete the payment record
    await Payment.findByIdAndDelete(paymentId);

    res.json({
      message: 'Payment deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Expense management
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, categoryId, amount, description, expenseDate } = req.body;

    console.log('Creating expense:', { hostelId, categoryId, amount, description, expenseDate });

    const expense = new Expense({
      hostelId,
      categoryId,
      amount,
      description,
      expenseDate: new Date(expenseDate)
    });

    await expense.save();

    await logAction(req.user!, 'Expense', expense._id, 'create', null, {
      hostelId: expense.hostelId,
      categoryId: expense.categoryId,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate
    });

    res.status(201).json({
      message: 'Expense created successfully',
      expense
    });
  } catch (error: any) {
    console.error('Create expense error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getExpenseCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await ExpenseCategory.find({ isActive: true })
      .sort({ name: 1 });

    res.json({ categories });
  } catch (error) {
    console.error('Get expense categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createExpenseCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;

    const category = new ExpenseCategory({
      name,
      description
    });

    await category.save();

    await logAction(req.user!, 'ExpenseCategory', category._id, 'create', null, {
      name: category.name,
      description: category.description
    });

    res.status(201).json({
      message: 'Expense category created successfully',
      category
    });
  } catch (error) {
    console.error('Create expense category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      hostelId, 
      categoryId, 
      startDate, 
      endDate, 
      page = '1', 
      limit = '50' 
    } = req.query;

    const query: any = {};

    if (hostelId) {
      query.hostelId = hostelId;
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate as string);
      if (endDate) query.expenseDate.$lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const expenses = await Expense.find(query)
      .populate('hostelId', 'name address')
      .populate('categoryId', 'name description')
      .populate('attachmentId')
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Expense.countDocuments(query);

    res.json({
      expenses,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Get expenses error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getTenantProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    
    const user = await User.findById(tenantId).select('-password');
    
    if (!user) {
      res.status(404).json({ message: 'Tenant not found' });
      return;
    }
    
    res.json({
      user
    });
  } catch (error: any) {
    console.error('Get tenant profile error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update tenant profile (admin only)
export const updateTenantProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
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
      tenantId: req.body.tenantId, // Allow updating tenant ID
    };

    const user = await User.findById(tenantId);
    
    if (!user) {
      res.status(404).json({ message: 'Tenant not found' });
      return;
    }

    if (user.role !== 'tenant') {
      res.status(400).json({ message: 'Can only update tenant profiles' });
      return;
    }

    // Store old data for audit log
    const oldData = {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      // ... other fields
    };

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      tenantId,
      updateData,
      { new: true }
    ).select('-password');

    // Log profile update
    await logAction(req.user!, 'User', tenantId, 'update', oldData, updateData);

    res.json({
      message: 'Tenant profile updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Update tenant profile error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update tenant advance amount (admin only)
export const updateTenantAdvance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { advanceAmount } = req.body;

    if (advanceAmount === undefined || advanceAmount === null) {
      res.status(400).json({ message: 'Advance amount is required' });
      return;
    }

    if (advanceAmount < 0) {
      res.status(400).json({ message: 'Advance amount cannot be negative' });
      return;
    }

    const user = await User.findById(tenantId);

    if (!user) {
      res.status(404).json({ message: 'Tenant not found' });
      return;
    }

    if (user.role !== 'tenant') {
      res.status(400).json({ message: 'Can only update advance for tenants' });
      return;
    }

    // Store old advance amount for audit log
    const oldAdvance = user.advanceAmount || 0;

    // Update advance amount
    user.advanceAmount = advanceAmount;
    await user.save();

    // Log the change
    await logAction(
      req.user!,
      'User',
      tenantId,
      'update',
      { advanceAmount: oldAdvance },
      { advanceAmount: advanceAmount }
    );

    res.json({
      message: 'Advance amount updated successfully',
      advanceAmount: user.advanceAmount
    });
  } catch (error: any) {
    console.error('Update tenant advance error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Create tenant (admin only)
export const createTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      phone,
      tenantId: providedTenantId,
      fatherName,
      dateOfBirth,
      whatsappNumber,
      permanentAddress,
      city,
      state,
      aadharNumber,
      occupation,
      collegeCompanyName,
      officeAddress,
      expectedDurationStay,
      emergencyContactName,
      emergencyContactNumber,
      emergencyContactRelation,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phone) {
      res.status(400).json({ message: 'First name, last name, and phone are required' });
      return;
    }

    // Check for duplicate phone or Aadhar
    if (phone) {
      const existingUserByPhone = await User.findOne({ phone });
      if (existingUserByPhone) {
        res.status(400).json({ message: 'User with this phone number already exists' });
        return;
      }
    }

    if (aadharNumber) {
      const existingUserByAadhar = await User.findOne({ aadharNumber });
      if (existingUserByAadhar) {
        res.status(400).json({ message: 'User with this Aadhar number already exists' });
        return;
      }
    }

    // Generate tenant ID if not provided
    let tenantId = providedTenantId;
    if (!tenantId) {
      // Find all tenants with numeric tenantIds
      const allTenants = await User.find({ 
        role: 'tenant',
        tenantId: { $exists: true, $ne: null }
      }).select('tenantId');

      let maxId = 0;
      for (const tenant of allTenants) {
        if (tenant.tenantId) {
          const id = parseInt(tenant.tenantId, 10);
          if (!isNaN(id) && id > maxId) {
            maxId = id;
          }
        }
      }
      tenantId = (maxId + 1).toString();
    }

    // Generate placeholder email and password (tenants don't log in)
    const email = `tenant${tenantId}@hostel.local`;
    const placeholderPassword = `placeholder_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const hashedPassword = await hashPassword(placeholderPassword);

    // Create user
    const newUser = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      tenantId,
      fatherName,
      dateOfBirth,
      whatsappNumber,
      permanentAddress,
      city,
      state,
      aadharNumber,
      occupation,
      collegeCompanyName,
      officeAddress,
      expectedDurationStay,
      emergencyContactName,
      emergencyContactNumber,
      emergencyContactRelation: emergencyContactRelation || (emergencyContactName ? 'Family' : undefined),
      role: 'tenant',
      isActive: true,
    });

    await newUser.save();

    // Log action
    await logAction(req.user!, 'User', newUser._id, 'create', null, {
      tenantId: newUser.tenantId,
      role: 'tenant',
      source: 'Manual Creation'
    });

    res.status(201).json({
      message: 'Tenant created successfully',
      user: newUser
    });
  } catch (error: any) {
    console.error('Create tenant error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update tenant active status
export const updateTenantStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(tenantId);
    
    if (!user) {
      res.status(404).json({ message: 'Tenant not found' });
      return;
    }

    const oldStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    // If making inactive, end all active tenancies
    if (!isActive) {
      await Tenancy.updateMany(
        { tenantId: user._id, isActive: true },
        { 
          isActive: false,
          endDate: new Date()
        }
      );
    }

    await logAction(req.user!, 'User', user._id, 'update',
      { isActive: oldStatus },
      { isActive });

    res.json({
      message: 'Tenant status updated successfully',
      user
    });
  } catch (error: any) {
    console.error('Update tenant status error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Delete tenant (soft delete)
export const deleteTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;

    const user = await User.findById(tenantId);

    if (!user) {
      res.status(404).json({ message: 'Tenant not found' });
      return;
    }

    if (user.role !== 'tenant') {
      res.status(400).json({ message: 'Can only delete tenant users' });
      return;
    }

    const oldStatus = user.isActive;

    // Soft delete - set isActive to false
    user.isActive = false;
    await user.save();

    // End all active tenancies automatically
    const activeTenancies = await Tenancy.find({ tenantId: user._id, isActive: true });

    for (const tenancy of activeTenancies) {
      tenancy.isActive = false;
      tenancy.endDate = new Date();
      await tenancy.save();

      console.log(`Ended tenancy ${tenancy._id} for deleted tenant ${user.firstName} ${user.lastName}`);
    }

    // Log the deletion
    await logAction(req.user!, 'User', user._id, 'delete',
      { isActive: oldStatus },
      { isActive: false, deletedAt: new Date() });

    res.json({
      message: `Tenant ${user.firstName} ${user.lastName} deleted successfully`,
      tenanciesEnded: activeTenancies.length
    });
  } catch (error: any) {
    console.error('Delete tenant error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Permanent delete tenant - ONLY for past tenants (removes all records from DB)
export const permanentlyDeleteTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;

    const user = await User.findById(tenantId);

    if (!user) {
      res.status(404).json({ message: 'Tenant not found' });
      return;
    }

    if (user.role !== 'tenant') {
      res.status(400).json({ message: 'Can only delete tenant users' });
      return;
    }

    // Check if tenant has any active tenancies
    const activeTenancies = await Tenancy.find({ tenantId: user._id, isActive: true });
    if (activeTenancies.length > 0) {
      res.status(400).json({
        message: 'Cannot permanently delete an active tenant. Please end their tenancy first.',
        activeTenancies: activeTenancies.length
      });
      return;
    }

    // Log the permanent deletion BEFORE deleting
    await logAction(req.user!, 'User', user._id, 'delete',
      {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        tenantId: user.tenantId
      },
      { permanentlyDeleted: true, deletedAt: new Date() });

    const userName = `${user.firstName} ${user.lastName}`;
    const userId = user._id;

    // Permanent deletion - remove ALL records from database
    // 1. Delete all tenancies
    const tenanciesDeleted = await Tenancy.deleteMany({ tenantId: userId });
    console.log(`Deleted ${tenanciesDeleted.deletedCount} tenancies for tenant ${userName}`);

    // 2. Delete all payments
    const paymentsDeleted = await Payment.deleteMany({ tenantId: userId });
    console.log(`Deleted ${paymentsDeleted.deletedCount} payments for tenant ${userName}`);

    // 3. Delete all monthly rents associated with this tenant's tenancies
    const rentsDeleted = await MonthlyRent.deleteMany({
      tenancyId: { $in: (await Tenancy.find({ tenantId: userId })).map(t => t._id) }
    });
    console.log(`Deleted ${rentsDeleted.deletedCount} rent records for tenant ${userName}`);

    // 4. Delete all bills associated with this tenant
    const billsDeleted = await Bill.deleteMany({ tenantId: userId });
    console.log(`Deleted ${billsDeleted.deletedCount} bills for tenant ${userName}`);

    // 5. Delete payment allocations (cleanup orphaned records)
    const paymentAllocationsDeleted = await PaymentAllocation.deleteMany({
      paymentId: { $in: (await Payment.find({ tenantId: userId })).map(p => p._id) }
    });
    console.log(`Deleted ${paymentAllocationsDeleted.deletedCount} payment allocations for tenant ${userName}`);

    // 6. Finally, delete the user record
    await User.findByIdAndDelete(userId);
    console.log(`Permanently deleted user ${userName} (ID: ${userId})`);

    res.json({
      message: `Tenant ${userName} and all associated records permanently deleted`,
      deletedRecords: {
        tenancies: tenanciesDeleted.deletedCount,
        payments: paymentsDeleted.deletedCount,
        rents: rentsDeleted.deletedCount,
        bills: billsDeleted.deletedCount,
        paymentAllocations: paymentAllocationsDeleted.deletedCount,
        user: 1
      }
    });
  } catch (error: any) {
    console.error('Permanent delete tenant error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// EB Bill Management
export const createOrUpdateEBBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId, amount, period } = req.body;

    if (!roomId || amount === undefined || !period) {
      res.status(400).json({ message: 'Missing required fields: roomId, amount, period' });
      return;
    }

    // Check if EB bill exists for this room and period
    const existingBill = await RoomEBBill.findOne({ roomId, period });

    let ebBill;
    if (existingBill) {
      existingBill.amount = amount;
      ebBill = await existingBill.save();
      await logAction(req.user!, 'RoomEBBill', ebBill._id, 'update', { amount: existingBill.amount }, { amount });
    } else {
      ebBill = new RoomEBBill({ roomId, amount, period });
      await ebBill.save();
      await logAction(req.user!, 'RoomEBBill', ebBill._id, 'create', null, { roomId, amount, period });
    }

    res.json({
      message: 'EB Bill created/updated successfully',
      ebBill
    });
  } catch (error: any) {
    console.error('Create/Update EB Bill error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getRoomEBBills = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId, period } = req.query;

    const query: any = {};
    if (roomId) query.roomId = roomId;
    if (period) query.period = period;

    const ebBills = await RoomEBBill.find(query)
      .populate('roomId', 'roomNumber hostelId')
      .sort({ period: -1 });

    res.json({ ebBills });
  } catch (error: any) {
    console.error('Get room EB Bills error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update rent payment status
export const updateRentPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rentId } = req.params;
    const { isPaidInFull } = req.body;

    const rent = await MonthlyRent.findById(rentId);
    
    if (!rent) {
      res.status(404).json({ message: 'Rent not found' });
      return;
    }

    const oldValue = rent.isPaidInFull;
    rent.isPaidInFull = isPaidInFull;
    
    // Update status based on payment
    if (isPaidInFull && rent.amountPaid >= rent.amount) {
      rent.status = 'paid';
    } else if (rent.amountPaid > 0 && rent.amountPaid < rent.amount) {
      rent.status = 'partial';
    } else {
      rent.status = 'due';
    }

    await rent.save();
    
    await logAction(req.user!, 'MonthlyRent', rent._id, 'update', 
      { isPaidInFull: oldValue, status: rent.status }, 
      { isPaidInFull, status: rent.status });

    res.json({
      message: 'Rent payment status updated successfully',
      rent
    });
  } catch (error: any) {
    console.error('Update rent payment status error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { hostelId } = req.query;

    // Get total hostels (always show all hostels count)
    const totalHostels = await Hostel.countDocuments({ isActive: true });

    // Build query for hostel-specific filtering
    let roomQuery: any = { isActive: true };
    if (hostelId && hostelId !== 'all') {
      roomQuery.hostelId = hostelId;
    }

    // Get rooms based on filter
    const rooms = await Room.find(roomQuery);
    const roomIds = rooms.map(room => room._id);

    // Get total active tenants (filtered by hostel if specified)
    let tenancyQuery: any = { isActive: true };
    if (hostelId && hostelId !== 'all') {
      tenancyQuery.roomId = { $in: roomIds };
    }
    const totalTenants = await Tenancy.countDocuments(tenancyQuery);

    // Calculate monthly revenue (sum of all tenant shares for current month)
    const activeTenancies = await Tenancy.find(tenancyQuery)
      .populate('tenantId', 'firstName lastName')
      .populate('roomId', 'roomNumber capacity rentAmount hostelId');

    let monthlyRevenue = 0;
    activeTenancies.forEach((tenancy: any) => {
      monthlyRevenue += tenancy.tenantShare || 0;
    });

    // Calculate room statistics
    const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    const totalRooms = rooms.length;
    const occupiedRooms = totalTenants;
    const freeRooms = totalCapacity - occupiedRooms;

    res.json({
      totalHostels,
      totalTenants,
      monthlyRevenue: monthlyRevenue.toFixed(2),
      totalRooms,
      totalCapacity,
      occupiedRooms,
      freeRooms
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get financial overview
export const getFinancialOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year, hostelId, months = '3' } = req.query;
    
    // Default to current year if not specified
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const monthsCount = parseInt(months as string) || 3;
    
    // Calculate date range
    const startDate = new Date(targetYear, 0, 1); // January 1st of target year
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59); // December 31st of target year
    
    // If months is specified and less than 12, calculate the range for last N months
    let actualStartDate = startDate;
    let actualEndDate = endDate;
    
    if (monthsCount < 12) {
      // Get last N months from end of target year
      actualEndDate = new Date(targetYear, 11, 31, 23, 59, 59);
      const startMonth = Math.max(0, 11 - (monthsCount - 1));
      actualStartDate = new Date(targetYear, startMonth, 1);
    }
    
    // Get all payments - filter by payment date or payment period
    const payments = await Payment.find({
      $or: [
        { paymentDate: { $gte: actualStartDate, $lte: actualEndDate } },
        { paymentPeriodStart: { $gte: actualStartDate, $lte: actualEndDate } },
        { paymentPeriodEnd: { $gte: actualStartDate, $lte: actualEndDate } }
      ]
    });
    
    // Get all expenses
    const expensesQuery: any = {
      expenseDate: { $gte: actualStartDate, $lte: actualEndDate }
    };
    
    if (hostelId) {
      expensesQuery.hostelId = hostelId;
    }
    
    const expenses = await Expense.find(expensesQuery)
      .populate('hostelId', 'name address');
    
    // Get all hostels (or specific hostel if filtered) - we'll initialize with hostels from data
    const hostelsQuery: any = { isActive: true };
    if (hostelId) {
      hostelsQuery._id = hostelId;
    }
    const hostels = await Hostel.find(hostelsQuery);
    
    // Get all active tenancies with populated room and hostel for faster lookup
    const allTenancies = await Tenancy.find({ isActive: true })
      .populate({
        path: 'roomId',
        populate: {
          path: 'hostelId'
        }
      });
    
    // Create a map for quick lookup: tenantId -> hostelId
    const tenantToHostelMap: Record<string, string> = {};
    allTenancies.forEach((tenancy: any) => {
      const tenantId = tenancy.tenantId?.toString();
      const hostelIdFromTenancy = tenancy.roomId?.hostelId?._id?.toString();
      if (tenantId && hostelIdFromTenancy) {
        tenantToHostelMap[tenantId] = hostelIdFromTenancy;
      }
    });
    
    // Helper function to get month key (YYYY-MM)
    const getMonthKey = (date: Date): string => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };
    
    // Initialize data structures
    const monthlyData: Record<string, Record<string, { income: number; expense: number; profit: number }>> = {};
    const hostelTotals: Record<string, { name: string; totalIncome: number; totalExpense: number; totalProfit: number }> = {};
    
    // Initialize hostel totals with all hostels from query
    hostels.forEach((hostel) => {
      const hostelIdStr = hostel._id.toString();
      hostelTotals[hostelIdStr] = {
        name: hostel.name,
        totalIncome: 0,
        totalExpense: 0,
        totalProfit: 0
      };
    });
    
    // Process payments (Income)
    for (const payment of payments) {
      const paymentTenantId = (payment.tenantId as any)?._id?.toString() || payment.tenantId?.toString();
      const hostelIdFromTenancy = tenantToHostelMap[paymentTenantId];
      
      if (hostelIdFromTenancy && (!hostelId || hostelId === hostelIdFromTenancy)) {
        // Determine which month this payment belongs to
        // Priority: paymentPeriodStart > paymentDate
        let paymentMonth: Date;
        if (payment.paymentPeriodStart) {
          paymentMonth = new Date(payment.paymentPeriodStart);
        } else {
          paymentMonth = new Date(payment.paymentDate);
        }
        
        const monthKey = getMonthKey(paymentMonth);
        
        // Only process if within date range
        if (paymentMonth >= actualStartDate && paymentMonth <= actualEndDate) {
          // Initialize hostel total if not exists
          if (!hostelTotals[hostelIdFromTenancy]) {
            const hostel = await Hostel.findById(hostelIdFromTenancy);
            if (hostel) {
              hostelTotals[hostelIdFromTenancy] = {
                name: hostel.name,
                totalIncome: 0,
                totalExpense: 0,
                totalProfit: 0
              };
            } else {
              continue; // Skip if hostel not found
            }
          }
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {};
          }
          
          if (!monthlyData[monthKey][hostelIdFromTenancy]) {
            monthlyData[monthKey][hostelIdFromTenancy] = { income: 0, expense: 0, profit: 0 };
          }
          
          monthlyData[monthKey][hostelIdFromTenancy].income += payment.amount;
          
          // Update hostel totals
          hostelTotals[hostelIdFromTenancy].totalIncome += payment.amount;
        }
      }
    }
    
    // Process expenses
    for (const expense of expenses) {
      const expenseDate = new Date(expense.expenseDate);
      const monthKey = getMonthKey(expenseDate);
      const hostelIdStr = (expense.hostelId as any)._id?.toString() || expense.hostelId?.toString();
      
      // Initialize hostel total if not exists
      if (!hostelTotals[hostelIdStr]) {
        const hostel = await Hostel.findById(hostelIdStr);
        if (hostel) {
          hostelTotals[hostelIdStr] = {
            name: hostel.name,
            totalIncome: 0,
            totalExpense: 0,
            totalProfit: 0
          };
        } else {
          continue; // Skip if hostel not found
        }
      }
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      
      if (!monthlyData[monthKey][hostelIdStr]) {
        monthlyData[monthKey][hostelIdStr] = { income: 0, expense: 0, profit: 0 };
      }
      
      monthlyData[monthKey][hostelIdStr].expense += expense.amount;
      
      // Update hostel totals
      hostelTotals[hostelIdStr].totalExpense += expense.amount;
    }
    
    // Calculate profit and format data
    const chartData: Array<{
      month: string;
      hostelId: string;
      hostelName: string;
      income: number;
      expense: number;
      profit: number;
    }> = [];
    
    Object.keys(monthlyData).sort().forEach((monthKey) => {
      Object.keys(monthlyData[monthKey]).forEach((hid) => {
        const data = monthlyData[monthKey][hid];
        data.profit = data.income - data.expense;
        
        chartData.push({
          month: monthKey,
          hostelId: hid,
          hostelName: hostelTotals[hid]?.name || 'Unknown',
          income: data.income,
          expense: data.expense,
          profit: data.profit
        });
      });
    });
    
    // Calculate totals for each hostel
    Object.keys(hostelTotals).forEach((hid) => {
      hostelTotals[hid].totalProfit = hostelTotals[hid].totalIncome - hostelTotals[hid].totalExpense;
    });
    
    // Format profitability table
    const profitabilityTable = Object.keys(hostelTotals).map((hid) => ({
      hostelId: hid,
      hostelName: hostelTotals[hid].name,
      totalIncome: hostelTotals[hid].totalIncome,
      totalExpense: hostelTotals[hid].totalExpense,
      profit: hostelTotals[hid].totalProfit,
      status: hostelTotals[hid].totalProfit >= 0 ? 'Profit' : 'Loss'
    }));
    
    res.json({
      chartData,
      profitabilityTable,
      summary: {
        totalIncome: Object.values(hostelTotals).reduce((sum, h) => sum + h.totalIncome, 0),
        totalExpense: Object.values(hostelTotals).reduce((sum, h) => sum + h.totalExpense, 0),
        totalProfit: Object.values(hostelTotals).reduce((sum, h) => sum + h.totalProfit, 0)
      },
      filters: {
        year: targetYear,
        hostelId: hostelId || null,
        months: monthsCount
      }
    });
  } catch (error: any) {
    console.error('Get financial overview error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update payment
export const updatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const {
      amount,
      paymentMethod,
      paymentDate,
      paymentPeriodStart,
      paymentPeriodEnd,
      description,
      paymentType,
      remainingAmount
    } = req.body;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    // Store old data for audit log
    const oldData = {
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      paymentPeriodStart: payment.paymentPeriodStart,
      paymentPeriodEnd: payment.paymentPeriodEnd,
      description: payment.description,
      paymentType: payment.paymentType,
      remainingAmount: payment.remainingAmount
    };

    // Update fields
    if (amount !== undefined) payment.amount = amount;
    if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
    if (paymentDate !== undefined) payment.paymentDate = new Date(paymentDate);
    if (paymentPeriodStart !== undefined) payment.paymentPeriodStart = new Date(paymentPeriodStart);
    if (paymentPeriodEnd !== undefined) payment.paymentPeriodEnd = new Date(paymentPeriodEnd);
    if (description !== undefined) payment.description = description;
    if (paymentType !== undefined) payment.paymentType = paymentType;
    if (remainingAmount !== undefined) payment.remainingAmount = remainingAmount;

    await payment.save();

    // If payment type is changed to "full", set the tenant's current month EB bill to 0
    if (paymentType === 'full') {
      const activeTenancy = await Tenancy.findOne({ tenantId: payment.tenantId, isActive: true });
      if (activeTenancy && (activeTenancy.currentMonthEBBill || 0) > 0) {
        activeTenancy.currentMonthEBBill = 0;
        await activeTenancy.save();
      }
    }

    // Log the update
    await logAction(req.user!, 'Payment', payment._id, 'update', oldData, {
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      paymentPeriodStart: payment.paymentPeriodStart,
      paymentPeriodEnd: payment.paymentPeriodEnd,
      description: payment.description,
      paymentType: payment.paymentType,
      remainingAmount: payment.remainingAmount
    });

    // Populate tenant info for response
    const populatedPayment = await Payment.findById(paymentId)
      .populate('tenantId', 'firstName lastName email');

    res.json({
      message: 'Payment updated successfully',
      payment: populatedPayment
    });
  } catch (error: any) {
    console.error('Update payment error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update expense
export const updateExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { expenseId } = req.params;
    const { hostelId, categoryId, amount, description, expenseDate } = req.body;

    const expense = await Expense.findById(expenseId);

    if (!expense) {
      res.status(404).json({ message: 'Expense not found' });
      return;
    }

    // Store old data for audit log
    const oldData = {
      hostelId: expense.hostelId,
      categoryId: expense.categoryId,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate
    };

    // Update fields
    if (hostelId !== undefined) expense.hostelId = hostelId;
    if (categoryId !== undefined) expense.categoryId = categoryId;
    if (amount !== undefined) expense.amount = amount;
    if (description !== undefined) expense.description = description;
    if (expenseDate !== undefined) expense.expenseDate = new Date(expenseDate);

    await expense.save();

    // Log the update
    await logAction(req.user!, 'Expense', expense._id, 'update', oldData, {
      hostelId: expense.hostelId,
      categoryId: expense.categoryId,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate
    });

    // Populate hostel and category info for response
    const populatedExpense = await Expense.findById(expenseId)
      .populate('hostelId', 'name address')
      .populate('categoryId', 'name description');

    res.json({
      message: 'Expense updated successfully',
      expense: populatedExpense
    });
  } catch (error: any) {
    console.error('Update expense error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Delete expense
export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId);

    if (!expense) {
      res.status(404).json({ message: 'Expense not found' });
      return;
    }

    // Log the expense data before deleting
    await logAction(req.user!, 'Expense', expense._id, 'delete', {
      hostelId: expense.hostelId,
      categoryId: expense.categoryId,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate
    }, null);

    // Delete the expense record
    await Expense.findByIdAndDelete(expenseId);

    res.json({
      message: 'Expense deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update hostel
export const updateHostel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { hostelId } = req.params;
    const { name, address } = req.body;

    const hostel = await Hostel.findById(hostelId);

    if (!hostel) {
      res.status(404).json({ message: 'Hostel not found' });
      return;
    }

    // Store old data for audit log
    const oldData = {
      name: hostel.name,
      address: hostel.address
    };

    // Update fields
    if (name !== undefined) hostel.name = name;
    if (address !== undefined) hostel.address = address;

    await hostel.save();

    // Log the update
    await logAction(req.user!, 'Hostel', hostel._id, 'update', oldData, {
      name: hostel.name,
      address: hostel.address
    });

    res.json({
      message: 'Hostel updated successfully',
      hostel
    });
  } catch (error: any) {
    console.error('Update hostel error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export {
  createHostelSchema,
  createRoomSchema,
  addTenantToRoomSchema,
  recordPaymentSchema,
  createExpenseSchema
};
