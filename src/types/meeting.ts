/* ─── Meeting Types ─── */

export interface MeetingRoom {
  id: number;
  name: string;
  location?: string;
  capacity?: number;
  is_active?: boolean;
}

import type { Employee } from './employee';

export interface MeetingParticipant {
  id: number;
  meeting_id: number;
  employee_id: number;
  employee: Employee;
}

export interface Meeting {
  id: number;
  title: string;
  organizer: string | null;
  room_id: number;
  start_time: string;
  end_time: string;
  status: string;
  created_by: number;
  room: MeetingRoom | null;
  participants: MeetingParticipant[];
  participant_count?: number;
}

export interface ParticipantWithAttendance {
  id: number;
  employee_id: number;
  employee: Employee;
  status: 'hadir' | 'tidak_hadir';
  check_in_time: string | null;
}

export interface AttendanceSummary {
  total: number;
  hadir: number;
  tidak_hadir: number;
}

export interface MeetingDetailData {
  meeting: Meeting;
  participants_with_attendance: ParticipantWithAttendance[];
  attendance_summary: AttendanceSummary;
}

export interface MeetingFormData {
  title: string;
  organizer: string;
  room_id: number | '';
  start_time: string;
  end_time: string;
  participant_employee_ids: number[];
  participant_work_unit_ids: number[];
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
}
