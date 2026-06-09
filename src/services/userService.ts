import api from './api';
import type { User, Role, UserFormData, PaginatedUsersResponse } from '../types/user';

export const userService = {
  async list(params?: Record<string, string | number>): Promise<{ data: PaginatedUsersResponse }> {
    const res = await api.get('/users', { params });
    return res.data;
  },

  async show(id: number): Promise<{ data: User }> {
    const res = await api.get(`/user/${id}`);
    return res.data;
  },

  async store(data: UserFormData): Promise<{ data: User }> {
    const res = await api.post('/user', data);
    return res.data;
  },

  async update(id: number, data: Partial<UserFormData>): Promise<{ data: User }> {
    const res = await api.patch(`/user/${id}`, data);
    return res.data;
  },

  async destroy(id: number): Promise<void> {
    await api.delete(`/user/${id}`);
  },

  async roles(): Promise<Role[]> {
    const res = await api.get('/roles');
    return res.data.data || [];
  },
};
