import api from './api';
import type {
  BackupStats,
  PaginatedBackupResponse,
  CreateBackupRequest,
  BackupLog,
} from '../types/backup';

export const backupService = {
  /** List all backups (paginated + filterable). */
  async list(
    params?: Record<string, string | number>
  ): Promise<{ data: PaginatedBackupResponse }> {
    const res = await api.get('/backups', { params });
    return res.data;
  },

  /** Get backup statistics. */
  async stats(): Promise<BackupStats> {
    const res = await api.get('/backups/stats');
    return res.data.data;
  },

  /** Create a new backup (dispatches queue job). */
  async create(data: CreateBackupRequest): Promise<{ data: BackupLog; message: string }> {
    const res = await api.post('/backup', data);
    return res.data;
  },

  /** Download a completed backup file. */
  async download(id: number, fileName: string): Promise<void> {
    const res = await api.get(`/backup/${id}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** Cancel a pending backup. */
  async cancel(id: number): Promise<void> {
    await api.post(`/backup/${id}/cancel`);
  },

  /** Delete a backup record and its file. */
  async destroy(id: number): Promise<void> {
    await api.delete(`/backup/${id}`);
  },
};
