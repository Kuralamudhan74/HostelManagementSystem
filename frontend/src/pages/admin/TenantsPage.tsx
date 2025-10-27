import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ArrowLeft, Plus, Search, MapPin, Phone, Mail, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import apiClient from '../../services/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const addTenantSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
  const [selectedTenancy, setSelectedTenancy] = useState<any>(null);
  
  const [searchParams, setSearchParams] = useState({
    search: '',
    roomNumber: '',
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(addTenantSchema),
  });

  // Fetch tenants and unassigned tenant users
  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['tenants', searchParams],
    queryFn: () => apiClient.getTenants({
      name: searchParams.search || undefined,
      room: searchParams.roomNumber || undefined,
      limit: 100,
      includeUnassigned: true,
    }),
  });

  // Create tenant user mutation
  const createTenantMutation = useMutation({
    mutationFn: (data: any) => apiClient.register(data),
    onSuccess: () => {
      toast.success('Tenant created successfully');
      setIsAddTenantModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create tenant');
    },
  });

  // Unassign tenant mutation
  const unassignTenantMutation = useMutation({
    mutationFn: async (tenancyId: string) => {
      // End the tenancy by setting isActive to false
      // Note: You'll need to add this endpoint to the backend
      return await fetch(`/api/admin/tenancies/${tenancyId}/end`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast.success('Tenant unassigned successfully');
      setIsUnassignModalOpen(false);
      setSelectedTenancy(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unassign tenant');
    },
  });

  const handleAddTenant = (data: any) => {
    createTenantMutation.mutate({
      ...data,
      role: 'tenant',
      phone: data.phone || '',
    });
  };

  const handleUnassignClick = (tenancy: any) => {
    setSelectedTenancy(tenancy);
    setIsUnassignModalOpen(true);
  };

  const handleUnassign = () => {
    if (selectedTenancy) {
      unassignTenantMutation.mutate(selectedTenancy.id || selectedTenancy._id);
    }
  };

  const tenancies = tenantsData?.tenancies || [];
  const allTenantUsers = tenantsData?.allTenantUsers || [];
  
  // Create a set of tenant IDs that have tenancies
  const assignedTenantIds = new Set(tenancies.map((t: any) => t.tenantId?._id || t.tenantId?.id));
  
  // Get unassigned tenants (tenant users without active tenancies)
  const unassignedTenants = allTenantUsers.filter((tenant: any) => 
    !assignedTenantIds.has(tenant._id || tenant.id)
  );

  // Filter results based on search
  const filteredTenancies = useMemo(() => {
    if (!searchParams.search.trim() && !searchParams.roomNumber.trim()) {
      return tenancies;
    }

    return tenancies.filter((tenancy: any) => {
      // Filter by name
      if (searchParams.search.trim()) {
        const tenantName = `${tenancy.tenantId?.firstName || ''} ${tenancy.tenantId?.lastName || ''}`.toLowerCase();
        const tenantEmail = (tenancy.tenantId?.email || '').toLowerCase();
        const searchLower = searchParams.search.toLowerCase();
        
        if (!tenantName.includes(searchLower) && !tenantEmail.includes(searchLower)) {
          return false;
        }
      }

      // Filter by room number
      if (searchParams.roomNumber.trim()) {
        const roomNumber = (tenancy.roomId?.roomNumber || '').toLowerCase();
        if (!roomNumber.includes(searchParams.roomNumber.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [tenancies, searchParams]);

  const filteredUnassignedTenants = useMemo(() => {
    if (!searchParams.search.trim()) {
      return unassignedTenants;
    }

    const searchLower = searchParams.search.toLowerCase();
    return unassignedTenants.filter((tenant: any) => {
      const fullName = `${tenant.firstName || ''} ${tenant.lastName || ''}`.toLowerCase();
      const email = (tenant.email || '').toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [unassignedTenants, searchParams]);

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
                <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
                <p className="text-sm text-gray-600">
                  {tenancies.length} assigned • {unassignedTenants.length} unassigned • {tenancies.length + unassignedTenants.length} total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsAddTenantModalOpen(true)}
                variant="primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Tenant
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <motion.div
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchParams.search}
                  onChange={(e) => setSearchParams({ ...searchParams, search: e.target.value })}
                  placeholder="Search tenants..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room number
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchParams.roomNumber}
                  onChange={(e) => setSearchParams({ ...searchParams, roomNumber: e.target.value })}
                  placeholder="Filter by room..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tenants List */}
        {isLoading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Show assigned tenants */}
            {filteredTenancies.map((tenancy: any) => (
              <motion.div
                key={tenancy.id || tenancy._id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900">
                        {tenancy.tenantId?.firstName} {tenancy.tenantId?.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">Tenant</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tenancy.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tenancy.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {tenancy.tenantId?.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {tenancy.tenantId?.phone || 'No phone'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    Room {tenancy.roomId?.roomNumber || 'N/A'}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Monthly Share: <span className="font-semibold">${tenancy.tenantShare || 0}</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Since: {new Date(tenancy.startDate).toLocaleDateString()}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleUnassignClick(tenancy)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Unassign from Room
                  </Button>
                </div>
              </motion.div>
            ))}

            {/* Show unassigned tenants */}
            {filteredUnassignedTenants.map((tenant: any) => (
              <motion.div
                key={tenant._id || tenant.id}
                className="bg-yellow-50 border-2 border-yellow-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900">
                        {tenant.firstName} {tenant.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">Tenant (Unassigned)</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    No Room
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {tenant.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {tenant.phone || 'No phone'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="text-orange-600 font-medium">Not assigned to any room</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-yellow-700 mb-2">
                    This tenant needs to be assigned to a room. Go to Rooms page to assign them.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate('/admin/rooms')}
                  >
                    Go to Rooms
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredTenancies.length === 0 && filteredUnassignedTenants.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first tenant</p>
            <Button onClick={() => setIsAddTenantModalOpen(true)} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Add First Tenant
            </Button>
          </div>
        )}
      </div>

      {/* Add Tenant Modal */}
      <Modal
        isOpen={isAddTenantModalOpen}
        onClose={() => {
          setIsAddTenantModalOpen(false);
          reset();
        }}
        title="Add New Tenant"
      >
        <form onSubmit={handleSubmit(handleAddTenant)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                {...register('firstName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1">{errors.firstName.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                {...register('lastName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName.message as string}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              {...register('password')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              {...register('phone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddTenantModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Add Tenant
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unassign Tenant Modal */}
      <Modal
        isOpen={isUnassignModalOpen}
        onClose={() => {
          setIsUnassignModalOpen(false);
          setSelectedTenancy(null);
        }}
        title="Unassign Tenant"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to unassign{' '}
            <strong>
              {selectedTenancy?.tenantId?.firstName} {selectedTenancy?.tenantId?.lastName}
            </strong>{' '}
            from Room {selectedTenancy?.roomId?.roomNumber}?
          </p>
          <p className="text-sm text-gray-600">
            This will make the tenant available for reassignment to another room or hostel.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsUnassignModalOpen(false);
                setSelectedTenancy(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnassign}
              variant="primary"
            >
              Yes, Unassign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TenantsPage;
