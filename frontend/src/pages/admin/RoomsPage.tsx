import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ArrowLeft, Plus, Users, CheckCircle, Search, Trash2, Zap, AirVent, Bath } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import apiClient from '../../services/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { formatCurrency } from '../../utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  hostelId: z.string().min(1, 'Hostel is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  rentAmount: z.number().min(1, 'Rent amount must be at least 1'),
  isAC: z.boolean().optional(),
  bathroomAttached: z.boolean().optional(),
});

const addTenantSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  startDate: z.string().min(1, 'Start date is required'),
  tenantShare: z.number().min(1, 'Share amount is required'),
  withFood: z.boolean().optional(),
});

const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isAssignTenantModalOpen, setIsAssignTenantModalOpen] = useState(false);
  const [isReassignConfirmModalOpen, setIsReassignConfirmModalOpen] = useState(false);
  const [isDeleteRoomModalOpen, setIsDeleteRoomModalOpen] = useState(false);
  const [isEBBillModalOpen, setIsEBBillModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [ebBillAmount, setEbBillAmount] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [debouncedTenantSearch, setDebouncedTenantSearch] = useState('');
  const [pendingAssignmentData, setPendingAssignmentData] = useState<any>(null);
  const [selectedHostelFilter, setSelectedHostelFilter] = useState<string>('');

  // Debounce tenant search with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTenantSearch(tenantSearch);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [tenantSearch]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(createRoomSchema),
  });

  const assignTenantForm = useForm({
    resolver: zodResolver(addTenantSchema),
  });

  // Fetch rooms
  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.getRooms(),
  });

  // Fetch hostels
  const { data: hostelsData } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => apiClient.getHostels(),
  });

  // Fetch tenants including unassigned ones
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.getTenants({ limit: 100, includeUnassigned: true }),
  });

  // Fetch EB bills for rooms
  const { data: ebBillsData } = useQuery({
    queryKey: ['eb-bills'],
    queryFn: () => apiClient.getRoomEBBills(),
  });

  const handleAddRoom = async (data: any) => {
    try {
      console.log('Creating room with data:', data);
      await apiClient.createRoom(data);
      toast.success('Room created successfully');
      setIsAddRoomModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (error: any) {
      console.error('Create room error:', error);
      toast.error(error.response?.data?.message || 'Failed to create room');
    }
  };

  const handleAssignTenant = async (data: any) => {
    try {
      const roomId = selectedRoom.id || selectedRoom._id;
      if (!roomId) {
        toast.error('Room ID is missing');
        return;
      }

      // Check if tenant is already assigned to a room
      const existingTenancy = tenancies.find((t: any) => {
        const tenantId = t.tenantId?.id || t.tenantId?._id || t.tenantId;
        const searchTenantId = data.tenantId;
        return tenantId === searchTenantId && t.isActive;
      });

      if (existingTenancy) {
        // Show confirmation modal for reassignment
        setPendingAssignmentData({ roomId, ...data });
        setIsAssignTenantModalOpen(false);
        setIsReassignConfirmModalOpen(true);
        return;
      }
      
      await apiClient.addTenantToRoom(roomId, data);
      toast.success('Tenant assigned to room successfully');
      setIsAssignTenantModalOpen(false);
      assignTenantForm.reset();
      setTenantSearch('');
      setDebouncedTenantSearch('');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    } catch (error: any) {
      console.error('Assign tenant error:', error);
      toast.error(error.response?.data?.message || 'Failed to assign tenant');
    }
  };

  const handleConfirmReassignment = async () => {
    if (!pendingAssignmentData) return;

    try {
      const { roomId, ...data } = pendingAssignmentData;
      
      // First, unassign from previous room
      const existingTenancy = tenancies.find((t: any) => {
        const tenantId = t.tenantId?.id || t.tenantId?._id || t.tenantId;
        return tenantId === data.tenantId && t.isActive;
      });

      if (existingTenancy) {
        // End the previous tenancy
        await fetch(`/api/admin/tenancies/${existingTenancy.id || existingTenancy._id}/end`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
      }

      // Assign to new room
      await apiClient.addTenantToRoom(roomId, data);
      toast.success('Tenant reassigned to room successfully');
      setIsReassignConfirmModalOpen(false);
      setPendingAssignmentData(null);
      assignTenantForm.reset();
      setTenantSearch('');
      setDebouncedTenantSearch('');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    } catch (error: any) {
      console.error('Reassign tenant error:', error);
      toast.error(error.response?.data?.message || 'Failed to reassign tenant');
    }
  };

  const handleAssignClick = (room: any) => {
    setSelectedRoom(room);
    setIsAssignTenantModalOpen(true);
  };

  const handleDeleteClick = (room: any) => {
    setSelectedRoom(room);
    setIsDeleteRoomModalOpen(true);
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    
    try {
      const response = await fetch(`/api/admin/rooms/${selectedRoom.id || selectedRoom._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete room');
        return;
      }
      
      toast.success('Room deleted successfully');
      setIsDeleteRoomModalOpen(false);
      setSelectedRoom(null);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (error: any) {
      console.error('Delete room error:', error);
      toast.error('Failed to delete room');
    }
  };

  const handleEBBillClick = (room: any) => {
    setSelectedRoom(room);
    // Get current month EB bill if exists
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const existingBill = ebBillsData?.ebBills?.find((bill: any) => 
      bill.roomId?._id === room._id && bill.period === currentPeriod
    );
    setEbBillAmount(existingBill?.amount?.toString() || '');
    setIsEBBillModalOpen(true);
  };

  const handleUpdateEBBill = async () => {
    if (!selectedRoom || !ebBillAmount) {
      toast.error('Please enter EB bill amount');
      return;
    }

    try {
      const currentDate = new Date();
      const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      await apiClient.createOrUpdateEBBill({
        roomId: selectedRoom.id || selectedRoom._id,
        amount: parseFloat(ebBillAmount),
        period: currentPeriod
      });

      toast.success('EB Bill updated successfully');
      setIsEBBillModalOpen(false);
      setSelectedRoom(null);
      setEbBillAmount('');
      queryClient.invalidateQueries({ queryKey: ['eb-bills'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-dues'] });
    } catch (error: any) {
      console.error('Update EB bill error:', error);
      toast.error(error.response?.data?.message || 'Failed to update EB bill');
    }
  };

  const allRooms = roomsData?.rooms || [];
  const tenancies = tenantsData?.tenancies || [];
  const allTenantUsers = tenantsData?.allTenantUsers || [];

  // Filter rooms by hostel
  const filteredRooms = useMemo(() => {
    if (!selectedHostelFilter) return allRooms;
    return allRooms.filter((room: any) => {
      const roomHostelId = room.hostelId?._id || room.hostelId?.id || room.hostelId;
      return roomHostelId === selectedHostelFilter;
    });
  }, [allRooms, selectedHostelFilter]);

  // Helper function to get tenants for a room
  const getTenantsForRoom = (roomId: string) => {
    return tenancies.filter((t: any) => {
      const roomIdFromTenancy = t.roomId?.id || t.roomId?._id || t.roomId;
      return roomIdFromTenancy === roomId && t.isActive;
    });
  };

  const rooms = filteredRooms; // Use filtered rooms

  // Get available tenants (both unassigned and those not currently in the selected room)
  const availableTenantsForAssigning = useMemo(() => {
    // Get all tenant IDs that are currently in an active tenancy
    const activeTenancyTenantIds = new Set(
      tenancies
        .filter((t: any) => t.isActive)
        .map((t: any) => t.tenantId?.id || t.tenantId?._id || t.tenantId)
    );

    // Get unassigned tenant users (not in any active tenancy)
    // IMPORTANT: Only include active tenants (exclude past/inactive tenants)
    const unassignedTenants = allTenantUsers.filter(
      (user: any) => 
        user.isActive !== false && // Only active tenants
        !activeTenancyTenantIds.has(user.id || user._id)
    );

    // Get tenants who are assigned to a different room (for reassignment)
    const tenantsFromOtherRooms = tenancies
      .filter((t: any) => {
        const roomIdFromTenancy = t.roomId?.id || t.roomId?._id || t.roomId;
        const selectedRoomId = selectedRoom?.id || selectedRoom?._id;
        return t.isActive && roomIdFromTenancy !== selectedRoomId;
      })
      .map((t: any) => t.tenantId);

    // Combine both lists, removing duplicates
    const allAvailable = [...unassignedTenants];
    const addedIds = new Set(allAvailable.map((u: any) => u.id || u._id));
    
    tenantsFromOtherRooms.forEach((tenant: any) => {
      const tenantId = tenant?.id || tenant?._id;
      if (tenantId && !addedIds.has(tenantId)) {
        allAvailable.push(tenant);
        addedIds.add(tenantId);
      }
    });

    // Filter by search term (case-insensitive)
    if (debouncedTenantSearch.trim()) {
      const searchLower = debouncedTenantSearch.toLowerCase();
      return allAvailable.filter((tenant: any) => {
        const fullName = `${tenant.firstName || ''} ${tenant.lastName || ''}`.toLowerCase();
        const email = (tenant.email || '').toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }

    return allAvailable;
  }, [tenancies, allTenantUsers, selectedRoom, debouncedTenantSearch]);

  // Helper function to get available capacity
  const getAvailableCapacity = (room: any) => {
    const currentTenants = getTenantsForRoom(room.id);
    return room.capacity - currentTenants.length;
  };

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
                <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
                <p className="text-sm text-gray-600">
                  {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsAddRoomModalOpen(true)}
                variant="primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hostel Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Hostel
          </label>
          <select
            value={selectedHostelFilter}
            onChange={(e) => setSelectedHostelFilter(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Hostels</option>
            {hostelsData?.hostels?.map((hostel: any) => (
              <option key={hostel.id || hostel._id} value={hostel.id || hostel._id}>
                {hostel.name}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room: any) => {
              const currentTenants = getTenantsForRoom(room.id || room._id);
              const availableCapacity = getAvailableCapacity(room);

              return (
                <motion.div
                  key={room.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        availableCapacity > 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <Building2 className={`w-6 h-6 ${
                          availableCapacity > 0 ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">{room.roomNumber}</h3>
                        <p className="text-sm text-gray-500">
                          {(room.hostelId && (room.hostelId.name || room.hostelId)) || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {availableCapacity === 0 && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        Full
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Capacity</span>
                      <span className="font-medium">{currentTenants.length} / {room.capacity}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Monthly Rent</span>
                      <span className="font-medium">{formatCurrency(room.rentAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Available</span>
                      <span className={`font-medium ${
                        availableCapacity > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {availableCapacity} bed{availableCapacity !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Features</span>
                      <div className="flex items-center gap-3">
                        {room.isAC && (
                          <span className="flex items-center gap-1 text-blue-600" title="AC">
                            <AirVent className="w-4 h-4" />
                            <span className="text-xs">AC</span>
                          </span>
                        )}
                        {room.bathroomAttached && (
                          <span className="flex items-center gap-1 text-green-600" title="Bathroom Attached">
                            <Bath className="w-4 h-4" />
                            <span className="text-xs">Bath</span>
                          </span>
                        )}
                        {!room.isAC && !room.bathroomAttached && (
                          <span className="text-gray-400 text-xs">No special features</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current EB Bill</span>
                      <span className="font-medium">
                        {(() => {
                          const currentDate = new Date();
                          const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                          const currentBill = ebBillsData?.ebBills?.find((bill: any) => 
                            bill.roomId?._id === room._id && bill.period === currentPeriod
                          );
                          return currentBill ? formatCurrency(currentBill.amount) : formatCurrency(0);
                        })()}
                      </span>
                    </div>
                  </div>

                  {currentTenants.length > 0 && (
                    <div className="mb-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Current Tenants:</p>
                      <div className="space-y-2">
                        {currentTenants.map((tenancy: any) => (
                          <div key={tenancy.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-700">
                                {tenancy.tenantId?.firstName} {tenancy.tenantId?.lastName}
                              </span>
                            </div>
                            <span className="text-gray-600">{formatCurrency(tenancy.tenantShare || 0)}/mo</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    {availableCapacity > 0 ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={() => handleAssignClick(room)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Tenant
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        disabled
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Room Full
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleEBBillClick(room)}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Update EB Bill
                    </Button>
                    {currentTenants.length === 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(room)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Room
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {rooms.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first room</p>
            <Button onClick={() => setIsAddRoomModalOpen(true)} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Add First Room
            </Button>
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddRoomModalOpen}
        onClose={() => {
          setIsAddRoomModalOpen(false);
          reset();
        }}
        title="Add New Room"
      >
        <form onSubmit={handleSubmit(handleAddRoom)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Number *
            </label>
            <input
              type="text"
              {...register('roomNumber')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="101"
            />
            {errors.roomNumber && (
              <p className="text-red-500 text-xs mt-1">{errors.roomNumber.message as string}</p>
            )}
          </div>

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
              Capacity (beds) *
            </label>
            <input
              type="number"
              {...register('capacity', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              min="1"
              placeholder="2"
            />
            {errors.capacity && (
              <p className="text-red-500 text-xs mt-1">{errors.capacity.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Rent (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              {...register('rentAmount', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              min="1"
              placeholder="500.00"
            />
            {errors.rentAmount && (
              <p className="text-red-500 text-xs mt-1">{errors.rentAmount.message as string}</p>
            )}
          </div>

          <div className="flex items-center space-x-6 pt-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('isAC')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Air Conditioned</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('bathroomAttached')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Bathroom Attached</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddRoomModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Create Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Tenant Modal */}
      {selectedRoom && (
        <Modal
          isOpen={isAssignTenantModalOpen}
          onClose={() => {
            setIsAssignTenantModalOpen(false);
            assignTenantForm.reset();
            setSelectedRoom(null);
            setTenantSearch('');
            setDebouncedTenantSearch('');
          }}
          title={`Assign Tenant to ${selectedRoom.roomNumber}`}
        >
          <form onSubmit={assignTenantForm.handleSubmit(handleAssignTenant)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Tenant *
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Type to search tenants..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {availableTenantsForAssigning.length > 0 ? (
                <>
                  <select
                    {...assignTenantForm.register('tenantId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select a tenant --</option>
                    {availableTenantsForAssigning.map((tenant: any) => (
                      <option key={tenant.id || tenant._id} value={tenant.id || tenant._id}>
                        {tenant.firstName} {tenant.lastName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {availableTenantsForAssigning.length} tenant{availableTenantsForAssigning.length !== 1 ? 's' : ''} available
                  </p>
                </>
              ) : (
                <div className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                  <p className="text-sm text-gray-500 text-center">
                    {tenantSearch ? 'No tenants found' : 'No tenants available'}
                  </p>
                </div>
              )}
              
              {assignTenantForm.formState.errors.tenantId && (
                <p className="text-red-500 text-xs mt-1">
                  {assignTenantForm.formState.errors.tenantId.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                {...assignTenantForm.register('startDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {assignTenantForm.formState.errors.startDate && (
                <p className="text-red-500 text-xs mt-1">
                  {assignTenantForm.formState.errors.startDate.message as string}
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
                {...assignTenantForm.register('tenantShare', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="250.00"
              />
              {assignTenantForm.formState.errors.tenantShare && (
                <p className="text-red-500 text-xs mt-1">
                  {assignTenantForm.formState.errors.tenantShare.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...assignTenantForm.register('withFood')}
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
                  setIsAssignTenantModalOpen(false);
                  assignTenantForm.reset();
                  setSelectedRoom(null);
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

      {/* Reassignment Confirmation Modal */}
      <Modal
        isOpen={isReassignConfirmModalOpen}
        onClose={() => {
          setIsReassignConfirmModalOpen(false);
          setPendingAssignmentData(null);
          setIsAssignTenantModalOpen(false);
        }}
        title="Tenant Already Assigned"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-gray-700 mb-2">
              This tenant is already assigned to a room. Do you want to reassign them to this new room?
            </p>
            {pendingAssignmentData && (
              <div className="text-sm text-gray-600">
                <p><strong>New Room:</strong> {selectedRoom?.roomNumber}</p>
                {(() => {
                  const currentTenancy = tenancies.find((t: any) => {
                    const tenantId = t.tenantId?.id || t.tenantId?._id || t.tenantId;
                    return tenantId === pendingAssignmentData.tenantId && t.isActive;
                  });
                  if (currentTenancy) {
                    return <p><strong>Current Room:</strong> {currentTenancy.roomId?.roomNumber}</p>;
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsReassignConfirmModalOpen(false);
                setPendingAssignmentData(null);
                setIsAssignTenantModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReassignment}
              variant="primary"
            >
              Yes, Reassign to New Room
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Room Confirmation Modal */}
      <Modal
        isOpen={isDeleteRoomModalOpen}
        onClose={() => {
          setIsDeleteRoomModalOpen(false);
          setSelectedRoom(null);
        }}
        title="Delete Room"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete room <strong>{selectedRoom?.roomNumber}</strong>?
          </p>
          {selectedRoom && getAvailableCapacity(selectedRoom) === selectedRoom.capacity && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">
                This room has no tenants and will be permanently deleted. This action cannot be undone.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteRoomModalOpen(false);
                setSelectedRoom(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRoom}
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Room
            </Button>
          </div>
        </div>
      </Modal>

      {/* EB Bill Modal */}
      <Modal
        isOpen={isEBBillModalOpen}
        onClose={() => {
          setIsEBBillModalOpen(false);
          setSelectedRoom(null);
          setEbBillAmount('');
        }}
        title="Update EB Bill"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              Room: <strong>{selectedRoom?.roomNumber}</strong>
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Current Month: <strong>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
            </p>
            {selectedRoom && getTenantsForRoom(selectedRoom.id).length > 0 && (
              <p className="text-sm text-blue-800 mt-2">
                Active Tenants: <strong>{getTenantsForRoom(selectedRoom.id).length}</strong> 
                <span className="text-xs ml-2">
                  (EB will be divided equally: {ebBillAmount ? formatCurrency(parseFloat(ebBillAmount) / getTenantsForRoom(selectedRoom.id).length) : formatCurrency(0)} per tenant)
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total EB Bill Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={ebBillAmount}
              onChange={(e) => setEbBillAmount(e.target.value)}
              placeholder="Enter EB bill amount"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This amount will be divided equally among all active tenants in this room.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEBBillModalOpen(false);
                setSelectedRoom(null);
                setEbBillAmount('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEBBill}
              variant="primary"
            >
              Update EB Bill
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RoomsPage;
