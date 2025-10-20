import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
  role: string;
  isAdmin: boolean;
  isVerified: boolean;
  hasRecharged: boolean;
  firstLoginCompleted: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  hydrated: boolean;
  isAdmin: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateBalance: (newBalance: number) => void;
  refreshUserData: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
  handleBalanceUpdate: (balanceData: { userId: number; newBalance: number; amountAdded: number; transactionId: string }) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      hydrated: false,
      isAdmin: false,
      
      login: (userData: User, token: string) => {
        set({
          isAuthenticated: true,
          user: userData,
          token,
          isAdmin: userData.isAdmin || userData.role === 'admin',
        });
      },
      
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isAdmin: false,
        });
      },
      
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData };
          set({
            user: updatedUser,
            isAdmin: updatedUser.isAdmin || updatedUser.role === 'admin',
          });
        }
      },
      
      updateBalance: (newBalance: number) => {
        const currentUser = get().user;
        if (currentUser) {
          const clamped = Number.isFinite(newBalance) ? Math.max(0, newBalance) : currentUser.balance;
          set({
            user: { ...currentUser, balance: clamped },
          });
        }
      },
      
      refreshUserData: async () => {
        const token = get().token;
        if (!token) {
          console.log('No token available for refresh');
          return;
        }
        
        try {
          console.log('Refreshing user data from server...');
          const response = await fetch('http://localhost:3001/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('Profile response status:', response.status);
          
          if (response.ok) {
            const userData = await response.json();
            console.log('Received user data:', userData);
            
            const currentUser = get().user;
            if (currentUser) {
              const updatedUser = { 
                ...currentUser, 
                ...userData,
                balance: parseFloat(userData.balance || 0) // Ensure balance is a number
              };
              
              console.log('Updated user data:', updatedUser);
              
              set({
                user: updatedUser,
                isAdmin: updatedUser.isAdmin || updatedUser.role === 'admin',
              });
              
              console.log('User data refreshed successfully');
            }
          } else {
            console.error('Failed to refresh user data:', response.status, response.statusText);
            const errorData = await response.text();
            console.error('Error response:', errorData);
          }
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        }
      },

      // Add WebSocket balance update handler
      handleBalanceUpdate: (balanceData: { userId: number; newBalance: number; amountAdded: number; transactionId: string }) => {
        const currentUser = get().user;
        if (currentUser && currentUser.id === balanceData.userId) {
          console.log('WebSocket balance update received:', balanceData);
          set({
            user: { ...currentUser, balance: balanceData.newBalance },
          });
          console.log('Balance updated via WebSocket:', balanceData.newBalance);
        }
      },

      isTokenExpired: () => {
        const token = get().token;
        if (!token) return true;
        
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          return payload.exp < currentTime;
        } catch (error) {
          console.error('Error checking token expiry:', error);
          return true;
        }
      },

      refreshToken: async () => {
        const { user, token } = get();
        if (!user || !token) return false;
        
        try {
          const response = await fetch('http://localhost:3001/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ userId: user.id }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.token) {
              set({ token: data.token });
              return true;
            }
          }
        } catch (error) {
          console.error('Failed to refresh token:', error);
        }
        
        // If refresh fails, logout user
        get().logout();
        return false;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        isAdmin: state.isAdmin,
      }),
      onRehydrateStorage: () => (state, error) => {
        // When rehydration finishes (success or error), mark hydrated
        if (state) {
          // Recompute isAdmin on rehydration
          const isAdmin = state.user?.isAdmin || state.user?.role === 'admin';
          useAuthStore.setState({ hydrated: true, isAdmin });
        } else {
          useAuthStore.setState({ hydrated: true });
        }
      },
    }
  )
);
