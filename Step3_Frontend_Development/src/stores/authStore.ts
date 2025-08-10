import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
  role: string;
  isVerified: boolean;
  hasRecharged: boolean;
  firstLoginCompleted: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  hydrated: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateBalance: (newBalance: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      hydrated: false,
      
      login: (userData: User, token: string) => {
        set({
          isAuthenticated: true,
          user: userData,
          token,
        });
      },
      
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        });
      },
      
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state, error) => {
        // When rehydration finishes (success or error), mark hydrated
        useAuthStore.setState({ hydrated: true });
      },
    }
  )
);
