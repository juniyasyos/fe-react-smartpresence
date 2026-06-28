import { createContext, useContext } from 'react';
import type { User } from '../types/user';

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingSession: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthStore(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthStore must be used within an AuthProvider');
  }
  return context;
}

// Helper to get initial state from localStorage
export function getInitialAuthState(): AuthState {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');
  let user: User | null = null;

  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      localStorage.removeItem('auth_user');
    }
  }

  return {
    token,
    user,
    isAuthenticated: !!token && !!user,
    isLoading: false,
    isCheckingSession: true,
    error: null,
  };
}
