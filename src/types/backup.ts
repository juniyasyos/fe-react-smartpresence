export type BackupType = 'database' | 'files' | 'full';
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface BackupLog {
  id: number;
  name: string;
  type: BackupType;
  status: BackupStatus;
  file_path: string | null;
  file_size: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    username: string;
  };
}

export interface BackupStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  total_size: number;
}

export interface PaginatedBackupResponse {
  current_page: number;
  data: BackupLog[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface CreateBackupRequest {
  type: BackupType;
}
