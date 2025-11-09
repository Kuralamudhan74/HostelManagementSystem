import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ArrowLeft, Search, MapPin, Phone, X, Eye, Upload, Trash2, Filter, Plus, DollarSign, Calendar, Download, Edit } from 'lucide-react';
import { formatCurrency } from '../../utils';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import apiClient from '../../services/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  calculateCurrentRentPeriodWithPayments,
  formatDateForDisplay,
  getPaymentStatus,
  isPaymentPeriodValid,
} from '../../utils/rentPeriodUtils';

const assignRoomSchema = z.object({
  roomId: z.string().min(1, 'Room is required'),
  startDate: z.string().min(1, 'Start date is required'),
  tenantShare: z.number().min(1, 'Share amount is required'),
  withFood: z.boolean().optional(),
});

const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewProfileModalOpen, setIsViewProfileModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportResultsModalOpen, setIsImportResultsModalOpen] = useState(false);
  const [isAssignRoomModalOpen, setIsAssignRoomModalOpen] = useState(false);
  const [selectedTenancy, setSelectedTenancy] = useState<any>(null);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedTenantProfile, setSelectedTenantProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editProfileFormData, setEditProfileFormData] = useState<any>(null);
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [addTenantFormData, setAddTenantFormData] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    tenantId: '',
    fatherName: '',
    dateOfBirth: '',
    whatsappNumber: '',
    permanentAddress: '',
    city: '',
    state: '',
    aadharNumber: '',
    occupation: '',
    collegeCompanyName: '',
    officeAddress: '',
    expectedDurationStay: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelation: '',
    roomNumber: '',
    roomCategory: '',
    accommodationType: '',
    withFood: false,
    checkInDate: '',
    aadharProofUrl: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [showPastTenants, setShowPastTenants] = useState(false);

  const [searchParams, setSearchParams] = useState({
    search: '',
    roomNumber: '',
  });
  const [selectedHostelFilter, setSelectedHostelFilter] = useState<string>('');

  const assignRoomForm = useForm({
    resolver: zodResolver(assignRoomSchema),
  });



  // Fetch tenants and unassigned tenant users with ALL data (no filtering on API)
  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['tenants', showPastTenants],
    queryFn: () => apiClient.getTenants({
      limit: 100,
      includeUnassigned: true,
      active: showPastTenants ? 'false' : 'true',
    }),
  });

  // Fetch rooms for assignment modal
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.getRooms(),
  });

  // Fetch hostels for room selection and filtering
  const { data: hostelsData } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => apiClient.getHostels(),
  });

  // Fetch payments to check payment status
  const { data: paymentsData } = useQuery({
    queryKey: ['admin/payments/all'],
    queryFn: () => apiClient.getPayments({ limit: 1000 }),
  });


  // Unassign tenant mutation
  const unassignTenantMutation = useMutation({
    mutationFn: (tenancyId: string) => apiClient.endTenancy(tenancyId),
    onSuccess: (data) => {
      toast.success(data.message || 'Tenant unassigned successfully');
      setIsUnassignModalOpen(false);
      setSelectedTenancy(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unassign tenant');
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

  const permanentDeleteTenantMutation = useMutation({
    mutationFn: (tenantId: string) => apiClient.permanentlyDeleteTenant(tenantId),
    onSuccess: (data) => {
      toast.success(data.message);
      setIsDeleteModalOpen(false);
      setSelectedTenant(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to permanently delete tenant');
    },
  });

  // Update tenant profile mutation
  const updateTenantProfileMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: any }) =>
      apiClient.updateTenantProfile(tenantId, data),
    onSuccess: (data) => {
      toast.success(data.message || 'Tenant profile updated successfully');
      setIsEditProfileModalOpen(false);
      setEditProfileFormData(null);
      // Refresh the profile if viewing
      if (selectedTenantProfile) {
        handleViewProfile(selectedTenantProfile._id || selectedTenantProfile.id);
      }
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update tenant profile');
    },
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: (data: any) => apiClient.createTenant(data),
    onSuccess: (data) => {
      toast.success(data.message || 'Tenant created successfully');
      setIsAddTenantModalOpen(false);
      setAddTenantFormData({
        firstName: '',
        lastName: '',
        phone: '',
        tenantId: '',
        fatherName: '',
        dateOfBirth: '',
        whatsappNumber: '',
        permanentAddress: '',
        city: '',
        state: '',
        aadharNumber: '',
        occupation: '',
        collegeCompanyName: '',
        officeAddress: '',
        expectedDurationStay: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        emergencyContactRelation: '',
      });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create tenant');
    },
  });

  const handleAddTenantInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddTenantFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    createTenantMutation.mutate(addTenantFormData);
  };

  const handleEditProfileClick = () => {
    if (selectedTenantProfile) {
      setEditProfileFormData({
        firstName: selectedTenantProfile.firstName || '',
        lastName: selectedTenantProfile.lastName || '',
        phone: selectedTenantProfile.phone || '',
        tenantId: selectedTenantProfile.tenantId || '',
        fatherName: selectedTenantProfile.fatherName || '',
        dateOfBirth: selectedTenantProfile.dateOfBirth || '',
        whatsappNumber: selectedTenantProfile.whatsappNumber || '',
        permanentAddress: selectedTenantProfile.permanentAddress || '',
        city: selectedTenantProfile.city || '',
        state: selectedTenantProfile.state || '',
        aadharNumber: selectedTenantProfile.aadharNumber || '',
        occupation: selectedTenantProfile.occupation || '',
        collegeCompanyName: selectedTenantProfile.collegeCompanyName || '',
        officeAddress: selectedTenantProfile.officeAddress || '',
        expectedDurationStay: selectedTenantProfile.expectedDurationStay || '',
        emergencyContactName: selectedTenantProfile.emergencyContactName || '',
        emergencyContactNumber: selectedTenantProfile.emergencyContactNumber || '',
        emergencyContactRelation: selectedTenantProfile.emergencyContactRelation || '',
      });
      setIsEditProfileModalOpen(true);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantProfile) return;

    const tenantId = selectedTenantProfile._id || selectedTenantProfile.id;
    updateTenantProfileMutation.mutate({ tenantId, data: editProfileFormData });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditProfileFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
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

  const handleAssignRoomClick = (tenancy: any) => {
    setSelectedTenancy(tenancy);
    setSelectedTenant(tenancy.tenantId);
    setIsAssignRoomModalOpen(true);
  };

  const handleAssignRoom = async (data: any) => {
    if (!selectedTenant) {
      toast.error('Tenant not selected');
      return;
    }

    try {
      const tenantId = selectedTenant._id || selectedTenant.id || selectedTenant;
      await apiClient.addTenantToRoom(data.roomId, {
        tenantId,
        startDate: data.startDate,
        tenantShare: data.tenantShare,
      });
      toast.success('Tenant assigned to room successfully');
      setIsAssignRoomModalOpen(false);
      assignRoomForm.reset();
      setSelectedTenancy(null);
      setSelectedTenant(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (error: any) {
      console.error('Assign room error:', error);
      toast.error(error.response?.data?.message || 'Failed to assign tenant to room');
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
  // When showing past tenants, show unassigned past tenants (deleted tenants without tenancies)
  const unassignedTenants = showPastTenants
    ? activeTenantUsers.filter((tenant: any) => {
        // Show past tenants who don't have any tenancy (assigned or past)
        return !assignedTenantIds.has(tenant._id || tenant.id);
      })
    : activeTenantUsers.filter((tenant: any) =>
        !assignedTenantIds.has(tenant._id || tenant.id)
      );

  // Filter results based on search and hostel
  const filteredTenancies = useMemo(() => {
    // showPastTenants = true: show only inactive tenancies
    // showPastTenants = false: show only active tenancies
    let filtered = showPastTenants
      ? tenancies.filter((t: any) => t.tenantId?.isActive === false || t.isActive === false)
      : tenancies.filter((t: any) => t.tenantId?.isActive !== false && t.isActive !== false);

    // Filter by hostel
    if (selectedHostelFilter) {
      filtered = filtered.filter((tenancy: any) => {
        const roomHostelId = tenancy.roomId?.hostelId?._id || tenancy.roomId?.hostelId?.id || tenancy.roomId?.hostelId;
        return roomHostelId === selectedHostelFilter;
      });
    }

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
  }, [tenancies, searchParams, showPastTenants, selectedHostelFilter]);

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
                  {showPastTenants ? (
                    <>
                      {tenancies.length} past tenancy records • {unassignedTenants.length} unassigned past tenants • {tenancies.length + unassignedTenants.length} total past tenants
                    </>
                  ) : (
                    <>
                      {tenancies.length} assigned • {unassignedTenants.length} unassigned • {tenancies.length + unassignedTenants.length} total active
                    </>
                  )}
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
              <Button
                onClick={() => {
                  // Export tenants to CSV based on current filters - FULL PROFILE DATA
                  const headers = [
                    'First Name', 'Last Name', 'Tenant ID', 'Email',
                    'Mobile Number', 'WhatsApp Number',
                    'Father Name', 'Date of Birth',
                    'Permanent Address', 'City', 'State',
                    'Aadhar Number', 'Occupation',
                    'College/Company/Institute', 'Office Address',
                    'Expected Duration of Stay',
                    'Emergency Contact Name', 'Emergency Contact Relation', 'Emergency Contact Number',
                    'Room Number', 'Hostel', 'Tenancy Status', 'Monthly Share', 'Check-in Date', 'Rent Payment Status'
                  ];
                  const rows: any[] = [];

                  // Add assigned tenants with full profile data
                  filteredTenancies.forEach((tenancy: any) => {
                    const tenant = tenancy.tenantId;

                    // Calculate rent status
                    const tenantIdForPayment = tenant?.id || tenant?._id || tenant;
                    const tenantPayments = (paymentsData?.payments || []).filter((payment: any) => {
                      const paymentTenantId = payment.tenantId?.id || payment.tenantId?._id || payment.tenantId;
                      return paymentTenantId === tenantIdForPayment;
                    });

                    let rentStatus = 'N/A';
                    if (!showPastTenants && tenancy.isActive && tenancy.startDate) {
                      try {
                        const checkInDateObj = new Date(tenancy.startDate);
                        const period = calculateCurrentRentPeriodWithPayments(checkInDateObj, tenantPayments);
                        const hasPayment = tenantPayments.some((payment: any) => {
                          if (!payment.paymentPeriodStart || !payment.paymentPeriodEnd) return false;
                          return isPaymentPeriodValid(
                            new Date(payment.paymentPeriodStart),
                            new Date(payment.paymentPeriodEnd),
                            period.startDate,
                            period.endDate
                          );
                        });
                        const statusInfo = getPaymentStatus(period.startDate, period.endDate, hasPayment);
                        rentStatus = statusInfo.label;
                      } catch (error) {
                        rentStatus = 'Unknown';
                      }
                    }

                    rows.push([
                      tenant?.firstName || '',
                      tenant?.lastName || '',
                      tenant?.tenantId || 'N/A',
                      tenant?.email || 'N/A',
                      tenant?.phone || 'N/A',
                      tenant?.whatsappNumber || 'N/A',
                      tenant?.fatherName || 'N/A',
                      tenant?.dateOfBirth || 'N/A',
                      tenant?.permanentAddress || 'N/A',
                      tenant?.city || 'N/A',
                      tenant?.state || 'N/A',
                      tenant?.aadharNumber || 'N/A',
                      tenant?.occupation || 'N/A',
                      tenant?.collegeCompanyName || 'N/A',
                      tenant?.officeAddress || 'N/A',
                      tenant?.expectedDurationStay || 'N/A',
                      tenant?.emergencyContactName || 'N/A',
                      tenant?.emergencyContactRelation || 'N/A',
                      tenant?.emergencyContactNumber || 'N/A',
                      tenancy.roomId?.roomNumber || 'N/A',
                      tenancy.roomId?.hostelId?.name || 'N/A',
                      tenancy.isActive ? 'Active' : 'Inactive',
                      (tenancy.tenantShare || 0).toFixed(2),
                      tenancy.startDate ? formatDateForDisplay(new Date(tenancy.startDate)) : 'N/A',
                      rentStatus
                    ]);
                  });

                  // Add unassigned tenants with full profile data
                  filteredUnassignedTenants.forEach((tenant: any) => {
                    rows.push([
                      tenant?.firstName || '',
                      tenant?.lastName || '',
                      tenant?.tenantId || 'N/A',
                      tenant?.email || 'N/A',
                      tenant?.phone || 'N/A',
                      tenant?.whatsappNumber || 'N/A',
                      tenant?.fatherName || 'N/A',
                      tenant?.dateOfBirth || 'N/A',
                      tenant?.permanentAddress || 'N/A',
                      tenant?.city || 'N/A',
                      tenant?.state || 'N/A',
                      tenant?.aadharNumber || 'N/A',
                      tenant?.occupation || 'N/A',
                      tenant?.collegeCompanyName || 'N/A',
                      tenant?.officeAddress || 'N/A',
                      tenant?.expectedDurationStay || 'N/A',
                      tenant?.emergencyContactName || 'N/A',
                      tenant?.emergencyContactRelation || 'N/A',
                      tenant?.emergencyContactNumber || 'N/A',
                      'Not Assigned',
                      'N/A',
                      tenant.isActive ? 'Active' : 'Inactive',
                      '0.00',
                      'N/A',
                      'N/A'
                    ]);
                  });

                  const csvContent = [
                    headers.join(','),
                    ...rows.map((row: any[]) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `tenants-full-export-${new Date().getTime()}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success(`Exported ${rows.length} tenant(s) with full profile data`);
                }}
                variant="secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                Filter by Hostel
              </label>
              <select
                value={selectedHostelFilter}
                onChange={(e) => setSelectedHostelFilter(e.target.value)}
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
              {showPastTenants && (
                <div className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-2">
                  <p className="font-medium mb-1">Card Colors:</p>
                  <p>• <span className="font-semibold">Gray cards:</span> Past tenants with room history (shows previous room)</p>
                  <p>• <span className="font-semibold">Yellow cards:</span> Past tenants never assigned to a room</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tenants List */}
        {isLoading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Show assigned tenants */}
            {filteredTenancies.map((tenancy: any) => {
              // Calculate rent period and payment status for this tenant
              const tenantId = tenancy.tenantId?.id || tenancy.tenantId?._id || tenancy.tenantId;
              let rentPeriodInfo: any = null;
              let paymentStatusInfo: any = null;

              if (!showPastTenants && tenancy.isActive && tenancy.startDate) {
                try {
                  const checkInDate = new Date(tenancy.startDate);
                  
                  // Get all payments for this tenant
                  const tenantPayments = (paymentsData?.payments || []).filter((payment: any) => {
                    const paymentTenantId = payment.tenantId?.id || payment.tenantId?._id || payment.tenantId;
                    return paymentTenantId === tenantId;
                  });
                  
                  // Calculate current period based on payment history (if any)
                  // This will use the last payment period to determine the current cycle
                  const period = calculateCurrentRentPeriodWithPayments(checkInDate, tenantPayments);
                  
                  // Check if tenant has paid for the CURRENT rent period
                  // Get ALL payments for this period (in case of multiple partial payments)
                  const currentPeriodPayments = tenantPayments.filter((payment: any) => {
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

                  const hasPayment = currentPeriodPayments.length > 0;

                  // Calculate total amount paid and remaining for this period
                  let totalPaidAmount = 0;
                  let totalRemainingAmount = 0;
                  let hasAnyPartialPayment = false;

                  currentPeriodPayments.forEach((payment: any) => {
                    totalPaidAmount += payment.amount || 0;
                    if (payment.paymentType === 'partial') {
                      hasAnyPartialPayment = true;
                      totalRemainingAmount = payment.remainingAmount || 0; // Use the latest remaining amount
                    }
                  });

                  // Check if fully paid: if last payment is 'full' type OR remaining amount is 0
                  const latestPayment = currentPeriodPayments[currentPeriodPayments.length - 1];
                  const isFullyPaid = hasPayment && (
                    latestPayment?.paymentType === 'full' ||
                    (hasAnyPartialPayment && totalRemainingAmount === 0)
                  );

                  paymentStatusInfo = getPaymentStatus(period.startDate, period.endDate, isFullyPaid);

                  // Show partial status if there's still remaining amount
                  if (hasPayment && !isFullyPaid && totalRemainingAmount > 0) {
                    paymentStatusInfo = {
                      ...paymentStatusInfo,
                      label: 'Partial',
                      status: 'partial',
                      colorClass: 'text-yellow-700',
                      bgColorClass: 'bg-yellow-100',
                      remainingAmount: totalRemainingAmount,
                    };
                  }
                  rentPeriodInfo = period;
                } catch (error) {
                  console.error('Error calculating rent period:', error);
                }
              }

              // Determine card border/accent color based on payment status
              // Use a top accent bar for payment status to avoid conflicts with tenant status colors
              let paymentStatusBar = '';
              if (!showPastTenants && paymentStatusInfo) {
                if (paymentStatusInfo.status === 'paid') {
                  paymentStatusBar = 'border-t-4 border-green-500';
                } else if (paymentStatusInfo.status === 'overdue') {
                  paymentStatusBar = 'border-t-4 border-red-500';
                } else if (paymentStatusInfo.status === 'due_soon') {
                  paymentStatusBar = 'border-t-4 border-amber-500';
                }
              }

              return (
              <motion.div
                key={tenancy.id || tenancy._id}
                className={`rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
                  showPastTenants 
                    ? 'bg-gray-50 border border-gray-200' 
                    : 'bg-white'
                } ${paymentStatusBar}`}
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
                    {showPastTenants ? (
                      <span>
                        <span className="text-gray-500 italic">Previous Room:</span>{' '}
                        <span className="font-medium">Room {tenancy.roomId?.roomNumber || 'N/A'}</span>
                      </span>
                    ) : (
                      <span>Room {tenancy.roomId?.roomNumber || 'N/A'}</span>
                    )}
                  </div>
                  {/* Rent Period and Payment Status */}
                  {rentPeriodInfo && paymentStatusInfo && (
                    <>
                      <div className="flex items-center text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
                        <Calendar className="w-4 h-4 mr-2" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            Rent Period: {formatDateForDisplay(rentPeriodInfo.startDate)} → {formatDateForDisplay(rentPeriodInfo.endDate)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusInfo.bgColorClass} ${paymentStatusInfo.colorClass}`}>
                          {paymentStatusInfo.label}
                        </span>
                        {paymentStatusInfo.status === 'due_soon' && paymentStatusInfo.label === 'Pending' && !paymentStatusInfo.remainingAmount && (
                          <span className="text-xs text-gray-500 italic">
                            (No payment recorded for this period)
                          </span>
                        )}
                        {paymentStatusInfo.remainingAmount && paymentStatusInfo.remainingAmount > 0 && (
                          <span className="text-xs text-yellow-700 font-medium">
                            Remaining: {formatCurrency(paymentStatusInfo.remainingAmount)}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Monthly Share: <span className="font-semibold">{formatCurrency(tenancy.tenantShare || 0)}</span>
                  </p>
                  <div className="text-xs text-gray-500 mb-3 space-y-1">
                    <p>
                      Started: {formatDateForDisplay(new Date(tenancy.startDate))}
                    </p>
                    {showPastTenants && tenancy.endDate && (
                      <p className="text-red-600">
                        Ended: {formatDateForDisplay(new Date(tenancy.endDate))}
                      </p>
                    )}
                  </div>
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
                    {!showPastTenants && rentPeriodInfo && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 min-w-[120px] bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        onClick={() => {
                          navigate('/admin/payments', { 
                            state: { 
                              selectedTenantId: tenantId,
                              openPaymentModal: true 
                            } 
                          });
                        }}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Record Payment
                      </Button>
                    )}
                    {showPastTenants ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 min-w-[120px]"
                        onClick={() => handleAssignRoomClick(tenancy)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Assign
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 min-w-[120px]"
                        onClick={() => handleUnassignClick(tenancy)}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Unassign
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 min-w-[120px] bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                      onClick={() => {
                        // tenancy.tenantId is a populated object, extract the ID and full object
                        const tenantId = typeof tenancy.tenantId === 'object'
                          ? (tenancy.tenantId._id || tenancy.tenantId.id)
                          : tenancy.tenantId;
                        setSelectedTenant({ ...tenancy.tenantId, _id: tenantId });
                        setIsDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
              );
            })}

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
                      <p className="text-sm text-gray-500">
                        {showPastTenants ? 'Past Tenant (Unassigned)' : 'Tenant (Unassigned)'}
                      </p>
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
                  <p className={`text-sm mb-3 ${showPastTenants ? 'text-gray-700' : 'text-yellow-700'}`}>
                    {showPastTenants 
                      ? 'This past tenant can be reassigned to a room.'
                      : 'This tenant needs to be assigned to a room.'}
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
                  {showPastTenants ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full mb-2"
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setIsAssignRoomModalOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Assign to Room
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full mb-2"
                      onClick={() => navigate('/admin/rooms')}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Assign to Room
                    </Button>
                  )}
                  {!showPastTenants && (
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
                  )}
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
            <p className="text-red-800 font-medium mb-2">⚠️ Warning</p>
            <p className="text-red-700 text-sm font-medium mb-2">
              Soft Delete (Recommended):
            </p>
            <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
              <li>Mark the tenant as inactive</li>
              <li>Automatically end all active tenancies</li>
              <li>Free up their room(s)</li>
              <li>Hide them from the active tenants list</li>
              <li>Keep all historical data and payment records</li>
            </ul>

            {!selectedTenant?.isActive && (
              <>
                <p className="text-red-800 text-sm font-medium mt-3 mb-2">
                  Permanent Delete (Danger Zone):
                </p>
                <ul className="text-red-800 text-sm list-disc list-inside space-y-1">
                  <li className="font-semibold">⚠️ This CANNOT be undone!</li>
                  <li>Removes ALL tenant records from database</li>
                  <li>Deletes all tenancies, payments, rents, and bills</li>
                  <li>Only available for inactive (past) tenants</li>
                </ul>
              </>
            )}
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

          {selectedTenant?.isActive ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              This is an active tenant. Only soft delete is available.
            </p>
          ) : (
            <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-2">
              This is a past tenant. You can choose soft delete or permanent delete.
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
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={deleteTenantMutation.isPending || permanentDeleteTenantMutation.isPending}
            >
              {deleteTenantMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Soft Delete
                </>
              )}
            </Button>
            {!selectedTenant?.isActive && (
              <Button
                onClick={() => {
                  if (selectedTenant && window.confirm('⚠️ FINAL WARNING: This will permanently delete ALL records for this tenant. This action CANNOT be undone! Are you absolutely sure?')) {
                    permanentDeleteTenantMutation.mutate(selectedTenant._id || selectedTenant.id);
                  }
                }}
                className="bg-red-700 hover:bg-red-800 text-white"
                disabled={deleteTenantMutation.isPending || permanentDeleteTenantMutation.isPending}
              >
                {permanentDeleteTenantMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Deleting Permanently...</span>
                  </>
                ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Permanent Delete
                </>
              )}
              </Button>
            )}
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
        title={
          <div className="flex items-center justify-between w-full">
            <span>Tenant Profile</span>
            {selectedTenantProfile && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEditProfileClick}
                className="ml-4"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        }
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

      {/* Assign Room Modal for Past Tenants */}
      {selectedTenant && (
        <Modal
          isOpen={isAssignRoomModalOpen}
          onClose={() => {
            setIsAssignRoomModalOpen(false);
            assignRoomForm.reset();
            setSelectedTenancy(null);
            setSelectedTenant(null);
          }}
          title={`Assign ${selectedTenant?.firstName} ${selectedTenant?.lastName} to Room`}
        >
          <form onSubmit={assignRoomForm.handleSubmit(handleAssignRoom)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Room *
              </label>
              <select
                {...assignRoomForm.register('roomId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a room --</option>
                {roomsData?.rooms?.filter((room: any) => {
                  const roomTenancies = tenantsData?.tenancies?.filter((t: any) => {
                    const roomIdFromTenancy = t.roomId?.id || t.roomId?._id || t.roomId;
                    return roomIdFromTenancy === (room.id || room._id) && t.isActive;
                  }) || [];
                  const availableCapacity = room.capacity - roomTenancies.length;
                  return availableCapacity > 0; // Only show rooms with available capacity
                }).map((room: any) => {
                  const roomTenancies = tenantsData?.tenancies?.filter((t: any) => {
                    const roomIdFromTenancy = t.roomId?.id || t.roomId?._id || t.roomId;
                    return roomIdFromTenancy === (room.id || room._id) && t.isActive;
                  }) || [];
                  const availableCapacity = room.capacity - roomTenancies.length;
                  
                  return (
                    <option key={room.id || room._id} value={room.id || room._id}>
                      {room.roomNumber} - {room.hostelId?.name || 'N/A'} ({availableCapacity} bed{availableCapacity !== 1 ? 's' : ''} available)
                    </option>
                  );
                })}
              </select>
              {assignRoomForm.formState.errors.roomId && (
                <p className="text-red-500 text-xs mt-1">
                  {assignRoomForm.formState.errors.roomId.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                {...assignRoomForm.register('startDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {assignRoomForm.formState.errors.startDate && (
                <p className="text-red-500 text-xs mt-1">
                  {assignRoomForm.formState.errors.startDate.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Share (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                {...assignRoomForm.register('tenantShare', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="250.00"
              />
              {assignRoomForm.formState.errors.tenantShare && (
                <p className="text-red-500 text-xs mt-1">
                  {assignRoomForm.formState.errors.tenantShare.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...assignRoomForm.register('withFood')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">With Food</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsAssignRoomModalOpen(false);
                  assignRoomForm.reset();
                  setSelectedTenancy(null);
                  setSelectedTenant(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
              >
                Assign to Room
              </Button>
            </div>
          </form>
        </Modal>
      )}

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

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditProfileModalOpen}
        onClose={() => {
          setIsEditProfileModalOpen(false);
          setEditProfileFormData(null);
        }}
        title="Edit Tenant Profile"
        size="xl"
      >
        {editProfileFormData ? (
          <form onSubmit={handleUpdateProfile} className="space-y-6 py-2">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editProfileFormData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editProfileFormData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <input
                    type="text"
                    name="tenantId"
                    value={editProfileFormData.tenantId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={editProfileFormData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                  <input
                    type="text"
                    name="fatherName"
                    value={editProfileFormData.fatherName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={editProfileFormData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    name="whatsappNumber"
                    value={editProfileFormData.whatsappNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address</label>
                  <textarea
                    name="permanentAddress"
                    value={editProfileFormData.permanentAddress}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={editProfileFormData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={editProfileFormData.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Identity & Occupation */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity & Occupation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                  <input
                    type="text"
                    name="aadharNumber"
                    value={editProfileFormData.aadharNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    name="occupation"
                    value={editProfileFormData.occupation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">College/Company/Institute Name</label>
                  <input
                    type="text"
                    name="collegeCompanyName"
                    value={editProfileFormData.collegeCompanyName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Office/College/Institute Address</label>
                  <textarea
                    name="officeAddress"
                    value={editProfileFormData.officeAddress}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Duration of Stay</label>
                  <input
                    type="text"
                    name="expectedDurationStay"
                    value={editProfileFormData.expectedDurationStay}
                    onChange={handleInputChange}
                    placeholder="e.g., 3 years, 2 years"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    value={editProfileFormData.emergencyContactName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                  <input
                    type="text"
                    name="emergencyContactRelation"
                    value={editProfileFormData.emergencyContactRelation}
                    onChange={handleInputChange}
                    placeholder="e.g., Father, Mother, Brother"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Number</label>
                  <input
                    type="tel"
                    name="emergencyContactNumber"
                    value={editProfileFormData.emergencyContactNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditProfileModalOpen(false);
                  setEditProfileFormData(null);
                }}
                disabled={updateTenantProfileMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={updateTenantProfileMutation.isPending}
              >
                {updateTenantProfileMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Updating...</span>
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <LoadingSpinner />
        )}
          </Modal>

      {/* Add Tenant Modal */}
      <Modal
        isOpen={isAddTenantModalOpen}
        onClose={() => {
          setIsAddTenantModalOpen(false);
          setAddTenantFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            tenantId: '',
            fatherName: '',
            dateOfBirth: '',
            whatsappNumber: '',
            permanentAddress: '',
            city: '',
            state: '',
            aadharNumber: '',
            occupation: '',
            collegeCompanyName: '',
            officeAddress: '',
            expectedDurationStay: '',
            emergencyContactName: '',
            emergencyContactNumber: '',
            emergencyContactRelation: '',
            roomNumber: '',
            roomCategory: '',
            accommodationType: '',
            withFood: false,
            checkInDate: '',
            aadharProofUrl: '',
          });
        }}
        title="Add New Tenant"
        size="xl"
      >
        <form onSubmit={handleCreateTenant} className="space-y-6 py-2">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={addTenantFormData.firstName}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={addTenantFormData.lastName}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                <input
                  type="text"
                  name="tenantId"
                  value={addTenantFormData.tenantId}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto-generated if left empty"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={addTenantFormData.phone}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                <input
                  type="text"
                  name="fatherName"
                  value={addTenantFormData.fatherName}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={addTenantFormData.dateOfBirth}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  name="whatsappNumber"
                  value={addTenantFormData.whatsappNumber}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address</label>
                <textarea
                  name="permanentAddress"
                  value={addTenantFormData.permanentAddress}
                  onChange={handleAddTenantInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={addTenantFormData.city}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={addTenantFormData.state}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Identity & Occupation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity & Occupation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                <input
                  type="text"
                  name="aadharNumber"
                  value={addTenantFormData.aadharNumber}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                <input
                  type="text"
                  name="occupation"
                  value={addTenantFormData.occupation}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">College/Company/Institute Name</label>
                <input
                  type="text"
                  name="collegeCompanyName"
                  value={addTenantFormData.collegeCompanyName}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office/College/Institute Address</label>
                <textarea
                  name="officeAddress"
                  value={addTenantFormData.officeAddress}
                  onChange={handleAddTenantInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Duration of Stay</label>
                <input
                  type="text"
                  name="expectedDurationStay"
                  value={addTenantFormData.expectedDurationStay}
                  onChange={handleAddTenantInputChange}
                  placeholder="e.g., 3 years, 2 years"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={addTenantFormData.emergencyContactName}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                <input
                  type="text"
                  name="emergencyContactRelation"
                  value={addTenantFormData.emergencyContactRelation}
                  onChange={handleAddTenantInputChange}
                  placeholder="e.g., Father, Mother, Brother"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Number</label>
                <input
                  type="tel"
                  name="emergencyContactNumber"
                  value={addTenantFormData.emergencyContactNumber}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Room & Accommodation Details (Optional) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Room & Accommodation Details (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={addTenantFormData.email}
                  onChange={handleAddTenantInputChange}
                  placeholder="tenant@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                <input
                  type="text"
                  name="roomNumber"
                  value={addTenantFormData.roomNumber}
                  onChange={handleAddTenantInputChange}
                  placeholder="e.g., 208, 108-209"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Category</label>
                <select
                  name="roomCategory"
                  value={addTenantFormData.roomCategory}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation Type</label>
                <select
                  name="accommodationType"
                  value={addTenantFormData.accommodationType}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type</option>
                  <option value="Single">Single</option>
                  <option value="Two">Two</option>
                  <option value="Three">Three</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                <input
                  type="date"
                  name="checkInDate"
                  value={addTenantFormData.checkInDate}
                  onChange={handleAddTenantInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Proof URL</label>
                <input
                  type="url"
                  name="aadharProofUrl"
                  value={addTenantFormData.aadharProofUrl}
                  onChange={handleAddTenantInputChange}
                  placeholder="Google Drive link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="withFood"
                    checked={addTenantFormData.withFood}
                    onChange={(e) => setAddTenantFormData({ ...addTenantFormData, withFood: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">With Food</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddTenantModalOpen(false);
                setAddTenantFormData({
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  tenantId: '',
                  fatherName: '',
                  dateOfBirth: '',
                  whatsappNumber: '',
                  permanentAddress: '',
                  city: '',
                  state: '',
                  aadharNumber: '',
                  occupation: '',
                  collegeCompanyName: '',
                  officeAddress: '',
                  expectedDurationStay: '',
                  emergencyContactName: '',
                  emergencyContactNumber: '',
                  emergencyContactRelation: '',
                  roomNumber: '',
                  roomCategory: '',
                  accommodationType: '',
                  withFood: false,
                  checkInDate: '',
                  aadharProofUrl: '',
                });
              }}
              disabled={createTenantMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createTenantMutation.isPending}
            >
              {createTenantMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tenant
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TenantsPage;
