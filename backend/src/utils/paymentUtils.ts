import { MonthlyRent, Bill, Payment, PaymentAllocation, RoomEBBill, Tenancy } from '../models';

export interface PaymentAllocationData {
  dueId: string;
  dueType: 'rent' | 'bill';
  amount: number;
}

export interface PaymentRecordData {
  tenantId: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'other';
  paymentDate: Date;
  paymentPeriodStart?: Date;
  paymentPeriodEnd?: Date;
  description?: string;
  allocations: PaymentAllocationData[];
}

// Calculate outstanding balance for a tenant
export const calculateOutstandingBalance = async (tenantId: string): Promise<number> => {
  const rents = await MonthlyRent.find({
    'tenancy.tenantId': tenantId,
    status: { $in: ['due', 'partial'] }
  }).populate('tenancy');

  const bills = await Bill.find({
    'tenancy.tenantId': tenantId,
    status: { $in: ['due', 'partial'] }
  }).populate('tenancy');

  let totalOutstanding = 0;

  rents.forEach(rent => {
    totalOutstanding += rent.amount - rent.amountPaid;
  });

  bills.forEach(bill => {
    totalOutstanding += bill.amount - bill.amountPaid;
  });

  return totalOutstanding;
};

// Record payment with allocations
export const recordPaymentWithAllocations = async (data: PaymentRecordData) => {
  try {
    // Create payment record
    const payment = new Payment({
      tenantId: data.tenantId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate,
      paymentPeriodStart: data.paymentPeriodStart,
      paymentPeriodEnd: data.paymentPeriodEnd,
      description: data.description
    });

    await payment.save();

    // Process allocations
    for (const allocation of data.allocations) {
      const allocationRecord = new PaymentAllocation({
        paymentId: payment._id,
        dueId: allocation.dueId,
        dueType: allocation.dueType,
        allocatedAmount: allocation.amount
      });

      await allocationRecord.save();

      // Update the due record
      if (allocation.dueType === 'rent') {
        const rent = await MonthlyRent.findById(allocation.dueId);
        if (rent) {
          const newAmountPaid = rent.amountPaid + allocation.amount;
          const newStatus = newAmountPaid >= rent.amount ? 'paid' : 'partial';
          
          await MonthlyRent.findByIdAndUpdate(
            allocation.dueId,
            {
              amountPaid: newAmountPaid,
              status: newStatus
            }
          );
        }
      } else if (allocation.dueType === 'bill') {
        const bill = await Bill.findById(allocation.dueId);
        if (bill) {
          const newAmountPaid = bill.amountPaid + allocation.amount;
          const newStatus = newAmountPaid >= bill.amount ? 'paid' : 'partial';
          
          await Bill.findByIdAndUpdate(
            allocation.dueId,
            {
              amountPaid: newAmountPaid,
              status: newStatus
            }
          );
        }
      }
    }

    return payment;
  } catch (error) {
    console.error('Error recording payment with allocations:', error);
    throw error;
  }
};

// Get payment history for a tenant
export const getPaymentHistory = async (tenantId: string, limit: number = 50) => {
  return Payment.find({ tenantId })
    .populate('receiptAttachmentId')
    .sort({ paymentDate: -1 })
    .limit(limit);
};

// Get dues for a tenant (rents, bills, and EB bills)
export const getTenantDues = async (tenantId: string, month?: string) => {
  const query: any = {
    'tenancy.tenantId': tenantId,
    status: { $in: ['due', 'partial'] }
  };

  if (month) {
    query.period = month;
  }

  const rents = await MonthlyRent.find(query).populate('tenancy');
  const bills = await Bill.find({
    'tenancy.tenantId': tenantId,
    status: { $in: ['due', 'partial'] }
  }).populate('tenancy');

  // Get active tenancy to find the room
  const activeTenancy = await Tenancy.findOne({ tenantId, isActive: true }).populate('roomId');
  
  let ebBill = null;
  let tenantEbAmount = 0;
  
  if (activeTenancy && activeTenancy.roomId) {
    const period = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const roomEBBill = await RoomEBBill.findOne({ 
      roomId: activeTenancy.roomId._id, 
      period 
    }).populate('roomId');
    
    if (roomEBBill) {
      // Count number of active tenants in this room
      const activeTenantsCount = await Tenancy.countDocuments({
        roomId: activeTenancy.roomId._id,
        isActive: true
      });
      
      // Divide EB bill equally among all active tenants in the room
      tenantEbAmount = roomEBBill.amount / activeTenantsCount;
      
      // Create a copy of the bill with tenant's share
      ebBill = {
        ...roomEBBill.toObject(),
        amount: tenantEbAmount,
        totalRoomEB: roomEBBill.amount,
        roommatesCount: activeTenantsCount
      };
    }
  }

  return {
    rents,
    bills,
    ebBill,
    tenantEbAmount,
    totalOutstanding: await calculateOutstandingBalance(tenantId)
  };
};

// Suggest payment allocation (oldest dues first)
export const suggestPaymentAllocation = async (
  tenantId: string,
  paymentAmount: number
): Promise<PaymentAllocationData[]> => {
  const dues = await getTenantDues(tenantId);
  const allocations: PaymentAllocationData[] = [];
  let remainingAmount = paymentAmount;

  // Sort dues by due date (oldest first)
  const allDues = [
    ...dues.rents.map(rent => ({
      id: rent._id,
      type: 'rent' as const,
      amount: rent.amount - rent.amountPaid,
      dueDate: rent.dueDate
    })),
    ...dues.bills.map(bill => ({
      id: bill._id,
      type: 'bill' as const,
      amount: bill.amount - bill.amountPaid,
      dueDate: bill.dueDate
    }))
  ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  for (const due of allDues) {
    if (remainingAmount <= 0) break;

    const allocationAmount = Math.min(remainingAmount, due.amount);
    allocations.push({
      dueId: due.id,
      dueType: due.type,
      amount: allocationAmount
    });

    remainingAmount -= allocationAmount;
  }

  return allocations;
};
