import { useState, useEffect, useCallback, useRef } from "react";
import ActionIcon from '../../components/ui/ActionIcon';
import {
  employeeService,
  employeeTypeService,
  workUnitService,
} from "../../services/employeeService";
import type {
  Employee,
  EmployeeType,
  WorkUnit,
  PaginatedResponse,
} from "../../types/employee";
import { useToast } from '../../contexts/ToastContext';
import "./EmployeeManagement.css";

function fixUrl(url: string | null | undefined) {
  if (!url) return url;
  if (url.startsWith('data:')) return url; // Biarkan base64 dari file upload lokal
  return url.replace('http://localhost:8000', '');
}

export default function EmployeeManagement() {
  const { showToast } = useToast();

  /* State */
  const [employees, setEmployees] =
    useState<PaginatedResponse<Employee> | null>(null);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [workUnits, setWorkUnits] = useState<WorkUnit[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filter Setup */
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeId, setTypeId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [page, setPage] = useState(1);

  /* Modal Management */
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  /* Form Setup */
  const [formData, setFormData] = useState<Partial<Employee>>({
    full_name: "",
    nip: "",
    employee_type_id: undefined,
    work_unit_id: undefined,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  /* Signature */
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [removeSignature, setRemoveSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, per_page: 25 };
      if (search) params.search = search;
      if (typeId) params.employee_type_id = typeId;
      if (unitId) params.work_unit_id = unitId;

      const res = await employeeService.list(params);
      setEmployees(res.data);
    } catch {
      setError("Gagal memuat data karyawan.");
    } finally {
      setLoading(false);
    }
  }, [search, typeId, unitId, page]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    employeeTypeService
      .list()
      .then(setEmployeeTypes)
      .catch(() => {});
    workUnitService
      .list()
      .then(setWorkUnits)
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* Avatar Initials */
  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  /* Modals */
  const openAddModal = () => {
    setSelectedEmp(null);
    setFormData({
      full_name: "",
      nip: "",
      employee_type_id: employeeTypes[0]?.id,
      work_unit_id: null,
    });
    setFormErrors({});
    setSignatureFile(null);
    setSignaturePreview(null);
    setRemoveSignature(false);
    setShowFormModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setFormData({
      full_name: emp.full_name,
      nip: emp.nip,
      employee_type_id: emp.employee_type_id,
      work_unit_id: emp.work_unit_id || null,
    });
    setFormErrors({});
    setSignatureFile(null);
    setSignaturePreview(emp.signature_url || null);
    setRemoveSignature(false);
    setShowFormModal(true);
  };

  const openDeleteModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setShowDeleteModal(true);
  };

  /* Actions */
  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSignatureFile(file);
    setRemoveSignature(false);
    const reader = new FileReader();
    reader.onloadend = () => setSignaturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setSignatureFile(null);
    setSignaturePreview(null);
    setRemoveSignature(true);
    if (signatureInputRef.current) signatureInputRef.current.value = '';
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setError(null);
    setSaving(true);

    // Build FormData to support file uploads
    const fd = new FormData();
    fd.append('full_name', formData.full_name || '');
    fd.append('nip', formData.nip || '');
    if (formData.employee_type_id) fd.append('employee_type_id', String(formData.employee_type_id));
    if (formData.work_unit_id) fd.append('work_unit_id', String(formData.work_unit_id));

    // Signature
    if (signatureFile) {
      fd.append('signature', signatureFile);
    } else if (removeSignature) {
      fd.append('remove_signature', '1');
    }

    try {
      if (selectedEmp) {
        await employeeService.update(selectedEmp.id, fd);
        showToast("Data karyawan berhasil diubah");
      } else {
        await employeeService.store(fd);
        showToast("Data karyawan berhasil ditambahkan");
      }
      setShowFormModal(false);
      fetchEmployees();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as {
          response?: { data?: { errors?: Record<string, string[]>; message?: string; error?: string }; status?: number };
        };
        if (axErr.response?.data?.errors) {
          setFormErrors(axErr.response.data.errors);
        } else {
          // Show server error message
          const msg = axErr.response?.data?.message || axErr.response?.data?.error || `Gagal menyimpan data (status: ${axErr.response?.status})`;
          setError(msg);
        }
      } else {
        setError("Gagal menghubungi server. Pastikan backend berjalan.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEmp) return;
    setSaving(true);
    try {
      await employeeService.destroy(selectedEmp.id);
      showToast("Data karyawan berhasil dihapus");
      setShowDeleteModal(false);
      fetchEmployees();
    } catch {
      setError("Gagal menghapus data karyawan.");
    } finally {
      setSaving(false);
      setSelectedEmp(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await employeeService.export();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Data_Karyawan_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Gagal mengekspor data karyawan.");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      await employeeService.import(file);
      fetchEmployees();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string, error?: string } } };
      const msg = axErr.response?.data?.message || axErr.response?.data?.error || "Gagal mengimpor data karyawan.";
      setError(msg);
    } finally {
      setImporting(false);
      e.target.value = ''; // reset input
    }
  };

  const totalPages = employees?.last_page || 1;

  return (
    <div className="employee-management">
      {/* Header */}
      <div className="emp-page-header">
        <div className="emp-page-header-text">
          <h1>Manajemen Karyawan</h1>
          <p>Kelola data karyawan RS Citra Husada</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            id="import-employee"
            onChange={handleImport}
          />
          <button 
            className="emp-btn-secondary" 
            onClick={() => document.getElementById('import-employee')?.click()}
            disabled={importing}
          >
            {importing ? 'Mengimpor...' : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 20h14v-2H5v2zM12 2L5 9h4v8h6V9h4l-7-7z"/></svg>
                Import
              </>
            )}
          </button>
          <button className="emp-btn-secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Mengekspor...' : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                Export
              </>
            )}
          </button>
          <button className="emp-add-btn" onClick={openAddModal}>
            <svg viewBox="0 0 24 24">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="emp-filters">
        <div className="emp-filter-group">
          <label>Cari Karyawan</label>
          <div className="emp-filter-input-wrapper">
            <svg viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama atau NIK..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div className="emp-filter-group">
          <label>Jabatan</label>
          <select
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Jabatan</option>
            {employeeTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.employee_type}
              </option>
            ))}
          </select>
        </div>
        <div className="emp-filter-group">
          <label>Unit Kerja</label>
          <select
            value={unitId}
            onChange={(e) => {
              setUnitId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Unit Kerja</option>
            {workUnits.filter(w => w.work_unit.toLowerCase() !== 'none').map((w) => (
              <option key={w.id} value={w.id}>
                {w.work_unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="emp-error">{error}</div>}

      {/* Table */}
      <div className="emp-table-wrapper">
        {loading ? (
          <div className="emp-loading">Memuat data karyawan...</div>
        ) : !employees || employees.data.length === 0 ? (
          <div className="emp-empty">Tidak ada data karyawan ditemukan.</div>
        ) : (
          <>
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>NIK</th>
                  <th>Jabatan</th>
                  <th>Unit Kerja</th>
                  <th>TTD</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {employees.data.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="emp-name-cell">
                        <div className="emp-avatar">
                          {getInitials(emp.full_name)}
                        </div>
                        <span>{emp.full_name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="emp-info-cell">
                        <svg viewBox="0 0 24 24">
                          <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V8h16v10zm-2-1h-6v-2h6v2zM6 10h2v2H6v-2zm0 4h8v2H6v-2zM14 10h4v2h-4v-2z" />
                        </svg>
                        {emp.nip || "-"}
                      </div>
                    </td>
                    <td>
                      <div className="emp-info-cell">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                        </svg>
                        {emp.employee_type?.employee_type || "-"}
                      </div>
                    </td>
                    <td>
                      <div className="emp-info-cell">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                        </svg>
                        {emp.work_unit?.work_unit || "-"}
                      </div>
                    </td>
                    <td>
                      <div className="emp-table-signature-cell">
                        {emp.signature_url ? (
                          <img
                            src={fixUrl(emp.signature_url) || undefined}
                            alt="TTD"
                            className="emp-table-signature"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              if (target.nextElementSibling) (target.nextElementSibling as HTMLElement).style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span
                          className="emp-table-signature-fallback"
                          style={{ display: emp.signature_url ? 'none' : 'flex' }}
                        >
                          -
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="emp-action-btn-group">
                        <button
                          className="emp-action-btn edit"
                          title="Edit"
                          onClick={() => openEditModal(emp)}
                        >
                          <ActionIcon name="edit" size={18} />
                        </button>
                        <button
                          className="emp-action-btn del"
                          title="Hapus"
                          onClick={() => openDeleteModal(emp)}
                        >
                          <ActionIcon name="hapus" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="emp-pagination">
              <span>
                Menampilkan {employees.data.length} dari {employees.total}{" "}
                karyawan
              </span>
              <div className="emp-pagination-btns">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      Math.abs(p - page) <= 1 || p === 1 || p === totalPages,
                  )
                  .map((p, idx, arr) => {
                    const isGap = arr[idx - 1] && p - arr[idx - 1] > 1;
                    return (
                      <span key={p}>
                        {isGap && <button disabled>…</button>}
                        <button
                          className={p === page ? "active" : ""}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {showFormModal && (
        <div
          className="emp-modal-overlay"
          onClick={() => !saving && setShowFormModal(false)}
        >
          <div className="emp-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3>
                  {selectedEmp ? "Edit Data Karyawan" : "Tambah Data Karyawan"}
                </h3>
                <p>
                  {selectedEmp
                    ? "Perbarui data karyawan RS Citra Husada"
                    : "Masukkan data karyawan baru RS Citra Husada"}
                </p>
              </div>
              <button
                className="emp-modal-close"
                onClick={() => !saving && setShowFormModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="emp-modal-body">
                <div className="emp-modal-field">
                  <label>
                    Nama Lengkap <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={formData.full_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    required
                  />
                  {formErrors.full_name && (
                    <div className="emp-modal-field-error">
                      {formErrors.full_name[0]}
                    </div>
                  )}
                </div>

                <div className="emp-modal-row">
                  <div className="emp-modal-field">
                    <label>
                      NIK <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan NIK"
                      value={formData.nip || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, nip: e.target.value })
                      }
                      required
                    />
                    {formErrors.nip && (
                      <div className="emp-modal-field-error">
                        {formErrors.nip[0]}
                      </div>
                    )}
                  </div>
                  <div className="emp-modal-field">
                    <label>
                      Jabatan <span className="required">*</span>
                    </label>
                    <select
                      value={formData.employee_type_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employee_type_id: Number(e.target.value),
                        })
                      }
                      required
                    >
                      <option value="" disabled>
                        Pilih jabatan
                      </option>
                      {employeeTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.employee_type}
                        </option>
                      ))}
                    </select>
                    {formErrors.employee_type_id && (
                      <div className="emp-modal-field-error">
                        {formErrors.employee_type_id[0]}
                      </div>
                    )}
                  </div>
                </div>

                <div className="emp-modal-field">
                  <label>Unit Kerja</label>
                  <select
                    value={formData.work_unit_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        work_unit_id: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">Pilih unit kerja (Opsional)</option>
                    {workUnits.filter(w => w.work_unit.toLowerCase() !== 'none').map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.work_unit}
                      </option>
                    ))}
                  </select>
                  {formErrors.work_unit_id && (
                    <div className="emp-modal-field-error">
                      {formErrors.work_unit_id[0]}
                    </div>
                  )}
                </div>

                {/* Tanda Tangan */}
                <div className="emp-modal-field">
                  <label>Tanda Tangan</label>
                  <div className="emp-signature-area">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      ref={signatureInputRef}
                      onChange={handleSignatureChange}
                      style={{ display: 'none' }}
                      id="signature-upload"
                    />
                    <button
                      type="button"
                      className="emp-signature-upload-btn"
                      onClick={() => signatureInputRef.current?.click()}
                      title="Unggah Tanda Tangan"
                    >
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
                      </svg>
                    </button>
                    <div className="emp-signature-preview">
                      {signaturePreview ? (
                        <>
                          <img src={fixUrl(signaturePreview) || undefined} alt="Tanda Tangan" />
                          <button
                            type="button"
                            className="emp-signature-remove-btn"
                            onClick={handleRemoveSignature}
                            title="Hapus Tanda Tangan"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <span className="emp-signature-placeholder">Belum ada tanda tangan</span>
                      )}
                    </div>
                  </div>
                  {formErrors.signature && (
                    <div className="emp-modal-field-error">
                      {formErrors.signature[0]}
                    </div>
                  )}
                </div>
              </div>

              <div className="emp-modal-footer">
                <button
                  type="button"
                  className="emp-btn-cancel"
                  onClick={() => setShowFormModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="emp-btn-submit"
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : selectedEmp
                      ? "Simpan Perubahan"
                      : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="emp-modal-overlay"
          onClick={() => !saving && setShowDeleteModal(false)}
        >
          <div
            className="delete-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Konfirmasi Hapus Karyawan</h3>
            <p>
              Apakah Anda yakin ingin menghapus data karyawan{" "}
              <strong>{selectedEmp?.full_name}</strong>? Tindakan ini tidak
              dapat dibatalkan.
            </p>
            <div className="delete-modal-actions">
              <button
                className="emp-btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={saving}
              >
                Batal
              </button>
              <button
                className="emp-btn-danger"
                onClick={handleDeleteConfirm}
                disabled={saving}
              >
                {saving ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
