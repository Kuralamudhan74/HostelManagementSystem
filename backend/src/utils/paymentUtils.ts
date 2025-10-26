import { MonthlyRent, Bill, Payment, PaymentAllocation } from '../models';

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
  const session = await Payment.startSession();
  let payment: any;
  
  try {
    await session.withTransaction(async () => {
      // Create payment record
      payment = new Payment({
        tenantId: data.tenantId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        description: data.description
      });

      await payment.save({ session });

      // Process allocations
      for (const allocation of data.allocations) {
        const allocationRecord = new PaymentAllocation({
          paymentId: payment._id,
          dueId: allocation.dueId,
          dueType: allocation.dueType,
          allocatedAmount: allocation.amount
        });

        await allocationRecord.save({ session });

        // Update the due record
        if (allocation.dueType === 'rent') {
          const rent = await MonthlyRent.findById(allocation.dueId).session(session);
          if (rent) {
            const newAmountPaid = rent.amountPaid + allocation.amount;
            const newStatus = newAmountPaid >= rent.amount ? 'paid' : 'partial';
            
            await MonthlyRent.findByIdAndUpdate(
              allocation.dueId,
              {
                amountPaid: newAmountPaid,
                status: newStatus
              },
              { session }
            );
          }
        } else if (allocation.dueType === 'bill') {
          const bill = await Bill.findById(allocation.dueId).session(session);
          if (bill) {
            const newAmountPaid = bill.amountPaid + allocation.amount;
            const newStatus = newAmountPaid >= bill.amount ? 'paid' : 'partial';
            
            await Bill.findByIdAndUpdate(
              allocation.dueId,
              {
                amountPaid: newAmountPaid,
                status: newStatus
              },
              { session }
            );
          }
        }
      }
    });

    return payment;
  } finally {
    await session.endSession();
  }
};

// Get payment history for a tenant
export const getPaymentHistory = async (tenantId: string, limit: number = 50) => {
  return Payment.find({ tenantId })
    .populate('receiptAttachmentId')
    .sort({ paymentDate: -1 })
    .limit(limit);
};

// Get dues for a tenant (rents and bills)
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

  return {
    rents,
    bills,
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
