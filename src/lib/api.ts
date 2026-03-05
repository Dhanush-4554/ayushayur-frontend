const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Debug: Log API URL in development
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
}

// Get auth token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('API Request:', options.method || 'GET', fullUrl);
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Handle network errors
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    
    return response.json();
  } catch (error: any) {
    // Handle network errors (server not running, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please make sure the backend server is running on ' + API_BASE_URL);
    }
    // Re-throw other errors
    throw error;
  }
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiRequest<{ token: string; _id: string; name: string; email: string; role: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Store token in localStorage
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  },
  register: async (name: string, email: string, password: string, role?: string) => {
    const response = await apiRequest<{ token: string; _id: string; name: string; email: string; role: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    // Store token in localStorage
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  },
  logout: () => {
    localStorage.removeItem('token');
  },
  getMe: async () => {
    return apiRequest<any>('/auth/me');
  },
};

// Patients API
export const patientsAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/patients');
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/patients/${id}`);
  },
  create: async (data: any) => {
    return apiRequest<any>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<void>(`/patients/${id}`, {
      method: 'DELETE',
    });
  },
};

// Therapists API
export const therapistsAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/therapists');
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/therapists/${id}`);
  },
  create: async (data: any) => {
    return apiRequest<any>('/therapists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/therapists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<void>(`/therapists/${id}`, {
      method: 'DELETE',
    });
  },
};

// Rooms API
export const roomsAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/rooms');
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/rooms/${id}`);
  },
  create: async (data: any) => {
    return apiRequest<any>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<void>(`/rooms/${id}`, {
      method: 'DELETE',
    });
  },
};

// Therapies API
export const therapiesAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/therapies');
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/therapies/${id}`);
  },
  create: async (data: any) => {
    return apiRequest<any>('/therapies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/therapies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<void>(`/therapies/${id}`, {
      method: 'DELETE',
    });
  },
};

// Appointments API
export const appointmentsAPI = {
  getAll: async (params?: { date?: string; patient_id?: string; therapist_id?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.patient_id) queryParams.append('patient_id', params.patient_id);
    if (params?.therapist_id) queryParams.append('therapist_id', params.therapist_id);
    if (params?.status) queryParams.append('status', params.status);
    
    const query = queryParams.toString();
    return apiRequest<any[]>(`/appointments${query ? `?${query}` : ''}`);
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/appointments/${id}`);
  },
  create: async (data: any) => {
    return apiRequest<any>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<void>(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Prakriti API
export const prakritiAPI = {
  getAll: async (patient_id?: string) => {
    const query = patient_id ? `?patient_id=${patient_id}` : '';
    return apiRequest<any[]>(`/prakriti${query}`);
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/prakriti/${id}`);
  },
  create: async (data: any) => {
    return apiRequest<any>('/prakriti', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/prakriti/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<void>(`/prakriti/${id}`, {
      method: 'DELETE',
    });
  },
};

// Treatment Journey API
export const treatmentJourneyAPI = {
  getAll: async (patient_id?: string) => {
    const query = patient_id ? `?patient_id=${patient_id}` : '';
    return apiRequest<any[]>(`/treatment-journey${query}`);
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/treatment-journey/${id}`);
  },
  create: async (data: any) => {
    return apiRequest<any>('/treatment-journey', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/treatment-journey/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<void>(`/treatment-journey/${id}`, {
      method: 'DELETE',
    });
  },
};

// Vitals API
export const vitalsAPI = {
  getAll: async (patient_id?: string) => {
    const query = patient_id ? `?patient_id=${patient_id}` : '';
    return apiRequest<any[]>(`/vitals${query}`);
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/vitals/${id}`);
  },
  create: async (data: any) => {
    return apiRequest<any>('/vitals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/vitals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<void>(`/vitals/${id}`, {
      method: 'DELETE',
    });
  },
};

// Inventory API
export const inventoryAPI = {
  getAll: async (params?: { category?: string; low_stock?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.low_stock) queryParams.append('low_stock', 'true');
    
    const query = queryParams.toString();
    return apiRequest<any[]>(`/inventory${query ? `?${query}` : ''}`);
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/inventory/${id}`);
  },
  create: async (data: any) => {
    return apiRequest<any>('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<void>(`/inventory/${id}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    return apiRequest<any>('/dashboard/stats');
  },
};
