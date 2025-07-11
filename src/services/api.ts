import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from '../constants';
import { 
  ApiResponse, 
  LoginCredentials, 
  RegisterCredentials, 
  GoogleAuthCredentials,
  User,
  Product,
  ProductFilters,
  PaginatedResponse,
  Cart,
  CartItem,
  Order,
  Payment,
  Conversation,
  ChatMessage,
  Address
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear stored auth data
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.AUTH_TOKEN,
            STORAGE_KEYS.USER_DATA
          ]);
          // Redirect to login or emit auth error event
        }
        return Promise.reject(error);
      }
    );
  }

  private handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'API Error');
  }

  // Authentication APIs
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await this.api.post('/auth/login', credentials);
    return this.handleResponse(response);
  }

  async register(credentials: RegisterCredentials): Promise<{ user: User; token: string }> {
    const response = await this.api.post('/auth/register', credentials);
    return this.handleResponse(response);
  }

  async googleLogin(credentials: GoogleAuthCredentials): Promise<{ user: User; token: string }> {
    const response = await this.api.post('/auth/google', credentials);
    return this.handleResponse(response);
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
  }

  async getProfile(): Promise<User> {
    const response = await this.api.get('/auth/profile');
    return this.handleResponse(response);
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await this.api.patch('/auth/profile', userData);
    return this.handleResponse(response);
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await this.api.patch('/auth/change-password', data);
  }

  async forgotPassword(email: string): Promise<void> {
    await this.api.post('/auth/forgot-password', { email });
  }

  async resetPassword(data: { token: string; newPassword: string }): Promise<void> {
    await this.api.post('/auth/reset-password', data);
  }

  // Product APIs
  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const response = await this.api.get('/products', { params: filters });
    return this.handleResponse(response);
  }

  async getProduct(id: string): Promise<Product> {
    const response = await this.api.get(`/products/${id}`);
    return this.handleResponse(response);
  }

  async searchProducts(query: string, filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const response = await this.api.get('/products/search', { 
      params: { search: query, ...filters } 
    });
    return this.handleResponse(response);
  }

  async getProductCategories(): Promise<string[]> {
    const response = await this.api.get('/products/categories');
    return this.handleResponse(response);
  }

  // Cart APIs
  async getCart(): Promise<Cart> {
    const response = await this.api.get('/cart');
    return this.handleResponse(response);
  }

  async addToCart(productId: string, quantity: number): Promise<Cart> {
    const response = await this.api.post('/cart/add', { productId, quantity });
    return this.handleResponse(response);
  }

  async updateCartItem(itemId: string, quantity: number): Promise<Cart> {
    const response = await this.api.patch('/cart/update', { itemId, quantity });
    return this.handleResponse(response);
  }

  async removeFromCart(itemId: string): Promise<Cart> {
    const response = await this.api.delete(`/cart/remove/${itemId}`);
    return this.handleResponse(response);
  }

  async clearCart(): Promise<void> {
    await this.api.delete('/cart/clear');
  }

  // Order APIs
  async getOrders(): Promise<Order[]> {
    const response = await this.api.get('/orders');
    return this.handleResponse(response);
  }

  async createOrder(orderData: {
    items: CartItem[];
    shippingAddress: Address;
    paymentMethod: string;
  }): Promise<Order> {
    const response = await this.api.post('/orders', orderData);
    return this.handleResponse(response);
  }

  async getOrder(id: string): Promise<Order> {
    const response = await this.api.get(`/orders/${id}`);
    return this.handleResponse(response);
  }

  async cancelOrder(id: string): Promise<Order> {
    const response = await this.api.patch(`/orders/${id}/cancel`);
    return this.handleResponse(response);
  }

  // Payment APIs
  async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    const response = await this.api.post('/payments/create-intent', { amount, currency });
    return this.handleResponse(response);
  }

  async confirmPayment(paymentIntentId: string, orderId: string): Promise<Payment> {
    const response = await this.api.post('/payments/confirm', { paymentIntentId, orderId });
    return this.handleResponse(response);
  }

  async getPaymentHistory(): Promise<Payment[]> {
    const response = await this.api.get('/payments/history');
    return this.handleResponse(response);
  }

  // Chat APIs
  async getConversations(): Promise<Conversation[]> {
    const response = await this.api.get('/chat/conversations');
    return this.handleResponse(response);
  }

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const response = await this.api.get(`/chat/conversations/${conversationId}/messages`);
    return this.handleResponse(response);
  }

  async sendMessage(conversationId: string, content: string, messageType: string = 'text'): Promise<ChatMessage> {
    const response = await this.api.post(`/chat/conversations/${conversationId}/messages`, {
      content,
      messageType
    });
    return this.handleResponse(response);
  }

  async markMessagesAsRead(conversationId: string): Promise<void> {
    await this.api.patch(`/chat/conversations/${conversationId}/read`);
  }

  // File upload APIs
  async uploadFile(file: FormData): Promise<{ url: string }> {
    const response = await this.api.post('/upload', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return this.handleResponse(response);
  }

  async uploadProductImage(file: FormData): Promise<{ url: string }> {
    const response = await this.api.post('/upload/product', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return this.handleResponse(response);
  }

  async uploadProfileImage(file: FormData): Promise<{ url: string }> {
    const response = await this.api.post('/upload/profile', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return this.handleResponse(response);
  }

  // Notification APIs
  async registerPushToken(token: string): Promise<void> {
    await this.api.post('/notifications/register', { pushToken: token });
  }

  async unregisterPushToken(): Promise<void> {
    await this.api.delete('/notifications/unregister');
  }

  // Analytics APIs
  async trackEvent(eventName: string, properties: Record<string, any>): Promise<void> {
    await this.api.post('/analytics/track', { eventName, properties });
  }

  async trackProductView(productId: string): Promise<void> {
    await this.api.post('/analytics/product-view', { productId });
  }

  async trackPurchase(orderId: string, amount: number): Promise<void> {
    await this.api.post('/analytics/purchase', { orderId, amount });
  }
}

export const apiService = new ApiService();
export default apiService;