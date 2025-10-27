import { Response } from 'express';
import { z } from 'zod';
import { 
  Hostel, 
  Room, 
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
    rentAmount: z.number().min(0)
  })
});

const addTenantToRoomSchema = z.object({
  body: z.object({
    tenantId: z.string().min(1),
    startDate: z.string().min(1),
    tenantShare: z.number().optional()
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

// Room management
export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomNumber, hostelId, capacity, rentAmount } = req.body;

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
      rentAmount
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

// Tenant management
export const addTenantToRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { tenantId, startDate, tenantShare } = req.body;

    console.log('Adding tenant to room:', { roomId, tenantId, startDate, tenantShare });

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

    const tenancy = new Tenancy({
      roomId,
      tenantId,
      startDate: new Date(startDate),
      tenantShare: tenantShare || undefined
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
    let allTenantUsers: any[] = [];
    if (includeUnassigned === 'true') {
      allTenantUsers = await User.find({ role: 'tenant' }).select('_id email firstName lastName phone isActive');
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
      .populate('tenantId', 'firstName lastName email phone')
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

    // If no allocations, just create the payment
    if (!allocations || allocations.length === 0) {
      const payment = new Payment({
        tenantId,
        amount,
        paymentMethod,
        paymentDate: new Date(paymentDate),
        description
      });

      await payment.save();

      await logAction(req.user!, 'Payment', payment._id, 'create', null, {
        tenantId,
        amount,
        paymentMethod,
        paymentDate,
        description
      });

      res.status(201).json({
        message: 'Payment recorded successfully',
        payment
      });
    } else {
      // If allocations exist, use the allocation function
      const payment = await recordPaymentWithAllocations({
        tenantId,
        amount,
        paymentMethod,
        paymentDate: new Date(paymentDate),
        description,
        allocations
      });

      await logAction(req.user!, 'Payment', payment._id, 'create', null, {
        tenantId,
        amount,
        paymentMethod,
        paymentDate,
        allocations
      });

      res.status(201).json({
        message: 'Payment recorded successfully',
        payment
      });
    }
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

export { 
  createHostelSchema, 
  createRoomSchema, 
  addTenantToRoomSchema, 
  recordPaymentSchema, 
  createExpenseSchema 
};
