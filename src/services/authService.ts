import api from './api';
import type { LoginRequest, LoginResponse } from '../types/user';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/login', data);
    return response.data;
  },

  async me(): Promise<{ user: any }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/logout');
  },

  async getAuthMode(): Promise<{ sso_enabled: boolean; sso_login_url: string | null }> {
    const response = await api.get('/auth/mode');
    return response.data;
  },

  async csrfCookie(): Promise<void> {
    await api.get('/sanctum/csrf-cookie', { baseURL: import.meta.env.VITE_API_URL });
  }
};
