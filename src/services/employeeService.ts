import api from "./api";
import type {
  Employee,
  EmployeeType,
  WorkUnit,
  PaginatedResponse,
} from "../types/employee";

export const employeeService = {
  async list(
    params?: Record<string, string | number>,
  ): Promise<{ data: PaginatedResponse<Employee> }> {
    const res = await api.get("/employees", { params });
    return res.data;
  },

  async show(id: number): Promise<{ data: Employee }> {
    const res = await api.get(`/employee/${id}`);
    return res.data;
  },

  async store(data: FormData): Promise<{ data: Employee }> {
    const res = await api.post("/employee", data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async update(
    id: number,
    data: FormData,
  ): Promise<{ data: Employee }> {
    // Use POST with _method=PATCH for multipart file uploads
    data.append('_method', 'PATCH');
    const res = await api.post(`/employee/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async destroy(id: number): Promise<void> {
    await api.delete(`/employee/${id}`);
  },

  async export(): Promise<Blob> {
    const res = await api.get("/employees/export", { responseType: 'blob' });
    return res.data;
  },

  async import(file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post("/employees/import", formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },
};

export const employeeTypeService = {
  async list(): Promise<EmployeeType[]> {
    const res = await api.get("/employee-types");
    return res.data.data || [];
  },
};

export const workUnitService = {
  /* List simpel untuk dropdown (tanpa pagination / employees_count) */
  async list(): Promise<WorkUnit[]> {
    const res = await api.get("/work-units");
    return res.data.data || [];
  },

  /* List paginated untuk halaman manajemen (dengan employees_count) */
  async listPaginated(params?: Record<string, string | number>): Promise<{ data: PaginatedResponse<WorkUnit & { employees_count?: number }> }> {
    const res = await api.get("/work-units-manage", { params });
    return res.data;
  },

  async store(data: { work_unit: string }): Promise<WorkUnit> {
    const res = await api.post("/work-unit", data);
    return res.data.data;
  },

  async update(id: number, data: { work_unit: string }): Promise<WorkUnit> {
    const res = await api.patch(`/work-unit/${id}`, data);
    return res.data.data;
  },

  async destroy(id: number): Promise<void> {
    await api.delete(`/work-unit/${id}`);
  },
};
