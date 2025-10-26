import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, 
  DollarSign, 
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
import { formatCurrency, formatDate, getStatusColor } from '../../utils';
import LoadingSpinner from '../../components/LoadingSpinner';

const TenantDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['tenant-dashboard'],
    queryFn: () => apiClient.getMyDashboard(),
  });

  const { data: dues, isLoading: duesLoading } = useQuery({
    queryKey: ['tenant-dues'],
    queryFn: () => apiClient.getMyDues(),
  });

  if (isLoading || duesLoading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  const tenancy = dashboardData?.tenancy;
  const duesData = dues?.dues;
  const recentPayments = dashboardData?.recentPayments || [];
  const currentRent = dashboardData?.currentRent;

  const stats = [
    {
      title: 'Current Room',
      value: tenancy?.roomId?.roomNumber || 'N/A',
      icon: Home,
      color: 'bg-blue-500',
    },
    {
      title: 'Monthly Rent',
      value: formatCurrency(tenancy?.tenantShare || 0),
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Outstanding Balance',
      value: formatCurrency(duesData?.totalOutstanding || 0),
      icon: AlertCircle,
      color: 'bg-red-500',
    },
    {
      title: 'Tenancy Start',
      value: tenancy?.startDate ? formatDate(tenancy.startDate) : 'N/A',
      icon: Calendar,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.firstName} {user?.lastName}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              className="bg-white rounded-lg shadow-sm p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Rent Status */}
          <motion.div
            className="bg-white rounded-lg shadow-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Rent Status</h3>
            {currentRent ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Period</span>
                  <span className="font-medium">{currentRent.period}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Amount Due</span>
                  <span className="font-medium">{formatCurrency(currentRent.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Amount Paid</span>
                  <span className="font-medium">{formatCurrency(currentRent.amountPaid)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentRent.status)}`}>
                    {currentRent.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Due Date</span>
                  <span className="font-medium">{formatDate(currentRent.dueDate)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No current rent information available</p>
            )}
          </motion.div>

          {/* Outstanding Dues */}
          <motion.div
            className="bg-white rounded-lg shadow-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Outstanding Dues</h3>
            <div className="space-y-3">
              {duesData?.rents?.slice(0, 3).map((rent: any) => (
                <div key={rent.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Rent - {rent.period}</p>
                      <p className="text-xs text-gray-500">Due: {formatDate(rent.dueDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(rent.amount - rent.amountPaid)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(rent.status)}`}>
                      {rent.status}
                    </span>
                  </div>
                </div>
              ))}
              {duesData?.bills?.slice(0, 2).map((bill: any) => (
                <div key={bill.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{bill.title}</p>
                      <p className="text-xs text-gray-500">Due: {formatDate(bill.dueDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(bill.amount - bill.amountPaid)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(bill.status)}`}>
                      {bill.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!duesData?.rents?.length && !duesData?.bills?.length) && (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No outstanding dues</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Payments */}
          <motion.div
            className="bg-white rounded-lg shadow-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
            <div className="space-y-3">
              {recentPayments.slice(0, 5).map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.paymentMethod.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(payment.paymentDate)}
                  </span>
                </div>
              ))}
              {!recentPayments.length && (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent payments</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Tenancy Information */}
          <motion.div
            className="bg-white rounded-lg shadow-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenancy Information</h3>
            {tenancy ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Hostel</span>
                  <span className="font-medium">{tenancy.roomId?.hostelId?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Room</span>
                  <span className="font-medium">{tenancy.roomId?.roomNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Start Date</span>
                  <span className="font-medium">{formatDate(tenancy.startDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monthly Share</span>
                  <span className="font-medium">{formatCurrency(tenancy.tenantShare || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tenancy.isActive ? 'active' : 'inactive')}`}>
                    {tenancy.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No tenancy information available</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
