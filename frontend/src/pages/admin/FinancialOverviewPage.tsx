import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Download,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  Line,
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import apiClient from '../../services/api';

const FinancialOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedHostelId, setSelectedHostelId] = useState<string>('');
  const [selectedMonths, setSelectedMonths] = useState<number>(3);

  // Fetch hostels
  const { data: hostelsData } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => apiClient.getHostels(),
  });

  // Fetch financial overview data
  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-overview', selectedYear, selectedHostelId, selectedMonths],
    queryFn: () => apiClient.getFinancialOverview({
      year: selectedYear,
      hostelId: selectedHostelId || undefined,
      months: selectedMonths,
    }),
  });

  // Transform chart data for recharts
  const chartData = React.useMemo(() => {
    if (!financialData?.chartData) return [];

    // Group by month
    const monthlyMap: Record<string, {
      month: string;
      monthLabel: string;
      income: number;
      expense: number;
      profit: number;
      [key: string]: string | number;
    }> = {};

    financialData.chartData.forEach((item) => {
      if (!monthlyMap[item.month]) {
        const date = new Date(item.month + '-01');
        monthlyMap[item.month] = {
          month: item.month,
          monthLabel: date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          income: 0,
          expense: 0,
          profit: 0,
        };
      }

      monthlyMap[item.month].income += item.income;
      monthlyMap[item.month].expense += item.expense;
      monthlyMap[item.month].profit += item.profit;
    });

    return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [financialData]);

  // Format currency - using Indian Rupees
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!financialData) return;

    const headers = ['Month', 'Income', 'Expense', 'Profit'];
    const rows = chartData.map((item) => [
      item.monthLabel,
      item.income.toFixed(2),
      item.expense.toFixed(2),
      item.profit.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-overview-${selectedYear}-${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const summary = financialData?.summary || { totalIncome: 0, totalExpense: 0, totalProfit: 0 };
  const profitabilityTable = financialData?.profitabilityTable || [];

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
                <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
                <p className="text-sm text-gray-600">Track income, expenses, and profitability</p>
              </div>
            </div>
            <Button
              onClick={handleExportCSV}
              variant="secondary"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hostel/Building
              </label>
              <select
                value={selectedHostelId}
                onChange={(e) => setSelectedHostelId(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Analysis Period
              </label>
              <select
                value={selectedMonths}
                onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="3">Last 3 Months</option>
                <option value="6">Last 6 Months</option>
                <option value="12">Full Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <motion.div
            className="bg-white rounded-lg shadow-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-lg shadow-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(summary.totalExpense)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            className={`bg-white rounded-lg shadow-sm p-6 ${
              summary.totalProfit >= 0 ? 'border-2 border-green-200' : 'border-2 border-red-200'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(summary.totalProfit)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                summary.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {summary.totalProfit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Chart */}
        {isLoading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <motion.div
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Income vs Expense Trend</h2>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Profit"
                    dot={{ fill: '#3b82f6', r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
                <p className="text-gray-600">
                  There's no financial data for the selected period and filters.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Profitability Table */}
        {profitabilityTable.length > 0 && (
          <motion.div
            className="bg-white rounded-lg shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Profitability Summary by Hostel</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hostel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Income
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Expense
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {profitabilityTable.map((row: any) => (
                    <motion.tr
                      key={row.hostelId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-gray-50 ${
                        row.status === 'Profit' ? 'bg-green-50/30' : 'bg-red-50/30'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {row.hostelName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(row.totalIncome)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-red-600">
                          {formatCurrency(row.totalExpense)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-semibold ${
                            row.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(row.profit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            row.status === 'Profit'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FinancialOverviewPage;

