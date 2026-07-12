import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'solarcrm_auth_token';

// ==========================================
// NETWORK CONFIGURATION
// ==========================================
// IMPORTANT FOR DEV: When testing on a physical phone, localhost will NOT work.
// You must change LOCAL_IP to your computer's local IP address (e.g. 192.168.1.x).
// To find your IP:
// - Windows cmd: ipconfig (Look for IPv4 Address)
// - macOS terminal: ipconfig getifaddr en0
const LOCAL_IP = '10.199.203.210'; 
const DEV_PORT = '3000';

export const BASE_URL = 'https://santori-solar-mb143ktwu-santori-team.vercel.app';

// Secure token storage interface
let _inMemoryToken: string | null = null;

export const tokenStorage = {
  save: async (token: string) => {
    try {
      _inMemoryToken = token;
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (e) {
      console.error('Error saving token securely:', e);
    }
  },
  get: async () => {
    try {
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) return token;
      }
      return _inMemoryToken;
    } catch (e) {
      console.error('Error getting token securely:', e);
      return _inMemoryToken;
    }
  },
  clear: async () => {
    try {
      _inMemoryToken = null;
      if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      console.error('Error clearing token securely:', e);
    }
  }
};

// Generic fetch client
async function request(endpoint: string, options: RequestInit = {}) {
  const token = await tokenStorage.get();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const url = `${BASE_URL}${endpoint}`;
  console.log(`[API Request] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        message: data.message || 'Something went wrong',
        errors: data.errors
      };
    }
    
    return {
      success: true,
      status: response.status,
      data: data.data,
      message: data.message
    };
  } catch (error: any) {
    console.error(`[API Error] ${url}:`, error);
    return {
      success: false,
      message: 'Network request failed. Make sure your server is running and your phone is on the same Wi-Fi network.',
      errors: { details: error.message }
    };
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================
export const api = {
  // Authentication
  auth: {
    login: async (email: string, password: string, location?: string) => {
      const res = await request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, location: location || 'Mobile App' }),
      });
      if (res.success && res.data?.token) {
        await tokenStorage.save(res.data.token);
      }
      return res;
    },
    logout: async () => {
      await tokenStorage.clear();
      return { success: true };
    },
    getMe: async () => {
      return request('/api/v1/auth/me');
    }
  },

  // Leads
  leads: {
    list: async (params: { search?: string; status?: string; page?: number; limit?: number } = {}) => {
      const queryParts: string[] = [];
      if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params.status) queryParts.push(`status=${params.status}`);
      if (params.page) queryParts.push(`page=${params.page}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);
      
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      return request(`/api/v1/leads${queryString}`);
    },
    getById: async (leadId: number) => {
      return request(`/api/v1/leads/${leadId}`);
    },
    updateStatus: async (leadId: number, data: { to_status: number; remark: string; sub_status?: string; followup_at?: string }) => {
      return request(`/api/v1/leads/${leadId}/status`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },

  // Attendance
  attendance: {
    getToday: async () => {
      return request('/api/v1/attendance/today');
    },
    checkIn: async (location: string, notes?: string) => {
      return request('/api/v1/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ location, notes }),
      });
    },
    checkOut: async (location: string, notes?: string) => {
      return request('/api/v1/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({ location, notes }),
      });
    }
  },

  // Dashboard Stats
  dashboard: {
    getStats: async () => {
      // Endpoint to fetch leaderboard and basic stats
      return request('/api/v1/leaderboard');
    }
  },

  // Orders
  orders: {
    list: async (params: { search?: string; status?: string; client_type?: string } = {}) => {
      const queryParts: string[] = [];
      if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params.status) queryParts.push(`status=${params.status}`);
      if (params.client_type) queryParts.push(`client_type=${params.client_type}`);
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      return request(`/api/v1/orders${queryString}`);
    },
    getById: async (orderId: number) => {
      return request(`/api/v1/orders/${orderId}`);
    },
    submit: async (orderId: number) => {
      return request(`/api/v1/orders/${orderId}/submit`, {
        method: 'POST',
      });
    },
    verify: async (orderId: number, approve: boolean, remark: string) => {
      return request(`/api/v1/orders/${orderId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ approve, remark }),
      });
    },
    uploadInstallationImage: async (orderId: number, formData: FormData) => {
      return fetch(`${BASE_URL}/api/v1/orders/${orderId}/installation-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await tokenStorage.get()}`,
        },
        body: formData,
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        return {
          success: response.ok,
          status: response.status,
          data: data.data,
          message: data.message || (response.ok ? 'Uploaded successfully' : 'Upload failed'),
        };
      }).catch((error) => ({
        success: false,
        message: error.message || 'Upload connection failed',
      }));
    }
  },

  // Finance
  finance: {
    getLedger: async (search?: string) => {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      return request(`/api/v1/finance/ledger${query}`);
    },
    recordPayment: async (data: { orderId: number; amount: number; paymentMethod: string; transactionRef?: string; remarks?: string }) => {
      return request('/api/v1/finance/ledger', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  }
};
