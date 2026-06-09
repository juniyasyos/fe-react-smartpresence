import { useState, useEffect, useCallback } from 'react';
import ActionIcon from '../../components/ui/ActionIcon';
import { userService } from '../../services/userService';
import type { User, Role, PaginatedUsersResponse, UserFormData } from '../../types/user';
import { useToast } from '../../contexts/ToastContext';
import './UserManagement.css';

/* helpers */
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function getRoleClass(roleName: string) {
  const map: Record<string, string> = {
    'super_admin': 'admin',
    'admin': 'admin',
    'sekretaris': 'sekretaris',
    'manajemen': 'sekretaris',
    'karyawan': 'karyawan',
  };
  return map[roleName] || 'karyawan';
}

export default function UserManagement() {
  const { showToast } = useToast();
  
  /* List State */
  const [users, setUsers] = useState<PaginatedUsersResponse | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filter State */
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleId, setRoleId] = useState('');
  const [page, setPage] = useState(1);

  /* Modal State */
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  /* Form State */
  const [formData, setFormData] = useState<UserFormData>({ username: '', password: '', role_id: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  /* Fetch initial data */
  useEffect(() => {
    userService.roles().then(setRoles).catch(() => {});
  }, []);

  /* Fetch users with filters */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, per_page: 25 };
      if (search) params.search = search;
      if (roleId) params.role_id = roleId;

      const res = await userService.list(params);
      setUsers(res.data);
    } catch {
      setError('Gagal memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  }, [search, roleId, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* Modal Handlers */
  const openAddModal = () => {
    setSelectedUser(null);
    setFormData({ username: '', password: '', role_id: '' });
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({ username: user.username, password: '', role_id: user.role_id });
    setFormErrors({});
    setShowFormModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  /* Form Submit */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSaving(true);

    const dataToSubmit = { ...formData };
    if (!dataToSubmit.password) delete dataToSubmit.password;

    try {
      if (selectedUser) {
        // Edit
        await userService.update(selectedUser.id, dataToSubmit);
        showToast("Data pengguna berhasil diubah");
      } else {
        // Create
        await userService.store(dataToSubmit);
        showToast("Data pengguna berhasil ditambahkan");
      }
      setShowFormModal(false);
      fetchUsers();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]> } } };
        if (axiosErr.response?.data?.errors) {
          setFormErrors(axiosErr.response.data.errors);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  /* Delete Confirm */
  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await userService.destroy(selectedUser.id);
      showToast("Data pengguna berhasil dihapus");
      setShowDeleteModal(false);
      fetchUsers();
    } catch {
      setError('Gagal menghapus pengguna.');
    } finally {
      setSaving(false);
      setSelectedUser(null);
    }
  };

  const totalPages = users?.last_page || 1;

  return (
    <div className="user-management">
      {/* Header */}
      <div className="user-page-header">
        <div className="user-page-header-text">
          <h1>Manajemen Pengguna</h1>
          <p>Kelola akun pengguna sistem Smart Presence</p>
        </div>
        <button className="user-add-btn" onClick={openAddModal}>
          <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Tambah Pengguna Baru
        </button>
      </div>

      {/* Filters */}
      <div className="user-filters">
        <div className="filter-group">
          <label>Cari Pengguna</label>
          <div className="filter-input-wrapper">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input
              type="text"
              placeholder="Cari username..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Filter Role</label>
          <select value={roleId} onChange={(e) => { setRoleId(e.target.value); setPage(1); }}>
            <option value="">Semua Role</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.role}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="user-error">{error}</div>}

      {/* Table */}
      <div className="user-table-wrapper">
        {loading ? (
          <div className="user-loading">Memuat data pengguna...</div>
        ) : !users || users.data.length === 0 ? (
          <div className="user-empty">Tidak ada data pengguna.</div>
        ) : (
          <>
            <table className="user-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Tanggal Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.data.map(u => {
                  const isSuperAdmin = u.role_id === 1;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="user-profile-cell">
                          <div className="user-avatar">
                            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                          </div>
                          {u.username}
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${getRoleClass(u.role?.role || '')}`}>
                          <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                          {u.role?.role || '-'}
                        </span>
                      </td>
                      <td>{formatDate(u.created_at)}</td>
                      <td>
                        <div className="action-btn-group">
                          <button
                            className="action-btn edit"
                            title="Edit"
                            onClick={() => openEditModal(u)}
                            disabled={isSuperAdmin}
                          >
                            <ActionIcon name="edit" size={18} />
                          </button>
                          <button
                            className="action-btn del"
                            title="Hapus"
                            onClick={() => openDeleteModal(u)}
                            disabled={isSuperAdmin}
                          >
                            <ActionIcon name="hapus" size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="user-pagination">
              <span className="user-pagination-info">Menampilkan {users.data.length} dari {users.total} pengguna</span>
              <div className="user-pagination-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const showEllipsis = arr[idx - 1] && p - arr[idx - 1] > 1;
                    return (
                      <span key={p}>
                        {showEllipsis && <button disabled>…</button>}
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

      {/* Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowFormModal(false)}>
          <div className="user-modal-box" onClick={e => e.stopPropagation()}>
            <div className="user-modal-header">
              <div>
                <h3>{selectedUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
                <p>{selectedUser ? 'Perbarui informasi akun pengguna' : 'Buat akun pengguna baru untuk sistem Smart Presence'}</p>
              </div>
              <button className="user-modal-close" onClick={() => !saving && setShowFormModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className="user-modal-body">
                <div className="modal-field">
                  <label>Username <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: admin123"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                  {formErrors.username && <div className="modal-field-error">{formErrors.username[0]}</div>}
                </div>

                <div className="modal-field">
                  <label>
                    {selectedUser ? 'Password Baru (Kosongkan jika tidak ingin mengubah)' : 'Password'}
                    {!selectedUser && <span className="required">*</span>}
                  </label>
                  <input
                    type="password"
                    placeholder="Minimal 8 karakter"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required={!selectedUser}
                    minLength={8}
                  />
                  {formErrors.password && <div className="modal-field-error">{formErrors.password[0]}</div>}
                </div>

                {!selectedUser && (
                  <div className="modal-field">
                    <label>Role <span className="required">*</span></label>
                    <select
                      value={formData.role_id}
                      onChange={e => setFormData({ ...formData, role_id: Number(e.target.value) })}
                      required
                    >
                      <option value="" disabled>Pilih Role</option>
                      {roles.filter(r => r.id !== 1).map(r => ( // Hide SuperAdmin from selection just in case
                        <option key={r.id} value={r.id}>{r.role}</option>
                      ))}
                    </select>
                    {formErrors.role_id && <div className="modal-field-error">{formErrors.role_id[0]}</div>}
                  </div>
                )}
              </div>

              <div className="user-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowFormModal(false)} disabled={saving}>
                  Batal
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : selectedUser ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowDeleteModal(false)}>
          <div className="delete-modal-box" onClick={e => e.stopPropagation()}>
            <h3>Konfirmasi Hapus Pengguna</h3>
            <p>Apakah Anda yakin ingin menghapus akun pengguna <strong>{selectedUser?.username}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)} disabled={saving}>Batal</button>
              <button className="btn-danger" onClick={handleDeleteConfirm} disabled={saving}>
                {saving ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
