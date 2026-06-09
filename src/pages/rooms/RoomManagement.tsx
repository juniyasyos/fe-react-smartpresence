import { useState, useEffect, useCallback } from 'react';
import ActionIcon from '../../components/ui/ActionIcon';
import { meetingRoomService } from '../../services/meetingService';
import type { MeetingRoom, PaginatedResponse } from '../../types/meeting';
import { useToast } from '../../contexts/ToastContext';
import './RoomManagement.css';

export default function RoomManagement() {
  /* Auth & Toast */
  const { showToast } = useToast();

  /* State */
  const [rooms, setRooms] = useState<PaginatedResponse<MeetingRoom> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filter Setup */
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  /* Modal Management */
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);

  /* Form Setup */
  const [formData, setFormData] = useState<Partial<MeetingRoom>>({ name: '', location: '', capacity: 0 });
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, per_page: 25 };
      if (search) params.search = search;
      
      const res = await meetingRoomService.listPaginated(params);
      setRooms(res.data);
    } catch {
      setError('Gagal memuat data ruang rapat.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* Modals */
  const openAddModal = () => {
    setSelectedRoom(null);
    setFormData({ name: '', location: '', capacity: 0 });
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEditModal = (room: MeetingRoom) => {
    setSelectedRoom(room);
    setFormData({ name: room.name, location: room.location, capacity: room.capacity });
    setFormErrors({});
    setShowFormModal(true);
  };

  const openDeleteModal = (room: MeetingRoom) => {
    setSelectedRoom(room);
    setShowDeleteModal(true);
  };

  /* Actions */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSaving(true);
    try {
      if (selectedRoom) {
        await meetingRoomService.update(selectedRoom.id, formData);
        showToast("Data Ruang Rapat berhasil diubah");
      } else {
        await meetingRoomService.store(formData);
        showToast("Ruang Rapat baru berhasil ditambahkan");
      }
      setShowFormModal(false);
      fetchRooms();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { errors?: Record<string, string[]> } } };
        if (axErr.response?.data?.errors) setFormErrors(axErr.response.data.errors);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRoom) return;
    setSaving(true);
    try {
      await meetingRoomService.destroy(selectedRoom.id);
      showToast("Data Ruang Rapat berhasil dihapus");
      setShowDeleteModal(false);
      fetchRooms();
    } catch {
      setError('Gagal menghapus ruang rapat.');
    } finally {
      setSaving(false);
      setSelectedRoom(null);
    }
  };

  const handleToggleStatus = async (room: MeetingRoom) => {
    setTogglingId(room.id);
    try {
      await meetingRoomService.toggleStatus(room.id);
      // Update local state without refetching for better UX
      if (rooms) {
        setRooms({
          ...rooms,
          data: rooms.data.map(r => r.id === room.id ? { ...r, is_active: !r.is_active } : r)
        });
      }
    } catch {
      setError('Gagal mengubah status ruang rapat.');
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = rooms?.last_page || 1;

  return (
    <div className="room-management">
      {/* Header */}
      <div className="room-page-header">
        <div className="room-page-header-text">
          <h1>Manajemen Ruang Rapat</h1>
          <p>Kelola data ruang rapat RS Citra Husada</p>
        </div>
        <button className="room-add-btn" onClick={openAddModal}>
          <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Tambah Ruang Rapat
        </button>
      </div>

      {/* Filter */}
      <div className="room-filters">
        <label>Cari Ruang Rapat</label>
        <div className="filter-input-wrapper">
          <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input
            type="text"
            placeholder="Cari nama atau lokasi ruangan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="room-error">{error}</div>}

      {/* Table */}
      <div className="room-table-wrapper">
        {loading ? (
          <div className="room-loading">Memuat data ruang rapat...</div>
        ) : !rooms || rooms.data.length === 0 ? (
          <div className="room-empty">Tidak ada data ruang rapat ditemukan.</div>
        ) : (
          <>
            <table className="room-table">
              <thead>
                <tr>
                  <th>Nama Ruangan</th>
                  <th>Lokasi</th>
                  <th>Kapasitas</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rooms.data.map(room => (
                  <tr key={room.id}>
                    <td>
                      <div className="room-name-cell">
                        <div className="room-icon">
                          <svg viewBox="0 0 24 24"><path d="M17 10H7v2h10v-2zm2-7h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-5-5H7v2h7v-2z"/></svg>
                        </div>
                        {room.name}
                      </div>
                    </td>
                    <td>
                      <div className="room-location-cell">
                        <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                        {room.location || '-'}
                      </div>
                    </td>
                    <td>
                      <div className="room-capacity-cell">
                        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        {room.capacity ? `${room.capacity} orang` : '-'}
                      </div>
                    </td>
                    <td>
                      <div className="status-cell">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={room.is_active}
                            onChange={() => handleToggleStatus(room)}
                            disabled={togglingId === room.id}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                        <span className={`status-badge ${room.is_active ? 'aktif' : 'nonaktif'}`}>
                          {room.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button className="action-btn edit" title="Edit" onClick={() => openEditModal(room)}>
                          <ActionIcon name="edit" size={18} />
                        </button>
                        <button className="action-btn del" title="Hapus" onClick={() => openDeleteModal(room)}>
                          <ActionIcon name="hapus" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="room-pagination">
              <span>Menampilkan {rooms.data.length} dari {rooms.total} ruangan</span>
              <div className="room-pagination-btns">
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

      {/* Add / Edit Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowFormModal(false)}>
          <div className="room-modal-box" onClick={e => e.stopPropagation()}>
            <div className="room-modal-header">
              <div>
                <h3>{selectedRoom ? 'Edit Ruang Rapat' : 'Tambah Ruang Rapat'}</h3>
                <p>{selectedRoom ? 'Perbarui data ruang rapat RS Citra Husada' : 'Masukkan data ruang rapat baru RS Citra Husada'}</p>
              </div>
              <button className="room-modal-close" onClick={() => !saving && setShowFormModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="room-modal-body">
                <div className="modal-field">
                  <label>Nama Ruangan <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: Ruang Rapat A"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  {formErrors.name && <div className="modal-field-error">{formErrors.name[0]}</div>}
                </div>
                <div className="modal-row">
                  <div className="modal-field">
                    <label>Lokasi Ruangan <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="Contoh: Lantai 1"
                      value={formData.location || ''}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                    {formErrors.location && <div className="modal-field-error">{formErrors.location[0]}</div>}
                  </div>
                  <div className="modal-field">
                    <label>Kapasitas (Orang) <span className="required">*</span></label>
                    <input
                      type="number"
                      placeholder="Contoh: 20"
                      min={1}
                      value={formData.capacity || ''}
                      onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                      required
                    />
                    {formErrors.capacity && <div className="modal-field-error">{formErrors.capacity[0]}</div>}
                  </div>
                </div>
              </div>
              <div className="room-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowFormModal(false)} disabled={saving}>Batal</button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : selectedRoom ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowDeleteModal(false)}>
          <div className="delete-modal-box" onClick={e => e.stopPropagation()}>
            <h3>Konfirmasi Hapus Ruang Rapat</h3>
            <p>Apakah Anda yakin ingin menghapus ruang rapat <strong>{selectedRoom?.name}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)} disabled={saving}>Batal</button>
              <button className="btn-danger" onClick={handleDeleteConfirm} disabled={saving}>
                {saving ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
