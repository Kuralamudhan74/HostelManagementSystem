import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp,
  FileText,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const { data: hostels, isLoading: hostelsLoading } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => apiClient.getHostels(),
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.getTenants({ limit: 10 }),
  });

  const stats = [
    {
      title: 'Total Hostels',
      value: hostels?.hostels?.length || 0,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Tenants',
      value: tenants?.tenancies?.length || 0,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Monthly Revenue',
      value: '$12,500',
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      title: 'Occupancy Rate',
      value: '85%',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Rooms',
      description: 'Add, edit, or view room details',
      icon: Building2,
      href: '/admin/rooms',
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Tenants',
      description: 'View and manage tenant information',
      icon: Users,
      href: '/admin/tenants',
      color: 'bg-green-500',
    },
    {
      title: 'Record Payments',
      description: 'Process tenant payments',
      icon: DollarSign,
      href: '/admin/payments',
      color: 'bg-yellow-500',
    },
    {
      title: 'Manage Expenses',
      description: 'Track hostel expenses',
      icon: FileText,
      href: '/admin/expenses',
      color: 'bg-purple-500',
    },
  ];

  if (hostelsLoading || tenantsLoading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
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

        {/* Quick Actions */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.a
                key={action.title}
                href={action.href}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center mb-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {/* Recent Tenants */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tenants</h3>
            <div className="space-y-3">
              {tenants?.tenancies?.slice(0, 5).map((tenancy: any) => (
                <div key={tenancy.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {tenancy.tenantId?.firstName} {tenancy.tenantId?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">Room {tenancy.roomId?.roomNumber}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(tenancy.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hostel Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hostel Overview</h3>
            <div className="space-y-3">
              {hostels?.hostels?.map((hostel: any) => (
                <div key={hostel.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{hostel.name}</p>
                      <p className="text-xs text-gray-500">{hostel.totalRooms} rooms</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Active</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
