import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, ArrowLeft, Plus, Calendar, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import apiClient from '../../services/api';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { formatCurrency } from '../../utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  calculateCurrentRentPeriod, 
  calculateCurrentRentPeriodWithPayments,
  calculateNextPeriodFromManualEnd,
  formatDateForDisplay,
  getPaymentStatus,
  isPaymentPeriodValid,
  normalizeDate,
  type PaymentStatusInfo
} from '../../utils/rentPeriodUtils';

const paymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque', 'other']),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentPeriodStart: z.string().optional(),
  paymentPeriodEnd: z.string().optional(),
  description: z.string().optional(),
  paymentType: z.enum(['full', 'partial']),
  remainingAmount: z.number().min(0).optional(),
}).refine((data) => {
  // Validate that period start is before period end if both are provided
  if (data.paymentPeriodStart && data.paymentPeriodEnd) {
    const start = new Date(data.paymentPeriodStart);
    const end = new Date(data.paymentPeriodEnd);
    return start < end;
  }
  return true;
}, {
  message: 'Period Start must be before Period End',
  path: ['paymentPeriodEnd'],
}).refine((data) => {
  // If partial payment, remaining amount is required
  if (data.paymentType === 'partial') {
    return data.remainingAmount !== undefined && data.remainingAmount >= 0;
  }
  return true;
}, {
  message: 'Remaining amount is required for partial payments',
  path: ['remainingAmount'],
});

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Check if we should open payment modal from navigation state
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(
    location.state?.openPaymentModal || false
  );
  
  const [filterTenantId, setFilterTenantId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Debounced filter values
  const [debouncedFilterTenantId, setDebouncedFilterTenantId] = useState<string>('');
  const [debouncedStartDate, setDebouncedStartDate] = useState<string>('');
  const [debouncedEndDate, setDebouncedEndDate] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, reset, control, watch, setValue } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentPeriodStart: '',
      paymentPeriodEnd: '',
      paymentType: 'full' as 'full' | 'partial',
      remainingAmount: 0,
    }
  });

  const paymentType = watch('paymentType');
  const paymentAmount = watch('amount');

  const selectedTenantId = watch('tenantId');
  const periodStart = watch('paymentPeriodStart');
  const periodEnd = watch('paymentPeriodEnd');

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterTenantId(filterTenantId);
    }, 500);
    return () => clearTimeout(timer);
  }, [filterTenantId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStartDate(filterStartDate);
    }, 500);
    return () => clearTimeout(timer);
  }, [filterStartDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEndDate(filterEndDate);
    }, 500);
    return () => clearTimeout(timer);
  }, [filterEndDate]);

  // Fetch payments
  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['admin/payments', debouncedFilterTenantId, debouncedStartDate, debouncedEndDate],
    queryFn: () => apiClient.getPayments({
      tenantId: debouncedFilterTenantId || undefined,
      startDate: debouncedStartDate || undefined,
      endDate: debouncedEndDate || undefined,
      limit: 100,
    }),
    enabled: true,
  });

  // Fetch tenants with tenancy data
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.getTenants({ includeUnassigned: true, limit: 100 }),
  });

  // Fetch payments to check if tenant has paid for current period
  const { data: allPaymentsData } = useQuery({
    queryKey: ['admin/payments/all'],
    queryFn: () => apiClient.getPayments({ limit: 1000 }),
  });

  // Calculate rent period when tenant is selected
  const rentPeriodInfo = useMemo(() => {
    if (!selectedTenantId || !tenantsData?.tenancies) return null;
    
    const tenancy = tenantsData.tenancies.find((t: any) => {
      const tenantId = t.tenantId?.id || t.tenantId?._id || t.tenantId;
      return tenantId === selectedTenantId && t.isActive;
    });

    if (!tenancy || !tenancy.startDate) return null;

    const checkInDate = new Date(tenancy.startDate);
    
    // Get all payments for this tenant
    const tenantPayments = (allPaymentsData?.payments || []).filter((payment: any) => {
      const paymentTenantId = payment.tenantId?.id || payment.tenantId?._id || payment.tenantId;
      return paymentTenantId === selectedTenantId;
    });
    
    // Calculate current period based on payment history (if any)
    // This will use the last payment period to determine the current cycle
    const period = calculateCurrentRentPeriodWithPayments(checkInDate, tenantPayments);
    
    // Check if tenant has paid for the CURRENT rent period
    const hasPayment = tenantPayments.some((payment: any) => {
      if (!payment.paymentPeriodStart || !payment.paymentPeriodEnd) return false;
      
      const payStart = new Date(payment.paymentPeriodStart);
      const payEnd = new Date(payment.paymentPeriodEnd);
      
      // Check if payment period overlaps with current rent period
      return isPaymentPeriodValid(
        payStart,
        payEnd,
        period.startDate,
        period.endDate
      );
    });

    const statusInfo = getPaymentStatus(period.startDate, period.endDate, hasPayment);

    return {
      period,
      statusInfo,
      tenancy,
      checkInDate,
    };
  }, [selectedTenantId, tenantsData, allPaymentsData]);

  // Auto-fill period dates when tenant is selected
  useEffect(() => {
    if (rentPeriodInfo && !periodStart && !periodEnd) {
      const startDateStr = rentPeriodInfo.period.startDate.toISOString().split('T')[0];
      const endDateStr = rentPeriodInfo.period.endDate.toISOString().split('T')[0];
      setValue('paymentPeriodStart', startDateStr);
      setValue('paymentPeriodEnd', endDateStr);
    }
  }, [rentPeriodInfo, periodStart, periodEnd, setValue]);

  // Calculate next period when manual dates are changed
  const nextPeriodInfo = useMemo(() => {
    // Only calculate if both period start and end are manually set
    if (!periodStart || !periodEnd) return null;
    
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    
    // Validate: periodStart must be before periodEnd
    if (start >= end) return null;
    
    // Always calculate next period based on the manual period end
    // This ensures dynamic adjustment even if dates match initially
    const nextPeriod = calculateNextPeriodFromManualEnd(end);
    return {
      startDate: nextPeriod.startDate,
      endDate: nextPeriod.endDate,
    };
  }, [periodStart, periodEnd]);

  const handleRecordPayment = async (data: any) => {
    try {
      // Validate period dates if both are provided
      if (data.paymentPeriodStart && data.paymentPeriodEnd) {
        const periodStart = new Date(data.paymentPeriodStart);
        const periodEnd = new Date(data.paymentPeriodEnd);
        if (periodStart >= periodEnd) {
          toast.error('Period Start must be before Period End');
          return;
        }
      }
      
      console.log('Recording payment with data:', data);
      
      // Record payment with period information
      const formattedData = {
        tenantId: data.tenantId,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        paymentDate: new Date(data.paymentDate).toISOString(),
        paymentPeriodStart: data.paymentPeriodStart ? new Date(data.paymentPeriodStart).toISOString() : undefined,
        paymentPeriodEnd: data.paymentPeriodEnd ? new Date(data.paymentPeriodEnd).toISOString() : undefined,
        description: data.description || '',
        paymentType: data.paymentType || 'full',
        remainingAmount: data.paymentType === 'partial' ? Number(data.remainingAmount || 0) : 0,
        allocations: [], // Start with empty allocations
      };

      console.log('Formatted payment data:', formattedData);
      
      await apiClient.recordPayment(formattedData);

      toast.success('Payment recorded successfully');
      setIsRecordPaymentModalOpen(false);
      reset();
      // Invalidate all payment-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin/payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin/payments/all'] });
      // Also invalidate tenants query to refresh payment status on tenant cards
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    } catch (error: any) {
      console.error('Record payment error:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const payments = paymentsData?.payments || [];
  const amount = watch('amount');

  const paymentMethodLabels = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    other: 'Other',
  };

  // Get unique tenants from tenancies for dropdown
  const uniqueTenants = useMemo(() => {
    if (!tenantsData?.tenancies) return [];
    
    const tenantMap = new Map();
    tenantsData.tenancies.forEach((tenancy: any) => {
      const tenant = tenancy.tenantId;
      if (tenant && (tenant.id || tenant._id)) {
        const tenantId = tenant.id || tenant._id;
        if (!tenantMap.has(tenantId)) {
          tenantMap.set(tenantId, tenant);
        }
      }
    });

    return Array.from(tenantMap.values());
  }, [tenantsData]);

  // Auto-select tenant if passed via navigation state
  useEffect(() => {
    if (location.state?.selectedTenantId && uniqueTenants.length > 0) {
      const tenant = uniqueTenants.find((t: any) => 
        (t.id || t._id) === location.state.selectedTenantId
      );
      if (tenant) {
        setValue('tenantId', tenant.id || tenant._id);
      }
    }
    // Clear navigation state
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state, uniqueTenants, setValue]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
                <p className="text-sm text-gray-600">Record and manage tenant payments</p>
              </div>
            </div>
            <Button
              onClick={() => setIsRecordPaymentModalOpen(true)}
              variant="primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Tenant
              </label>
              <select
                value={filterTenantId}
                onChange={(e) => setFilterTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Tenants</option>
                {uniqueTenants.map((tenant: any) => (
                  <option key={tenant.id || tenant._id} value={tenant.id || tenant._id}>
                    {tenant.firstName} {tenant.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Payments List */}
        {isLoadingPayments ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                <p className="text-gray-600 mb-6">Get started by recording your first payment</p>
                <Button onClick={() => setIsRecordPaymentModalOpen(true)} variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Record First Payment
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment: any) => (
                      <motion.tr
                        key={payment.id || payment._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {payment.tenantId?.firstName} {payment.tenantId?.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {paymentMethodLabels[payment.paymentMethod as keyof typeof paymentMethodLabels]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDateForDisplay(new Date(payment.paymentDate))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">
                            {payment.paymentPeriodStart && payment.paymentPeriodEnd ? (
                              <>
                                {formatDateForDisplay(new Date(payment.paymentPeriodStart))} - {formatDateForDisplay(new Date(payment.paymentPeriodEnd))}
                              </>
                            ) : (
                              'N/A'
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">
                            {payment.description || 'N/A'}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => {
          setIsRecordPaymentModalOpen(false);
          reset();
        }}
        title="Record New Payment"
      >
        <form onSubmit={handleSubmit(handleRecordPayment)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant *
            </label>
            <select
              {...register('tenantId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a tenant</option>
              {uniqueTenants.map((tenant: any) => (
                <option key={tenant.id || tenant._id} value={tenant.id || tenant._id}>
                  {tenant.firstName} {tenant.lastName} ({tenant.email})
                </option>
              ))}
            </select>
            {errors.tenantId && (
              <p className="text-red-500 text-xs mt-1">{errors.tenantId.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">{errors.amount.message as string}</p>
            )}
          </div>

          {/* Payment Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Type *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="full"
                  {...register('paymentType')}
                  onChange={(e) => {
                    register('paymentType').onChange(e);
                    setValue('remainingAmount', 0);
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Fully Paid</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="partial"
                  {...register('paymentType')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Partially Paid</span>
              </label>
            </div>
          </div>

          {/* Remaining Payment Field - Only show for partial payments */}
          {paymentType === 'partial' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remaining Payment (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                {...register('remainingAmount', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                min="0"
              />
              {errors.remainingAmount && (
                <p className="text-red-500 text-xs mt-1">{errors.remainingAmount.message as string}</p>
              )}
              {paymentAmount && paymentType === 'partial' && (
                <p className="text-xs text-gray-500 mt-1">
                  Total Due: {formatCurrency(paymentAmount + (watch('remainingAmount') || 0))}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method *
            </label>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <select {...field} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              )}
            />
            {errors.paymentMethod && (
              <p className="text-red-500 text-xs mt-1">{errors.paymentMethod.message as string}</p>
            )}
          </div>

          {/* Rent Period Information */}
          {rentPeriodInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-blue-900">
                  Current Rent Period
                </label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${rentPeriodInfo.statusInfo.bgColorClass} ${rentPeriodInfo.statusInfo.colorClass}`}>
                  {rentPeriodInfo.statusInfo.label}
                </span>
              </div>
              <p className="text-sm text-blue-800 mb-3">
                {formatDateForDisplay(rentPeriodInfo.period.startDate)} → {formatDateForDisplay(rentPeriodInfo.period.endDate)}
              </p>
              <p className="text-xs text-blue-700">
                Check-in Date: {formatDateForDisplay(rentPeriodInfo.checkInDate)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              {...register('paymentDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            {errors.paymentDate && (
              <p className="text-red-500 text-xs mt-1">{errors.paymentDate.message as string}</p>
            )}
          </div>

          {/* Rent Period Dates (Manual Override) */}
          {rentPeriodInfo && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rent Period Dates (Optional - Auto-filled)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Period Start
                    </label>
                    <input
                      type="date"
                      {...register('paymentPeriodStart')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Period End
                    </label>
                    <input
                      type="date"
                      {...register('paymentPeriodEnd')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                {nextPeriodInfo && periodStart && periodEnd && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-900 font-medium mb-1">
                      Next due payment for this tenant starts on: <span className="font-semibold">{formatDateForDisplay(nextPeriodInfo.startDate)}</span>
                    </p>
                    {nextPeriodInfo.endDate && (
                      <p className="text-xs text-blue-700 italic">
                        Next rent cycle: {formatDateForDisplay(nextPeriodInfo.startDate)} → {formatDateForDisplay(nextPeriodInfo.endDate)}
                      </p>
                    )}
                  </div>
                )}
                {periodStart && periodEnd && new Date(periodStart) >= new Date(periodEnd) && (
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ Period Start must be before Period End
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsRecordPaymentModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PaymentsPage;
