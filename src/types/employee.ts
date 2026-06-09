export interface WorkUnit {
  id: number;
  work_unit: string;
}

export interface Position {
  id: number;
  position: string;
}

export interface EmployeeType {
  id: number;
  employee_type: string;
}

export interface Employee {
  id: number;
  full_name: string;
  nip: string;
  employee_type_id?: number;
  work_unit_id?: number | null;
  position_id?: number;
  email?: string;
  phone?: string;
  is_active?: boolean;
  signature_path?: string | null;
  signature_url?: string | null;
  work_unit?: WorkUnit;
  position?: Position;
  employee_type?: EmployeeType;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
}
