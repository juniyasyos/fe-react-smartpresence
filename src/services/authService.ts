import api from './api';
import type { LoginRequest, LoginResponse } from '../types/user';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/login', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/logout');
  },
};
