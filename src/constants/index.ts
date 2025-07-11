export const API_BASE_URL = 'http://localhost:3000'; // Update with your backend URL
export const API_TIMEOUT = 30000;

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE_LOGIN: '/auth/google',
    REFRESH_TOKEN: '/auth/refresh',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
    UPDATE_PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Product endpoints
  PRODUCTS: {
    LIST: '/products',
    DETAILS: '/products/:id',
    SEARCH: '/products/search',
    CATEGORIES: '/products/categories',
    CREATE: '/products',
    UPDATE: '/products/:id',
    DELETE: '/products/:id',
  },
  
  // Cart endpoints
  CART: {
    GET: '/cart',
    ADD_ITEM: '/cart/add',
    UPDATE_ITEM: '/cart/update',
    REMOVE_ITEM: '/cart/remove',
    CLEAR: '/cart/clear',
  },
  
  // Order endpoints
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    DETAILS: '/orders/:id',
    UPDATE_STATUS: '/orders/:id/status',
    CANCEL: '/orders/:id/cancel',
  },
  
  // Payment endpoints
  PAYMENTS: {
    CREATE_INTENT: '/payments/create-intent',
    CONFIRM: '/payments/confirm',
    REFUND: '/payments/refund',
    HISTORY: '/payments/history',
  },
  
  // Chat endpoints
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    MESSAGES: '/chat/conversations/:id/messages',
    SEND_MESSAGE: '/chat/conversations/:id/messages',
    MARK_READ: '/chat/conversations/:id/read',
  },
};

export const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  secondary: '#EC4899',
  accent: '#F59E0B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundDark: '#1F2937',
  
  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textWhite: '#FFFFFF',
  
  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  light: 'System',
};

export const SIZES = {
  // Spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Font sizes
  caption: 12,
  body: 14,
  title: 16,
  header: 20,
  large: 24,
  xlarge: 32,
  
  // Screen dimensions (will be calculated dynamically)
  width: 375,
  height: 812,
  
  // Component sizes
  buttonHeight: 48,
  inputHeight: 48,
  headerHeight: 60,
  tabBarHeight: 80,
  
  // Border radius
  radius: 8,
  radiusLarge: 16,
  radiusRound: 50,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@ecommerce_auth_token',
  USER_DATA: '@ecommerce_user_data',
  CART_DATA: '@ecommerce_cart_data',
  THEME: '@ecommerce_theme',
  LANGUAGE: '@ecommerce_language',
  ONBOARDING_COMPLETED: '@ecommerce_onboarding',
};

export const STRIPE_PUBLISHABLE_KEY = 'pk_test_...'; // Add your Stripe publishable key

export const GOOGLE_OAUTH_CONFIG = {
  iosClientId: 'your-ios-client-id.googleusercontent.com',
  androidClientId: 'your-android-client-id.googleusercontent.com',
  webClientId: 'your-web-client-id.googleusercontent.com',
};

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Books',
  'Home & Garden',
  'Sports',
  'Toys',
  'Beauty',
  'Automotive',
  'Health',
  'Food',
];

export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const PAYMENT_METHODS = {
  CARD: 'card',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
};

export const NOTIFICATION_TYPES = {
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  NEW_MESSAGE: 'new_message',
  PROMOTION: 'promotion',
};

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  CREDIT_CARD: /^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/,
  CVV: /^\d{3,4}$/,
};

export const ANIMATION_DURATION = {
  fast: 200,
  normal: 300,
  slow: 500,
};

export const DEBOUNCE_DELAY = 300;
export const PAGINATION_LIMIT = 20;

export const DEFAULT_AVATAR = 'https://via.placeholder.com/150/6366F1/FFFFFF?text=User';
export const DEFAULT_PRODUCT_IMAGE = 'https://via.placeholder.com/300/E5E7EB/9CA3AF?text=Product';