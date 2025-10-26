import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getTenantDues, getPaymentHistory } from '../utils/paymentUtils';
import { Tenancy, MonthlyRent, Bill } from '../models';

// Get tenant's dues and payments
export const getMyDues = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query;
    const tenantId = req.user!._id;

    const dues = await getTenantDues(tenantId, month as string);
    const paymentHistory = await getPaymentHistory(tenantId, 20);

    res.json({
      dues,
      paymentHistory
    });
  } catch (error) {
    console.error('Get my dues error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get tenant's tenancy information
export const getMyTenancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!._id;

    const tenancy = await Tenancy.findOne({ 
      tenantId, 
      isActive: true 
    })
      .populate('roomId', 'roomNumber hostelId')
      .populate('roomId.hostelId', 'name address');

    if (!tenancy) {
      res.status(404).json({ 
        message: 'No active tenancy found' 
      });
      return;
    }

    res.json({ tenancy });
  } catch (error) {
    console.error('Get my tenancy error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get tenant's payment history
export const getMyPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const tenantId = req.user!._id;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const payments = await getPaymentHistory(tenantId, parseInt(limit as string));

    res.json({ payments });
  } catch (error) {
    console.error('Get my payment history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get tenant's monthly rent history
export const getMyRentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const tenantId = req.user!._id;

    const query: any = {
      'tenancy.tenantId': tenantId
    };

    if (year && month) {
      query.period = `${year}-${String(month).padStart(2, '0')}`;
    }

    const rents = await MonthlyRent.find(query)
      .populate('tenancy')
      .sort({ period: -1 });

    res.json({ rents });
  } catch (error) {
    console.error('Get my rent history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get tenant's bill history
export const getMyBillHistory = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!._id;

    const bills = await Bill.find({
      'tenancy.tenantId': tenantId
    })
      .populate('tenancy')
      .sort({ dueDate: -1 });

    res.json({ bills });
  } catch (error) {
    console.error('Get my bill history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get tenant dashboard data
export const getMyDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!._id;

    // Get current tenancy
    const tenancy = await Tenancy.findOne({ 
      tenantId, 
      isActive: true 
    })
      .populate('roomId', 'roomNumber hostelId')
      .populate('roomId.hostelId', 'name address');

    // Get current dues
    const dues = await getTenantDues(tenantId);

    // Get recent payments
    const recentPayments = await getPaymentHistory(tenantId, 5);

    // Get current month rent status
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const currentRent = await MonthlyRent.findOne({
      'tenancy.tenantId': tenantId,
      period: currentPeriod
    }).populate('tenancy');

    res.json({
      tenancy,
      dues,
      recentPayments,
      currentRent
    });
  } catch (error) {
    console.error('Get my dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
