import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, ArrowLeft, Plus, Filter, Calendar, Building2, Tag, TrendingDown, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import apiClient from '../../services/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { formatCurrency } from '../../utils';
import { formatDateForDisplay } from '../../utils/rentPeriodUtils';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const expenseSchema = z.object({
  hostelId: z.string().min(1, 'Hostel is required'),
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  expenseDate: z.string().min(1, 'Expense date is required'),
});

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isRecordExpenseModalOpen, setIsRecordExpenseModalOpen] = useState(false);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [filterHostelId, setFilterHostelId] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Debounced filter values
  const [debouncedHostelId, setDebouncedHostelId] = useState<string>('');
  const [debouncedCategoryId, setDebouncedCategoryId] = useState<string>('');
  const [debouncedStartDate, setDebouncedStartDate] = useState<string>('');
  const [debouncedEndDate, setDebouncedEndDate] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: new Date().toISOString().split('T')[0],
    }
  });

  const categoryForm = useForm({
    defaultValues: {
      name: '',
      description: '',
    }
  });

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHostelId(filterHostelId);
    }, 500);
    return () => clearTimeout(timer);
  }, [filterHostelId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategoryId(filterCategoryId);
    }, 500);
    return () => clearTimeout(timer);
  }, [filterCategoryId]);

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

  // Fetch expenses
  const { data: expensesData, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['admin/expenses', debouncedHostelId, debouncedCategoryId, debouncedStartDate, debouncedEndDate],
    queryFn: () => apiClient.getExpenses({
      hostelId: debouncedHostelId || undefined,
      categoryId: debouncedCategoryId || undefined,
      startDate: debouncedStartDate || undefined,
      endDate: debouncedEndDate || undefined,
      limit: 100,
    }),
    enabled: true,
  });

  // Fetch hostels
  const { data: hostelsData } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => apiClient.getHostels(),
  });

  // Fetch expense categories
  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => apiClient.getExpenseCategories(),
  });

  const handleRecordExpense = async (data: any) => {
    try {
      // Format the expense date properly
      const formattedData = {
        ...data,
        expenseDate: new Date(data.expenseDate).toISOString(),
      };
      
      await apiClient.createExpense(formattedData);
      toast.success('Expense recorded successfully');
      setIsRecordExpenseModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['admin/expenses'] });
    } catch (error: any) {
      console.error('Record expense error:', error);
      toast.error(error.response?.data?.message || 'Failed to record expense');
    }
  };

  const handleCreateCategory = async (data: any) => {
    try {
      await apiClient.createExpenseCategory(data);
      toast.success('Expense category created successfully');
      setIsCreateCategoryModalOpen(false);
      categoryForm.reset();
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  const expenses = expensesData?.expenses || [];

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
                <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
                <p className="text-sm text-gray-600">Track and manage hostel expenses</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  // Export expenses to CSV
                  const headers = ['Date', 'Hostel', 'Category', 'Description', 'Amount'];
                  const rows = expenses.map((expense: any) => [
                    formatDateForDisplay(new Date(expense.expenseDate)),
                    expense.hostelId?.name || 'N/A',
                    expense.categoryId?.name || 'N/A',
                    expense.description,
                    expense.amount.toFixed(2),
                  ]);

                  const csvContent = [
                    headers.join(','),
                    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `expenses-export-${new Date().getTime()}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success('Expenses exported successfully');
                }}
                variant="secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => setIsCreateCategoryModalOpen(true)}
                variant="secondary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
              <Button
                onClick={() => setIsRecordExpenseModalOpen(true)}
                variant="primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Expense
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Hostel
              </label>
              <select
                value={filterHostelId}
                onChange={(e) => setFilterHostelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Hostels</option>
                {hostelsData?.hostels?.map((hostel: any) => (
                  <option key={hostel.id || hostel._id} value={hostel.id || hostel._id}>
                    {hostel.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categoriesData?.categories?.map((category: any) => (
                  <option key={category.id || category._id} value={category.id || category._id}>
                    {category.name}
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

        {/* Expenses List */}
        {isLoadingExpenses ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                <p className="text-gray-600 mb-6">Get started by recording your first expense</p>
                <Button onClick={() => setIsRecordExpenseModalOpen(true)} variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Record First Expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hostel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((expense: any) => (
                      <motion.tr
                        key={expense.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDateForDisplay(new Date(expense.expenseDate))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {expense.hostelId?.name || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Tag className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {expense.categoryId?.name || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {expense.description}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-red-600">
                            {formatCurrency(expense.amount)}
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

      {/* Record Expense Modal */}
      <Modal
        isOpen={isRecordExpenseModalOpen}
        onClose={() => {
          setIsRecordExpenseModalOpen(false);
          reset();
        }}
        title="Record New Expense"
      >
        <form onSubmit={handleSubmit(handleRecordExpense)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hostel *
            </label>
            <select
              {...register('hostelId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a hostel</option>
              {hostelsData?.hostels?.map((hostel: any) => (
                <option key={hostel.id || hostel._id} value={hostel.id || hostel._id}>
                  {hostel.name}
                </option>
              ))}
            </select>
            {errors.hostelId && (
              <p className="text-red-500 text-xs mt-1">{errors.hostelId.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              {...register('categoryId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              {categoriesData?.categories?.map((category: any) => (
                <option key={category.id || category._id} value={category.id || category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-red-500 text-xs mt-1">{errors.categoryId.message as string}</p>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter expense description"
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense Date *
            </label>
            <input
              type="date"
              {...register('expenseDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            {errors.expenseDate && (
              <p className="text-red-500 text-xs mt-1">{errors.expenseDate.message as string}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsRecordExpenseModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Record Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        isOpen={isCreateCategoryModalOpen}
        onClose={() => {
          setIsCreateCategoryModalOpen(false);
          categoryForm.reset();
        }}
        title="Create Expense Category"
      >
        <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              {...categoryForm.register('name', { required: 'Category name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Maintenance, Utilities, etc."
            />
            {categoryForm.formState.errors.name && (
              <p className="text-red-500 text-xs mt-1">{categoryForm.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...categoryForm.register('description')}
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
                setIsCreateCategoryModalOpen(false);
                categoryForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PaymentsPage;
