import { Response } from 'express';
import { z } from 'zod';
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
      allTenantUsers = await User.find(userQuery).select('_id tenantId firstName lastName phone email isActive');
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
      .populate('roomId', 'roomNumber hostelId')
      .populate('tenantId', 'firstName lastName tenantId phone email isActive')
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
    const { tenantId, amount, paymentMethod, paymentDate, description, allocations = [] } = req.body;

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
      description,
      allocations: finalAllocations
    });

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
    // Get total hostels
    const totalHostels = await Hostel.countDocuments({ isActive: true });
    
    // Get total active tenants
    const totalTenants = await Tenancy.countDocuments({ isActive: true });
    
    // Calculate monthly revenue (sum of all tenant shares for current month)
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const activeTenancies = await Tenancy.find({ isActive: true })
      .populate('tenantId', 'firstName lastName')
      .populate('roomId', 'roomNumber capacity rentAmount hostelId')
      .populate('roomId.hostelId', 'name address');
    
    let monthlyRevenue = 0;
    activeTenancies.forEach((tenancy: any) => {
      monthlyRevenue += tenancy.tenantShare || 0;
    });
    
    // Calculate total room capacity
    const rooms = await Room.find({ isActive: true });
    const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    
    // Calculate occupancy rate
    const occupancyRate = totalCapacity > 0 ? ((totalTenants / totalCapacity) * 100).toFixed(1) : '0';
    
    res.json({
      totalHostels,
      totalTenants,
      monthlyRevenue: monthlyRevenue.toFixed(2),
      occupancyRate: `${occupancyRate}%`,
      totalRooms: rooms.length,
      totalCapacity
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
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
