import { useState, useEffect, useCallback } from 'react';
import ActionIcon from '../../components/ui/ActionIcon';
import { workUnitService } from '../../services/employeeService';
import type { WorkUnit, PaginatedResponse } from '../../types/employee';
import { useToast } from '../../contexts/ToastContext';
import './WorkUnitManagement.css';

type WorkUnitWithCount = WorkUnit & { employees_count?: number };

export default function WorkUnitManagement() {
  const { showToast } = useToast();

  /* State */
  const [workUnits, setWorkUnits] = useState<PaginatedResponse<WorkUnitWithCount> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filter */
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  /* Modal */
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<WorkUnitWithCount | null>(null);

  /* Form */
  const [formValue, setFormValue] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchWorkUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, per_page: 25 };
      if (search) params.search = search;
      const res = await workUnitService.listPaginated(params);
      setWorkUnits(res.data);
    } catch {
      setError('Gagal memuat data unit kerja.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchWorkUnits(); }, [fetchWorkUnits]);

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* Open Modals */
  const openAddModal = () => {
    setSelectedUnit(null);
    setFormValue('');
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (unit: WorkUnitWithCount) => {
    setSelectedUnit(unit);
    setFormValue(unit.work_unit);
    setFormError('');
    setShowFormModal(true);
  };

  const openDeleteModal = (unit: WorkUnitWithCount) => {
    setSelectedUnit(unit);
    setShowDeleteModal(true);
  };

  /* Actions */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValue.trim()) {
      setFormError('Nama unit kerja tidak boleh kosong.');
      return;
    }
    setSaving(true);
    try {
      if (selectedUnit) {
        await workUnitService.update(selectedUnit.id, { work_unit: formValue.trim() });
        showToast("Data Unit Kerja berhasil diubah");
      } else {
        await workUnitService.store({ work_unit: formValue.trim() });
        showToast("Data Unit Kerja berhasil ditambahkan");
      }
      setShowFormModal(false);
      fetchWorkUnits();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
        const serverMsg = axErr.response?.data?.errors?.work_unit?.[0]
          || axErr.response?.data?.message
          || 'Gagal menyimpan data.';
        setFormError(serverMsg);
      } else {
        setFormError('Gagal menyimpan data.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUnit) return;
    setSaving(true);
    try {
      await workUnitService.destroy(selectedUnit.id);
      showToast("Data Unit Kerja berhasil dihapus");
      setShowDeleteModal(false);
      fetchWorkUnits();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { message?: string } } };
        setError(axErr.response?.data?.message || 'Gagal menghapus unit kerja.');
      } else {
        setError('Gagal menghapus unit kerja.');
      }
      setShowDeleteModal(false);
    } finally {
      setSaving(false);
      setSelectedUnit(null);
    }
  };

  const totalPages = workUnits?.last_page || 1;

  /* Row numbering based on pagination */
  const startNo = workUnits ? (workUnits.current_page - 1) * workUnits.per_page : 0;

  return (
    <div className="wu-management">
      {/* Header */}
      <div className="wu-page-header">
        <div className="wu-page-header-text">
          <h1>Manajemen Unit Kerja</h1>
          <p>Kelola data unit kerja RS Citra Husada</p>
        </div>
        <button className="wu-add-btn" onClick={openAddModal}>
          <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Tambah Unit Kerja
        </button>
      </div>

      {/* Filter */}
      <div className="wu-filters">
        <label>Cari Unit Kerja</label>
        <div className="wu-filter-input-wrapper">
          <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input
            type="text"
            placeholder="Cari nama unit kerja..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="wu-error">{error}</div>}

      {/* Table */}
      <div className="wu-table-wrapper">
        {loading ? (
          <div className="wu-loading">Memuat data unit kerja...</div>
        ) : !workUnits || workUnits.data.length === 0 ? (
          <div className="wu-empty">Tidak ada data unit kerja ditemukan.</div>
        ) : (
          <>
            <table className="wu-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>No</th>
                  <th>Nama Unit Kerja</th>
                  <th>Jumlah Karyawan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {workUnits.data.map((unit, idx) => (
                  <tr key={unit.id}>
                    <td className="wu-no-cell">{startNo + idx + 1}</td>
                    <td className="wu-name-text">{unit.work_unit}</td>
                    <td className="wu-count-cell">{unit.employees_count ?? 0} Karyawan</td>
                    <td>
                      <div className="wu-action-group">
                        <button
                          className="wu-action-btn edit"
                          title="Edit"
                          onClick={() => openEditModal(unit)}
                        >
                          <ActionIcon name="edit" size={18} />
                        </button>
                        <button
                          className="wu-action-btn del"
                          title="Hapus"
                          onClick={() => openDeleteModal(unit)}
                        >
                          <ActionIcon name="hapus" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="wu-pagination">
              <span>Menampilkan {workUnits.data.length} dari {workUnits.total} unit kerja</span>
              <div className="wu-pagination-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - page) <= 1 || p === 1 || p === totalPages)
                  .map((p, idx, arr) => {
                    const isGap = arr[idx - 1] && p - arr[idx - 1] > 1;
                    return (
                      <span key={p}>
                        {isGap && <button disabled>…</button>}
                        <button className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                      </span>
                    );
                  })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showFormModal && (
        <div className="wu-modal-overlay" onClick={() => !saving && setShowFormModal(false)}>
          <div className="wu-modal-box" onClick={e => e.stopPropagation()}>
            <div className="wu-modal-header">
              <div>
                <h3>{selectedUnit ? 'Edit Unit Kerja' : 'Tambah Unit Kerja'}</h3>
                <p>{selectedUnit ? 'Perbarui nama unit kerja RS Citra Husada' : 'Masukkan nama unit kerja baru RS Citra Husada'}</p>
              </div>
              <button className="wu-modal-close" onClick={() => !saving && setShowFormModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="wu-modal-body">
                <div className="wu-modal-field">
                  <label>Nama Unit Kerja <span className="wu-required">*</span></label>
                  <input
                    type="text"
                    placeholder="Masukkan nama unit kerja"
                    value={formValue}
                    onChange={e => { setFormValue(e.target.value); setFormError(''); }}
                    autoFocus
                  />
                  {formError && <div className="wu-field-error">{formError}</div>}
                </div>
              </div>
              <div className="wu-modal-footer">
                <button
                  type="button"
                  className="wu-btn-cancel"
                  onClick={() => setShowFormModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>
                <button type="submit" className="wu-btn-submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : selectedUnit ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="wu-modal-overlay" onClick={() => !saving && setShowDeleteModal(false)}>
          <div className="wu-delete-modal-box" onClick={e => e.stopPropagation()}>
            <h3>Konfirmasi Hapus Unit Kerja</h3>
            <p>
              Apakah Anda yakin ingin menghapus unit kerja <strong>{selectedUnit?.work_unit}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="wu-delete-actions">
              <button
                className="wu-btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={saving}
              >
                Batal
              </button>
              <button
                className="wu-btn-danger"
                onClick={handleDeleteConfirm}
                disabled={saving}
              >
                {saving ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
