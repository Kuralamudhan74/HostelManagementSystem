import axios, { AxiosInstance, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { AuthUser, LoginForm, RegisterForm, PaymentForm, PaymentAllocationData } from '../types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              // Use axios directly for refresh to avoid infinite loop
              const response = await axios.post('/api/auth/refresh', {
                refreshToken,
              }, {
                headers: {
                  'Content-Type': 'application/json'
                }
              });

              const { token: accessToken, refreshToken: newRefreshToken } = response.data;
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return axios(originalRequest);
            } else {
              // No refresh token, redirect to login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
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
  async login(credentials: LoginForm): Promise<AuthUser> {
    const response: AxiosResponse<AuthUser> = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterForm): Promise<{ message: string; user: any }> {
    const response = await this.client.post('/auth/register', userData);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.client.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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

  async getTenantProfile(tenantId: string): Promise<{ user: any }> {
    const response = await this.client.get(`/admin/tenants/${tenantId}/profile`);
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

  // Tenant endpoints
  async getMyDues(month?: string): Promise<{ dues: any; paymentHistory: any[]; currentRent?: any }> {
    const params = month ? { month } : {};
    const response = await this.client.get('/me/dues', { params });
    return response.data;
  }

  async getMyTenancy(): Promise<{ tenancy: any }> {
    const response = await this.client.get('/me/tenancy');
    return response.data;
  }

  async getMyPaymentHistory(page = 1, limit = 10): Promise<{ payments: any[] }> {
    const response = await this.client.get('/me/payments', {
      params: { page, limit }
    });
    return response.data;
  }

  async getMyRentHistory(year?: string, month?: string): Promise<{ rents: any[] }> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await this.client.get('/me/rents', { params });
    return response.data;
  }

  async getMyBillHistory(): Promise<{ bills: any[] }> {
    const response = await this.client.get('/me/bills');
    return response.data;
  }

  async getMyDashboard(): Promise<any> {
    const response = await this.client.get('/me/dashboard');
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
  async getDashboardStats(): Promise<any> {
    const response = await this.client.get('/admin/dashboard/stats');
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
