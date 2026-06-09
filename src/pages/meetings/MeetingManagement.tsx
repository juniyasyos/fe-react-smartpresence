import { useState, useEffect, useCallback, useRef } from 'react';
import ActionIcon from '../../components/ui/ActionIcon';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { meetingService, meetingRoomService } from '../../services/meetingService';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../contexts/ToastContext';
import type { Meeting, MeetingRoom, PaginatedResponse } from '../../types/meeting';
import './MeetingManagement.css';

const ROLE_ADMIN = 2;

/* ─── Helpers ─── */
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function statusLabel(s: string) {
  const m: Record<string, string> = { menunggu: 'Menunggu', berlangsung: 'Berlangsung', selesai: 'Selesai' };
  return m[s] || s;
}

export default function MeetingManagement() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role_id === ROLE_ADMIN;

  /* state */
  const [meetings, setMeetings] = useState<PaginatedResponse<Meeting> | null>(null);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* toast */
  const location = useLocation();
  const { showToast } = useToast();
  const toastShownRef = useRef(false);
  
  useEffect(() => {
    if (location.state?.toastMessage && !toastShownRef.current) {
      showToast(location.state.toastMessage);
      toastShownRef.current = true;
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, showToast, navigate, location.pathname]);

  /* filters */
  const [search, setSearch] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);

  /* delete modal */
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* fetch rooms once */
  useEffect(() => {
    meetingRoomService.list().then(setRooms).catch(() => { });
  }, []);

  /* fetch meetings */
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, per_page: 25 };
      if (search) params.search = search;
      if (roomId) params.room_id = roomId;
      if (date) params.date = date;
      const res = await meetingService.list(params);
      setMeetings(res.data);
      // Simpan semua data (tanpa filter organizer) untuk membentuk dropdown penyelenggara
      if (!organizer) setAllMeetings(prev => {
        const merged = [...prev, ...res.data.data];
        const seen = new Set<number>();
        return merged.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      });
    } catch {
      setError('Gagal memuat data rapat.');
    } finally {
      setLoading(false);
    }
  }, [search, roomId, date, page, organizer]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  /* Daftar unik penyelenggara */
  const organizerOptions = Array.from(
    new Set(allMeetings.map(m => m.organizer).filter((o): o is string => Boolean(o)))
  ).sort();

  /* Filter tampilan berdasarkan penyelenggara (client-side) */
  const displayedData = organizer
    ? (meetings?.data || []).filter(m => m.organizer === organizer)
    : (meetings?.data || []);

  /* debounced search */
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await meetingService.destroy(deleteTarget.id);
      showToast("Jadwal Rapat berhasil dihapus");
      setDeleteTarget(null);
      fetchMeetings();
    } catch {
      setError('Gagal menghapus rapat.');
    } finally {
      setDeleting(false);
    }
  };

  /* pagination */
  const totalPages = meetings?.last_page || 1;

  return (
    <div className="meeting-management">
      {/* Header */}
      <div className="meeting-page-header">
        <div className="meeting-page-header-text">
          <h1>Manajemen Jadwal Rapat</h1>
          <p>Kelola dan monitor semua jadwal rapat</p>
        </div>
        <Link to="/meetings/create" className="meeting-add-btn">
          <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          Tambah Jadwal Rapat
        </Link>
      </div>

      {/* Filters */}
      <div className="meeting-filters">
        <div className="filter-group">
          <label>Cari Jadwal Rapat</label>
          <div className="filter-input-wrapper">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
            <input
              type="text"
              placeholder="Cari jadwal rapat..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Penyelenggara</label>
          <select value={organizer} onChange={(e) => { setOrganizer(e.target.value); setPage(1); }}>
            <option value="">Semua Penyelenggara</option>
            {organizerOptions.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Ruang Rapat</label>
          <select value={roomId} onChange={(e) => { setRoomId(e.target.value); setPage(1); }}>
            <option value="">Semua Ruangan</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Tanggal</label>
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="meeting-error">{error}</div>}

      {/* Table */}
      <div className="meeting-table-wrapper">
        {loading ? (
          <div className="meeting-loading">Memuat data rapat...</div>
        ) : displayedData.length === 0 ? (
          <div className="meeting-empty">Tidak ada data rapat.</div>
        ) : (
          <>
            <table className="meeting-table">
              <thead>
                <tr>
                  <th>Judul Rapat</th>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>Ruangan</th>
                  <th>Penyelenggara</th>
                  <th>Peserta</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {displayedData.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600, maxWidth: 180 }}>{m.title}</td>
                    <td>{formatDate(m.start_time)}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="#94a3b8"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></svg>
                        {formatTime(m.start_time)} - {formatTime(m.end_time)}
                      </span>
                    </td>
                    <td>{m.room?.name || '-'}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="#94a3b8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                        {m.organizer || '-'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{m.participant_count ?? m.participants?.length ?? 0}</td>
                    <td><span className={`status-badge ${m.status}`}>{statusLabel(m.status)}</span></td>
                    <td>
                      <div className="action-btn-group">
                        <button className="action-btn view" title="Lihat Detail" onClick={() => navigate(`/meetings/${m.id}`)}>
                          <ActionIcon name="mata" size={18} />
                        </button>
                        <button className="action-btn edit" title="Edit" onClick={() => navigate(`/meetings/${m.id}/edit`)}>
                          <ActionIcon name="edit" size={18} />
                        </button>
                        {!isAdmin && (
                          <button className="action-btn del" title="Hapus" onClick={() => setDeleteTarget(m)}>
                            <ActionIcon name="hapus" size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="meeting-pagination">
              <span className="meeting-pagination-info">
                Menampilkan {displayedData.length} dari {meetings?.total ?? 0} rapat
              </span>
              <div className="meeting-pagination-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
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

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Hapus Rapat</h3>
            <p>Apakah Anda yakin ingin menghapus rapat <strong>"{deleteTarget.title}"</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setDeleteTarget(null)} disabled={deleting}>Batal</button>
              <button className="modal-delete-btn" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
