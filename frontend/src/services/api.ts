import axios, { AxiosInstance } from 'axios';
import toast from 'react-hot-toast';
import { LoginForm, RegisterForm, PaymentForm, PaymentAllocationData } from '../types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add user ID from localStorage to headers
    this.client.interceptors.request.use(
      (config) => {
        // Get user from localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user && user.id) {
              // Add user ID to custom header
              config.headers['x-user-id'] = user.id;
            }
          } catch (e) {
            console.error('Failed to parse user from localStorage:', e);
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle 401 errors - redirect to login
        if (error.response?.status === 401) {
          // Clear localStorage
          localStorage.removeItem('user');

          // Redirect to login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // Show error toast for non-401 errors
        if (error.response?.status && error.response.status !== 401 && error.response.status !== 403) {
          const message = error.response?.data?.message || 'An error occurred';
          toast.error(message);
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginForm): Promise<{ message: string; user: any }> {
    const response = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterForm): Promise<{ message: string; user: any }> {
    const response = await this.client.post('/auth/register', userData);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    // Clear localStorage
    localStorage.removeItem('user');
  }

  // User profile endpoints
  async getProfile(): Promise<{ user: any }> {
    const response = await this.client.get('/me');
    return response.data;
  }

  async updateProfile(data: any): Promise<{ user: any }> {
    const response = await this.client.patch('/me', data);
    return response.data;
  }

  async changePassword(data: { currentPassword?: string; secretCode?: string; newPassword: string; confirmPassword: string }): Promise<{ message: string }> {
    const response = await this.client.post('/me/change-password', data);
    return response.data;
  }

  // Admin endpoints
  async getHostels(): Promise<{ hostels: any[] }> {
    const response = await this.client.get('/admin/hostels');
    return response.data;
  }

  async createHostel(data: { name: string; address: string; ownerId: string }): Promise<any> {
    const response = await this.client.post('/admin/hostels', data);
    return response.data;
  }

  async getRooms(hostelId?: string): Promise<{ rooms: any[] }> {
    const params = hostelId ? { hostelId } : {};
    const response = await this.client.get('/admin/rooms', { params });
    return response.data;
  }

  async createRoom(data: { roomNumber: string; hostelId: string; capacity: number; rentAmount: number }): Promise<any> {
    const response = await this.client.post('/admin/rooms', data);
    return response.data;
  }

  async addTenantToRoom(roomId: string, data: { tenantId: string; startDate: string; tenantShare?: number }): Promise<any> {
    const response = await this.client.post(`/admin/rooms/${roomId}/tenants`, data);
    return response.data;
  }

  async updateRoom(roomId: string, data: { roomNumber?: string; capacity?: number; rentAmount?: number; isAC?: boolean; bathroomAttached?: boolean }): Promise<{ message: string; room: any }> {
    const response = await this.client.patch(`/admin/rooms/${roomId}`, data);
    return response.data;
  }

  async deleteRoom(roomId: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/admin/rooms/${roomId}`);
    return response.data;
  }

  async endTenancy(tenancyId: string): Promise<{ message: string; tenancy: any }> {
    const response = await this.client.patch(`/admin/tenancies/${tenancyId}/end`);
    return response.data;
  }

  async updateTenancy(tenancyId: string, data: { roomId?: string; tenantShare?: number; startDate?: string }): Promise<{ message: string; tenancy: any }> {
    const response = await this.client.patch(`/admin/tenancies/${tenancyId}`, data);
    return response.data;
  }

  async updateTenancyEBBill(tenancyId: string, currentMonthEBBill: number): Promise<{ message: string; currentMonthEBBill: number }> {
    const response = await this.client.patch(`/admin/tenancies/${tenancyId}/ebbill`, { currentMonthEBBill });
    return response.data;
  }

  async updateTenancyPreviousRentDue(tenancyId: string, previousRentDue: number): Promise<{ message: string; previousRentDue: number }> {
    const response = await this.client.patch(`/admin/tenancies/${tenancyId}/previous-rent-due`, { previousRentDue });
    return response.data;
  }

  async getTenants(params?: {
    hostelId?: string;
    room?: string;
    name?: string;
    month?: string;
    active?: string;
    includeUnassigned?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ tenancies: any[]; allTenantUsers?: any[]; pagination: any }> {
    const requestParams: any = { ...params };
    if (params?.includeUnassigned) {
      requestParams.includeUnassigned = 'true';
    }
    const response = await this.client.get('/admin/tenants', { params: requestParams });
    return response.data;
  }

  async createTenant(data: any): Promise<{ user: any; message: string }> {
    const response = await this.client.post('/admin/tenants', data);
    return response.data;
  }

  async getTenantProfile(tenantId: string): Promise<{ user: any }> {
    const response = await this.client.get(`/admin/tenants/${tenantId}/profile`);
    return response.data;
  }

  async updateTenantProfile(tenantId: string, data: any): Promise<{ user: any; message: string }> {
    const response = await this.client.patch(`/admin/tenants/${tenantId}/profile`, data);
    return response.data;
  }

  async updateTenantAdvance(tenantId: string, advanceAmount: number): Promise<{ message: string; advanceAmount: number }> {
    const response = await this.client.patch(`/admin/tenants/${tenantId}/advance`, { advanceAmount });
    return response.data;
  }

  async importTenantsFromCSV(file: File): Promise<{
    message: string;
    success: number;
    failed: number;
    errors: Array<{ row: number; name?: string; reason: string }>;
    createdTenants: Array<{ tenantId: string; firstName: string; lastName: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post('/admin/tenants/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async deleteTenant(tenantId: string): Promise<{ message: string; tenanciesEnded: number }> {
    const response = await this.client.delete(`/admin/tenants/${tenantId}`);
    return response.data;
  }

  async permanentlyDeleteTenant(tenantId: string): Promise<{ message: string; deletedRecords: any }> {
    const response = await this.client.delete(`/admin/tenants/${tenantId}/permanent`);
    return response.data;
  }

  async recordPayment(data: PaymentForm): Promise<any> {
    const response = await this.client.post('/admin/payments', data);
    return response.data;
  }

  async getPayments(params?: {
    tenantId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ payments: any[]; pagination: any }> {
    const response = await this.client.get('/admin/payments', { params });
    return response.data;
  }

  async suggestPaymentAllocations(tenantId: string, amount: number): Promise<{ suggestions: PaymentAllocationData[] }> {
    const response = await this.client.get('/admin/payments/suggest', {
      params: { tenantId, amount }
    });
    return response.data;
  }

  async deletePayment(paymentId: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/admin/payments/${paymentId}`);
    return response.data;
  }

  async updatePayment(paymentId: string, data: {
    amount?: number;
    paymentMethod?: string;
    paymentDate?: string;
    paymentPeriodStart?: string;
    paymentPeriodEnd?: string;
    description?: string;
    paymentType?: 'full' | 'partial';
    remainingAmount?: number;
  }): Promise<{ message: string; payment: any }> {
    const response = await this.client.patch(`/admin/payments/${paymentId}`, data);
    return response.data;
  }

  async getExpenseCategories(): Promise<{ categories: any[] }> {
    const response = await this.client.get('/admin/expense-categories');
    return response.data;
  }

  async createExpenseCategory(data: { name: string; description?: string }): Promise<any> {
    const response = await this.client.post('/admin/expense-categories', data);
    return response.data;
  }

  async createExpense(data: {
    hostelId: string;
    categoryId: string;
    amount: number;
    description: string;
    expenseDate: string;
  }): Promise<any> {
    const response = await this.client.post('/admin/expenses', data);
    return response.data;
  }

  async getExpenses(params?: {
    hostelId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ expenses: any[]; pagination: any }> {
    const response = await this.client.get('/admin/expenses', { params });
    return response.data;
  }

  async updateExpense(expenseId: string, data: {
    hostelId?: string;
    categoryId?: string;
    amount?: number;
    description?: string;
    expenseDate?: string;
  }): Promise<{ message: string; expense: any }> {
    const response = await this.client.patch(`/admin/expenses/${expenseId}`, data);
    return response.data;
  }

  async deleteExpense(expenseId: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/admin/expenses/${expenseId}`);
    return response.data;
  }

  async updateHostel(hostelId: string, data: { name?: string; address?: string }): Promise<{ message: string; hostel: any }> {
    const response = await this.client.patch(`/admin/hostels/${hostelId}`, data);
    return response.data;
  }

  // Attachment endpoints
  async uploadAttachment(file: File, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }

    const response = await this.client.post('/attachments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getAttachmentInfo(id: string): Promise<{ attachment: any }> {
    const response = await this.client.get(`/attachments/${id}`);
    return response.data;
  }

  async downloadAttachment(id: string): Promise<Blob> {
    const response = await this.client.get(`/attachments/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.client.delete(`/attachments/${id}`);
  }

  async getMyAttachments(page = 1, limit = 10): Promise<{ attachments: any[]; pagination: any }> {
    const response = await this.client.get('/me/attachments', {
      params: { page, limit }
    });
    return response.data;
  }

  // Dashboard stats
  async getDashboardStats(hostelId?: string): Promise<any> {
    const response = await this.client.get('/admin/dashboard/stats', {
      params: { hostelId }
    });
    return response.data;
  }

  // Financial overview
  async getFinancialOverview(params?: {
    year?: number;
    hostelId?: string;
    months?: number;
  }): Promise<{
    chartData: Array<{
      month: string;
      hostelId: string;
      hostelName: string;
      income: number;
      expense: number;
      profit: number;
    }>;
    profitabilityTable: Array<{
      hostelId: string;
      hostelName: string;
      totalIncome: number;
      totalExpense: number;
      profit: number;
      status: string;
    }>;
    summary: {
      totalIncome: number;
      totalExpense: number;
      totalProfit: number;
    };
    filters: {
      year: number;
      hostelId: string | null;
      months: number;
    };
  }> {
    const response = await this.client.get('/admin/financial-overview', { params });
    return response.data;
  }

  // EB Bill management
  async createOrUpdateEBBill(data: { roomId: string; amount: number; period: string }): Promise<any> {
    const response = await this.client.post('/admin/eb-bills', data);
    return response.data;
  }

  async getRoomEBBills(params?: { roomId?: string; period?: string }): Promise<{ ebBills: any[] }> {
    const response = await this.client.get('/admin/eb-bills', { params });
    return response.data;
  }

  // Update rent payment status
  async updateRentPaymentStatus(rentId: string, isPaidInFull: boolean): Promise<any> {
    const response = await this.client.patch(`/admin/rents/${rentId}/payment-status`, { isPaidInFull });
    return response.data;
  }

  // Update tenant status
  async updateTenantStatus(tenantId: string, isActive: boolean): Promise<any> {
    const response = await this.client.patch(`/admin/tenants/${tenantId}/status`, { isActive });
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
