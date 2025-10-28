import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp,
  FileText,
  Settings,
  Plus,
  Trash2,
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isAddHostelModalOpen, setIsAddHostelModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState<any>(null);
  const [hostelName, setHostelName] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');

  const { data: hostels, isLoading: hostelsLoading } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => apiClient.getHostels(),
  });

  const { data: tenants } = useQuery({
    queryKey: ['tenants-full'],
    queryFn: () => apiClient.getTenants({ includeUnassigned: true, limit: 1000 }),
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.getDashboardStats(),
  });

  // Create hostel mutation
  const createHostelMutation = useMutation({
    mutationFn: (data: { name: string; address: string; ownerId: string }) => 
      apiClient.createHostel(data),
    onSuccess: () => {
      toast.success('Hostel created successfully');
      setIsAddHostelModalOpen(false);
      setHostelName('');
      setHostelAddress('');
      queryClient.invalidateQueries({ queryKey: ['hostels'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create hostel');
    },
  });

  const handleCreateHostel = () => {
    if (!hostelName.trim() || !hostelAddress.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    createHostelMutation.mutate({
      name: hostelName,
      address: hostelAddress,
      ownerId: user?.id || '', // Use current admin as owner
    });
  };

  const handleDeleteClick = (hostel: any) => {
    // Check if hostel has any tenants
    const hostelHasTenants = checkHostelHasTenants(hostel);
    
    if (hostelHasTenants) {
      toast.error('Cannot delete hostel with active tenants. Please reassign or remove tenants first.');
      return;
    }

    setSelectedHostel(hostel);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedHostel) return;

    try {
      const response = await fetch(`/api/admin/hostels/${selectedHostel.id || selectedHostel._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete hostel');
        return;
      }
      
      toast.success('Hostel deleted successfully');
      setIsDeleteConfirmModalOpen(false);
      setSelectedHostel(null);
      queryClient.invalidateQueries({ queryKey: ['hostels'] });
    } catch (error: any) {
      console.error('Delete hostel error:', error);
      toast.error('Failed to delete hostel');
    }
  };

  const checkHostelHasTenants = (hostel: any) => {
    if (!tenants?.tenancies) return false;
    
    const hostelId = hostel.id || hostel._id;
    return tenants.tenancies.some((tenancy: any) => {
      const tenancyHostelId = tenancy.roomId?.hostelId?._id || tenancy.roomId?.hostelId;
      return tenancyHostelId === hostelId && tenancy.isActive;
    });
  };

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
      value: `$${dashboardStats?.monthlyRevenue || '0.00'}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      title: 'Occupancy Rate',
      value: dashboardStats?.occupancyRate || '0%',
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

  if (hostelsLoading) {
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
              <button 
                onClick={() => navigate('/profile')}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </button>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Hostel Overview</h3>
              <Button
                onClick={() => setIsAddHostelModalOpen(true)}
                variant="primary"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Hostel
              </Button>
            </div>
            <div className="space-y-3">
              {hostels?.hostels?.map((hostel: any) => (
                <div key={hostel.id || hostel._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center flex-1">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{hostel.name}</p>
                      <p className="text-xs text-gray-500">{hostel.address}</p>
                      <p className="text-xs text-gray-500">{hostel.totalRooms || 0} rooms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium">Active</span>
                    <button
                      onClick={() => handleDeleteClick(hostel)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete hostel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add Hostel Modal */}
      <Modal
        isOpen={isAddHostelModalOpen}
        onClose={() => {
          setIsAddHostelModalOpen(false);
          setHostelName('');
          setHostelAddress('');
        }}
        title="Add New Hostel"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hostel Name *
            </label>
            <input
              type="text"
              value={hostelName}
              onChange={(e) => setHostelName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter hostel name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              value={hostelAddress}
              onChange={(e) => setHostelAddress(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter hostel address"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddHostelModalOpen(false);
                setHostelName('');
                setHostelAddress('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateHostel}
            >
              Create Hostel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmModalOpen}
        onClose={() => {
          setIsDeleteConfirmModalOpen(false);
          setSelectedHostel(null);
        }}
        title="Delete Hostel"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{selectedHostel?.name}</strong>?
          </p>
          {selectedHostel && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">
                This action cannot be undone. All rooms and associated data will be removed.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteConfirmModalOpen(false);
                setSelectedHostel(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Hostel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
