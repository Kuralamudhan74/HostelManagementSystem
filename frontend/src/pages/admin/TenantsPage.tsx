import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ArrowLeft, Search, MapPin, Phone, X, Eye, Upload, Trash2, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import apiClient from '../../services/api';
import toast from 'react-hot-toast';


const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewProfileModalOpen, setIsViewProfileModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportResultsModalOpen, setIsImportResultsModalOpen] = useState(false);
  const [selectedTenancy, setSelectedTenancy] = useState<any>(null);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedTenantProfile, setSelectedTenantProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [showPastTenants, setShowPastTenants] = useState(false);

  const [searchParams, setSearchParams] = useState({
    search: '',
    roomNumber: '',
  });



  // Fetch tenants and unassigned tenant users with ALL data (no filtering on API)
  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.getTenants({
      limit: 100,
      includeUnassigned: true,
    }),
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

  // Update tenant status mutation
  const updateTenantStatusMutation = useMutation({
    mutationFn: ({ tenantId, isActive }: { tenantId: string; isActive: boolean }) =>
      apiClient.updateTenantStatus(tenantId, isActive),
    onSuccess: () => {
      toast.success('Tenant status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update tenant status');
    },
  });

  // CSV Import mutation
  const importCSVMutation = useMutation({
    mutationFn: (file: File) => apiClient.importTenantsFromCSV(file),
    onSuccess: (data) => {
      setImportResults(data);
      setIsImportModalOpen(false);
      setIsImportResultsModalOpen(true);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success(`Import completed: ${data.success} tenants created`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import CSV');
    },
  });

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: (tenantId: string) => apiClient.deleteTenant(tenantId),
    onSuccess: (data) => {
      toast.success(data.message);
      setIsDeleteModalOpen(false);
      setSelectedTenant(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete tenant');
    },
  });

  const handleToggleStatus = (tenant: any, currentStatus: boolean) => {
    updateTenantStatusMutation.mutate({
      tenantId: tenant._id || tenant.id,
      isActive: !currentStatus
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        toast.error('Please select a CSV file');
      }
    }
  };

  const handleImportCSV = () => {
    if (selectedFile) {
      importCSVMutation.mutate(selectedFile);
    }
  };


  const handleUnassignClick = (tenancy: any) => {
    setSelectedTenancy(tenancy);
    setIsUnassignModalOpen(true);
  };

  const handleViewProfile = async (tenantId: string) => {
    try {
      setIsLoadingProfile(true);
      const response = await apiClient.getTenantProfile(tenantId);
      setSelectedTenantProfile(response.user);
      setIsViewProfileModalOpen(true);
    } catch (error: any) {
      console.error('View profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to load tenant profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleUnassign = () => {
    if (selectedTenancy) {
      unassignTenantMutation.mutate(selectedTenancy.id || selectedTenancy._id);
    }
  };

  const tenancies = tenantsData?.tenancies || [];
  const allTenantUsers = tenantsData?.allTenantUsers || [];

  // Filter by active status based on showPastTenants toggle
  // showPastTenants = true: show only past (inactive) tenants
  // showPastTenants = false: show only active tenants
  const activeTenantUsers = showPastTenants
    ? allTenantUsers.filter((t: any) => t.isActive === false)
    : allTenantUsers.filter((t: any) => t.isActive !== false);

  // Create a set of tenant IDs that have tenancies
  const assignedTenantIds = new Set(tenancies.map((t: any) => t.tenantId?._id || t.tenantId?.id));

  // Get unassigned tenants (tenant users without active tenancies)
  // When showing past tenants, exclude unassigned tenants (only show deleted tenants with tenancies)
  const unassignedTenants = showPastTenants
    ? [] // Don't show unassigned tenants when viewing past tenants
    : activeTenantUsers.filter((tenant: any) =>
        !assignedTenantIds.has(tenant._id || tenant.id)
      );

  // Filter results based on search
  const filteredTenancies = useMemo(() => {
    // showPastTenants = true: show only inactive tenancies
    // showPastTenants = false: show only active tenancies
    let filtered = showPastTenants
      ? tenancies.filter((t: any) => t.tenantId?.isActive === false || t.isActive === false)
      : tenancies.filter((t: any) => t.tenantId?.isActive !== false && t.isActive !== false);

    if (!searchParams.search.trim() && !searchParams.roomNumber.trim()) {
      return filtered;
    }

    return filtered.filter((tenancy: any) => {
      // Filter by name
      if (searchParams.search.trim()) {
        const tenantName = `${tenancy.tenantId?.firstName || ''} ${tenancy.tenantId?.lastName || ''}`.toLowerCase();
        const tenantId = (tenancy.tenantId?.tenantId || '').toString().toLowerCase();
        const searchLower = searchParams.search.toLowerCase();
        
        if (!tenantName.includes(searchLower) && !tenantId.includes(searchLower)) {
          return false;
        }
      }

      // Filter by room number (handle both numeric and string room numbers)
      if (searchParams.roomNumber.trim()) {
        const roomNumber = (tenancy.roomId?.roomNumber || '').toString().toLowerCase();
        const searchRoom = searchParams.roomNumber.toLowerCase();
        if (!roomNumber.includes(searchRoom)) {
          return false;
        }
      }

      return true;
    });
  }, [tenancies, searchParams, showPastTenants]);

  const filteredUnassignedTenants = useMemo(() => {
    if (!searchParams.search.trim()) {
      return unassignedTenants;
    }

    const searchLower = searchParams.search.toLowerCase();
    return unassignedTenants.filter((tenant: any) => {
      const fullName = `${tenant.firstName || ''} ${tenant.lastName || ''}`.toLowerCase();
      const tenantId = (tenant.tenantId || '').toString().toLowerCase();
      return fullName.includes(searchLower) || tenantId.includes(searchLower);
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
                onClick={() => setIsImportModalOpen(true)}
                variant="secondary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar & Filters */}
        <motion.div
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show inactive tenants
              </label>
              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-3 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showPastTenants}
                  onChange={(e) => setShowPastTenants(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Include past tenants</span>
                </div>
              </label>
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
                    <span className="font-semibold mr-2">Tenant ID:</span>
                    {tenancy.tenantId?.tenantId || 'N/A'}
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
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 min-w-[120px]"
                      onClick={() => handleViewProfile(tenancy.tenantId?.id || tenancy.tenantId?._id || tenancy.tenantId)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 min-w-[120px]"
                      onClick={() => handleUnassignClick(tenancy)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Unassign
                    </Button>
                    {!showPastTenants && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 min-w-[120px] bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                        onClick={() => {
                          setSelectedTenant(tenancy.tenantId);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
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
                    <span className="font-semibold mr-2">Tenant ID:</span>
                    {tenant.tenantId || 'N/A'}
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
                  <p className="text-sm text-yellow-700 mb-3">
                    This tenant needs to be assigned to a room.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mb-2"
                    onClick={() => handleViewProfile(tenant.id || tenant._id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Profile
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mb-2"
                    onClick={() => navigate('/admin/rooms')}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Assign to Room
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    onClick={() => {
                      setSelectedTenant(tenant);
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Tenant
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
            <p className="text-gray-600 mb-6">Get started by importing tenants from CSV</p>
            <Button onClick={() => setIsImportModalOpen(true)} variant="primary">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </div>
        )}
      </div>


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

      {/* Delete Tenant Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTenant(null);
        }}
        title="Delete Tenant"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium mb-2">⚠️ Warning: This action cannot be undone</p>
            <p className="text-red-700 text-sm">
              Deleting this tenant will:
            </p>
            <ul className="text-red-700 text-sm list-disc list-inside mt-2 space-y-1">
              <li>Mark the tenant as inactive (soft delete)</li>
              <li>Automatically end all active tenancies</li>
              <li>Free up their room(s)</li>
              <li>Hide them from the active tenants list</li>
            </ul>
          </div>

          <p className="text-gray-700">
            Are you sure you want to delete{' '}
            <strong className="text-gray-900">
              {selectedTenant?.firstName} {selectedTenant?.lastName}
            </strong>?
          </p>

          {selectedTenant?.tenantId && (
            <p className="text-sm text-gray-600">
              Tenant ID: {selectedTenant.tenantId}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedTenant(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTenant) {
                  deleteTenantMutation.mutate(selectedTenant._id || selectedTenant.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteTenantMutation.isPending}
            >
              {deleteTenantMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Yes, Delete Tenant
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Profile Modal */}
      <Modal
        isOpen={isViewProfileModalOpen}
        onClose={() => {
          setIsViewProfileModalOpen(false);
          setSelectedTenantProfile(null);
        }}
        title="Tenant Profile"
        size="xl"
      >
        {isLoadingProfile ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : selectedTenantProfile ? (
          <div className="space-y-6 py-2">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.firstName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.lastName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.tenantId || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Father Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.fatherName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.dateOfBirth || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.whatsappNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.permanentAddress || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.city || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.state || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Identity & Occupation */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity & Occupation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Aadhar Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.aadharNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Occupation</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.occupation || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">College/Company/Institute Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.collegeCompanyName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Office/College/Institute Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.officeAddress || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Duration of Stay</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.expectedDurationStay || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.emergencyContactName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Relation</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.emergencyContactRelation || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Emergency Contact Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTenantProfile.emergencyContactNumber || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setSelectedFile(null);
        }}
        title="Import Tenants from CSV"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Required:</strong> Name, Father Name, Date of Birth</li>
              <li><strong>Required:</strong> Mobile Number, WhatsApp Number</li>
              <li><strong>Required:</strong> Permanent Address (native), City & State</li>
              <li><strong>Required:</strong> Aadhar Number, Occupation</li>
              <li><strong>Required:</strong> Name of College/Company/Institute</li>
              <li><strong>Required:</strong> Emergency Contact with Name (format: "Name - Phone")</li>
              <li><strong>Optional:</strong> Expected Duration of Stay, Office Address</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2 font-medium">
              ✓ Unique tenant IDs will be auto-generated (1, 2, 3, ...)<br/>
              ✓ Duplicate users (same phone/Aadhar) will be skipped
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            {selectedFile && (
              <p className="text-sm text-green-600 mt-2">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsImportModalOpen(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleImportCSV}
              disabled={!selectedFile || importCSVMutation.isPending}
            >
              {importCSVMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Results Modal */}
      <Modal
        isOpen={isImportResultsModalOpen}
        onClose={() => {
          setIsImportResultsModalOpen(false);
          setImportResults(null);
        }}
        title="Import Results"
      >
        {importResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900">Successful</p>
                <p className="text-2xl font-bold text-green-700">{importResults.success}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-900">Failed</p>
                <p className="text-2xl font-bold text-red-700">{importResults.failed}</p>
              </div>
            </div>

            {importResults.createdTenants && importResults.createdTenants.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Created Tenants:</h4>
                <div className="space-y-2">
                  {importResults.createdTenants.map((tenant: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded text-xs">
                      <p className="font-medium">{tenant.firstName} {tenant.lastName}</p>
                      <p className="text-blue-600 font-mono">Tenant ID: {tenant.tenantId}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResults.errors && importResults.errors.length > 0 && (
              <div className="border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                <h4 className="text-sm font-medium text-red-900 mb-3">Errors:</h4>
                <div className="space-y-2">
                  {importResults.errors.map((error: any, index: number) => (
                    <div key={index} className="bg-red-50 p-3 rounded text-xs">
                      <p className="font-medium text-red-900">Row {error.row}: {error.name || 'N/A'}</p>
                      <p className="text-red-700">{error.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setIsImportResultsModalOpen(false);
                  setImportResults(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TenantsPage;
