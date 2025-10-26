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
    startDate: z.string().datetime(),
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
    }))
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
export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomNumber, hostelId, capacity, rentAmount } = req.body;

    const room = new Room({
      roomNumber,
      hostelId,
      capacity,
      rentAmount
    });

    await room.save();

    // Update hostel room count
    await Hostel.findByIdAndUpdate(hostelId, {
      $inc: { totalRooms: 1 }
    });

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
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Internal server error' });
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
      tenantShare
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
  } catch (error) {
    console.error('Add tenant to room error:', error);
    res.status(500).json({ message: 'Internal server error' });
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
      limit = '10'
    } = req.query;

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
    const { tenantId, amount, paymentMethod, paymentDate, description, allocations } = req.body;

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
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
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

// Expense management
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, categoryId, amount, description, expenseDate } = req.body;

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
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
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

export { 
  createHostelSchema, 
  createRoomSchema, 
  addTenantToRoomSchema, 
  recordPaymentSchema, 
  createExpenseSchema 
};
