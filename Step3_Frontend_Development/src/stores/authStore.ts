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
        if (!token) return;
        
        try {
          const response = await fetch('http://localhost:3001/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            const updatedUser = { ...get().user, ...userData };
            set({
              user: updatedUser,
              isAdmin: updatedUser.isAdmin || updatedUser.role === 'admin',
            });
          }
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        }
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
