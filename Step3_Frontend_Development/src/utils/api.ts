import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from Zustand store (persisted in localStorage)
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        const token = parsed.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle envelope parsing and errors
api.interceptors.response.use(
  (response) => {
    // Check if response has envelope format
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const { success, data, count, error, details } = response.data;
      
      if (!success) {
        // Handle envelope errors uniformly
        const errorObj = new Error(error || 'Request failed');
        (errorObj as any).response = {
          status: response.status,
          data: { error, details }
        };
        return Promise.reject(errorObj);
      }
      
      // Update response data with parsed envelope
      response.data = { 
        success, 
        data, 
        count,
        error: null,
        details: null
      };
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token
      try {
        const authData = localStorage.getItem('auth-storage');
        if (authData) {
          const parsed = JSON.parse(authData);
          const { user } = parsed.state || {};
          
          if (user?.id) {
            const refreshResponse = await fetch('http://localhost:3001/api/auth/refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Pass existing token so backend can verify and allow refresh path
                'Authorization': parsed.state?.token ? `Bearer ${parsed.state.token}` : ''
              },
              body: JSON.stringify({ userId: user.id }),
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.success && refreshData.token) {
                // Update token in localStorage
                const updatedAuthData = {
                  ...parsed,
                  state: {
                    ...parsed.state,
                    token: refreshData.token
                  }
                };
                localStorage.setItem('auth-storage', JSON.stringify(updatedAuthData));
                
                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${refreshData.token}`;
                return api(originalRequest);
              }
            }
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
      
      // If refresh fails, clear auth data and redirect
      localStorage.removeItem('auth-storage');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        console.warn('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 