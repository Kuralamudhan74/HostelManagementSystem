import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, ArrowLeft, Plus, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import apiClient from '../../services/api';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const paymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque', 'other']),
  paymentDate: z.string().min(1, 'Payment date is required'),
  description: z.string().optional(),
});

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [filterTenantId, setFilterTenantId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Debounced filter values
  const [debouncedFilterTenantId, setDebouncedFilterTenantId] = useState<string>('');
  const [debouncedStartDate, setDebouncedStartDate] = useState<string>('');
  const [debouncedEndDate, setDebouncedEndDate] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, reset, control, watch } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
    }
  });

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

  const handleRecordPayment = async (data: any) => {
    try {
      console.log('Recording payment with data:', data);
      
      // Record payment without allocations first
      const formattedData = {
        tenantId: data.tenantId,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        paymentDate: new Date(data.paymentDate).toISOString(),
        description: data.description || '',
        allocations: [], // Start with empty allocations
      };

      console.log('Formatted payment data:', formattedData);
      
      await apiClient.recordPayment(formattedData);

      toast.success('Payment recorded successfully');
      setIsRecordPaymentModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['admin/payments'] });
    } catch (error: any) {
      console.error('Record payment error:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const payments = paymentsData?.payments || [];
  const tenantId = watch('tenantId');
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
                            ${payment.amount.toFixed(2)}
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
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </div>
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
              Amount ($) *
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
