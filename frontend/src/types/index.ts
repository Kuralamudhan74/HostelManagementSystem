// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'tenant';
  tenantId?: string;
  fatherName?: string;
  dateOfBirth?: string;
  whatsappNumber?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  aadharNumber?: string;
  occupation?: string;
  collegeCompanyName?: string;
  officeAddress?: string;
  expectedDurationStay?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelation?: string;
  // New fields from Google Form
  roomNumber?: string;
  roomCategory?: string;
  accommodationType?: string;
  withFood?: boolean;
  checkInDate?: string;
  aadharProofUrl?: string;
  // Financial fields
  advanceAmount?: number;
  isActive?: boolean;
  createdAt: string;
}

export interface AuthUser extends User {
  accessToken: string;
  refreshToken: string;
}

// Owner types
export interface Owner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

// Hostel types
export interface Hostel {
  id: string;
  name: string;
  address: string;
  ownerId: string;
  totalRooms: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Room types
export interface Room {
  id: string;
  roomNumber: string;
  hostelId: string;
  capacity: number;
  rentAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tenancy types
export interface Tenancy {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate?: string;
  tenantShare?: number;
  currentMonthEBBill?: number;
  previousRentDue?: number; // Accumulated unpaid rent from previous months
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Monthly Rent types
export interface MonthlyRent {
  id: string;
  tenancyId: string;
  amount: number;
  amountPaid: number;
  status: 'due' | 'partial' | 'paid';
  dueDate: string;
  period: string;
  lateFee?: number;
  createdAt: string;
  updatedAt: string;
}

// Bill types
export interface Bill {
  id: string;
  tenancyId: string;
  title: string;
  description?: string;
  amount: number;
  amountPaid: number;
  status: 'due' | 'partial' | 'paid';
  dueDate: string;
  billType: 'electricity' | 'water' | 'maintenance' | 'other';
  createdAt: string;
  updatedAt: string;
}

// Payment types
export interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'other';
  paymentDate: string;
  description?: string;
  receiptAttachmentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment Allocation types
export interface PaymentAllocation {
  id: string;
  paymentId: string;
  dueId: string;
  dueType: 'rent' | 'bill';
  allocatedAmount: number;
  createdAt: string;
}

// Expense types
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  hostelId: string;
  categoryId: string;
  amount: number;
  description: string;
  expenseDate: string;
  attachmentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Inventory types
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomInventory {
  id: string;
  roomId: string;
  itemId: string;
  quantity: number;
  condition: 'good' | 'fair' | 'poor' | 'damaged';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Audit Log types
export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: 'admin' | 'tenant';
  tableName: string;
  recordId: string;
  actionType: 'create' | 'update' | 'delete';
  beforeJson?: any;
  afterJson?: any;
  createdAt: string;
}

// Attachment types
export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  storageType: 'gridfs' | 'local';
  gridfsId?: string;
  localPath?: string;
  uploadedBy: string;
  uploadedAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'tenant';
}

export interface PaymentForm {
  tenantId: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'other';
  paymentDate: string;
  paymentPeriodStart?: string;
  paymentPeriodEnd?: string;
  description?: string;
  allocations: PaymentAllocationData[];
}

export interface PaymentAllocationData {
  dueId: string;
  dueType: 'rent' | 'bill';
  amount: number;
}

// Dashboard types
export interface DashboardStats {
  totalHostels: number;
  totalRooms: number;
  totalTenants: number;
  occupancyRate: number;
  totalRevenue: number;
  outstandingDues: number;
}

export interface TenantDashboard {
  tenancy?: Tenancy;
  dues: {
    rents: MonthlyRent[];
    bills: Bill[];
    totalOutstanding: number;
  };
  recentPayments: Payment[];
  currentRent?: MonthlyRent;
}
