import api from './api';

export interface LaporanListParams {
  search?: string;
  date?: string;
  status?: string;
  per_page?: number;
  page?: number;
}

export const laporanService = {
  getList: (params?: LaporanListParams) =>
    api.get('/laporan/rapat', { params }),

  getDetail: (id: number) =>
    api.get(`/laporan/rapat/${id}`),

  getExport: (id: number) =>
    api.get(`/laporan/rapat/${id}/export`),

  getMinutes: (meetingId: number) =>
    api.get(`/meeting/${meetingId}/minutes`),

  upsertMinutes: (meetingId: number, data: {
    content?: string;
    notulis_name?: string;
    notulis_position?: string;
    director_name?: string;
    director_position?: string;
  }) =>
    api.post(`/meeting/${meetingId}/minutes`, data),

  uploadMinutesImage: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/minutes/upload-image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadDocument: (meetingId: number, file: File, type: string = 'lampiran') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    return api.post(`/meeting/${meetingId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteDocument: (meetingId: number, documentId: number) =>
    api.delete(`/meeting/${meetingId}/documents/${documentId}`),
};
