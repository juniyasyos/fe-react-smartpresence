import api from './api';
import type {
  Meeting,
  MeetingDetailData,
  MeetingFormData,
  MeetingRoom,
  PaginatedResponse,
} from '../types/meeting';

/* ─── Meetings ─── */
export const meetingService = {
  async list(params?: Record<string, string | number>): Promise<{ data: PaginatedResponse<Meeting> }> {
    const res = await api.get('/meetings', { params });
    return res.data;
  },

  async show(id: number): Promise<{ data: MeetingDetailData }> {
    const res = await api.get(`/meeting/${id}`);
    return res.data;
  },

  async store(data: MeetingFormData): Promise<{ data: Meeting }> {
    const res = await api.post('/meeting', data);
    return res.data;
  },

  async update(id: number, data: Partial<MeetingFormData>): Promise<{ data: Meeting }> {
    const res = await api.patch(`/meeting/${id}`, data);
    return res.data;
  },

  async destroy(id: number): Promise<void> {
    await api.delete(`/meeting/${id}`);
  },

  async scanBarcode(meetingId: number, nip: string) {
    const res = await api.post(`/meeting/${meetingId}/scan`, { nip });
    return res.data;
  },

  async manualAttendance(meetingId: number, participantId: number, status: 'hadir' | 'tidak_hadir' = 'hadir') {
    const res = await api.patch(`/meeting/${meetingId}/attendance/${participantId}`, { status });
    return res.data;
  },
};

/* ─── Dropdown data ─── */
export const meetingRoomService = {
  async list(params?: Record<string, string | number>): Promise<MeetingRoom[]> {
    const res = await api.get('/meeting-rooms', { params });
    return res.data.data?.data || res.data.data || [];
  },

  async listPaginated(params?: Record<string, string | number>): Promise<{ data: PaginatedResponse<MeetingRoom> }> {
    const res = await api.get('/meeting-rooms', { params });
    return res.data;
  },

  async show(id: number): Promise<{ data: MeetingRoom }> {
    const res = await api.get(`/meeting-room/${id}`);
    return res.data;
  },

  async store(data: Partial<MeetingRoom>): Promise<{ data: MeetingRoom }> {
    const res = await api.post('/meeting-room', data);
    return res.data;
  },

  async update(id: number, data: Partial<MeetingRoom>): Promise<{ data: MeetingRoom }> {
    const res = await api.patch(`/meeting-room/${id}`, data);
    return res.data;
  },

  async toggleStatus(id: number): Promise<{ data: MeetingRoom }> {
    const res = await api.patch(`/meeting-room/${id}/toggle-status`);
    return res.data;
  },

  async destroy(id: number): Promise<void> {
    await api.delete(`/meeting-room/${id}`);
  },
};


