import { useState, useEffect, useCallback } from 'react';
import { backupService } from '../../services/backupService';
import { useToast } from '../../contexts/ToastContext';
import type {
  BackupLog,
  BackupStats,
  BackupType,
  PaginatedBackupResponse,
} from '../../types/backup';
import './BackupManagement.css';

/* ─── Helpers ─── */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_LABELS: Record<BackupType, string> = {
  database: 'Database',
  files: 'File',
  full: 'Full',
};

export default function BackupManagement() {
  const { showToast } = useToast();

  /* ─── State ─── */
  const [backups, setBackups] = useState<PaginatedBackupResponse | null>(null);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupLog | null>(null);

  // Form
  const [createType, setCreateType] = useState<BackupType>('database');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  /* ─── Fetch Data ─── */
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, per_page: 10 };
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;

      const res = await backupService.list(params);
      setBackups(res.data);
    } catch {
      setError('Gagal memuat data backup.');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, page]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await backupService.stats();
      setStats(data);
    } catch {
      // silently fail for stats
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Auto-refresh running/pending backups
  useEffect(() => {
    const hasPending = backups?.data?.some(
      (b) => b.status === 'pending' || b.status === 'running'
    );
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchBackups();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [backups, fetchBackups, fetchStats]);

  /* ─── Actions ─── */
  const handleCreate = async () => {
    setCreating(true);
    try {
      await backupService.create({ type: createType });
      showToast('Backup telah dijadwalkan dan akan segera diproses.');
      setShowCreateModal(false);
      setCreateType('database');
      fetchBackups();
      fetchStats();
    } catch {
      setError('Gagal membuat backup.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backup: BackupLog) => {
    setDownloading(backup.id);
    try {
      await backupService.download(backup.id, backup.name);
    } catch {
      setError('Gagal mengunduh file backup.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBackup) return;
    setDeleting(true);
    try {
      await backupService.destroy(selectedBackup.id);
      showToast('Backup berhasil dihapus.');
      setShowDeleteModal(false);
      setSelectedBackup(null);
      fetchBackups();
      fetchStats();
    } catch {
      setError('Gagal menghapus backup.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = async (backup: BackupLog) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan backup ini?')) return;
    setCancelling(backup.id);
    try {
      await backupService.cancel(backup.id);
      showToast('Backup berhasil dibatalkan.');
      fetchBackups();
      fetchStats();
    } catch {
      setError('Gagal membatalkan backup.');
    } finally {
      setCancelling(null);
    }
  };

  const openDeleteModal = (backup: BackupLog) => {
    setSelectedBackup(backup);
    setShowDeleteModal(true);
  };

  const totalPages = backups?.last_page || 1;

  /* ─── Render ─── */
  return (
    <div className="backup-management">
      {/* ─── Header ─── */}
      <div className="backup-page-header">
        <div className="backup-page-header-text">
          <h1>Manajemen Backup</h1>
          <p>Kelola cadangan database dan file sistem</p>
        </div>
        <button
          className="backup-create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <svg viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Buat Backup Baru
        </button>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="backup-stats">
        <div className="backup-stat-card">
          <div className="backup-stat-icon total">
            <svg viewBox="0 0 24 24">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
            </svg>
          </div>
          <div className="backup-stat-info">
            <h3>{stats?.total ?? '—'}</h3>
            <p>Total Backup</p>
          </div>
        </div>
        <div className="backup-stat-card">
          <div className="backup-stat-icon success">
            <svg viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <div className="backup-stat-info">
            <h3>{stats?.completed ?? '—'}</h3>
            <p>Berhasil</p>
          </div>
        </div>
        <div className="backup-stat-card">
          <div className="backup-stat-icon failed">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <div className="backup-stat-info">
            <h3>{stats?.failed ?? '—'}</h3>
            <p>Gagal</p>
          </div>
        </div>
        <div className="backup-stat-card">
          <div className="backup-stat-icon size">
            <svg viewBox="0 0 24 24">
              <path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z" />
            </svg>
          </div>
          <div className="backup-stat-info">
            <h3>{stats ? formatBytes(stats.total_size) : '—'}</h3>
            <p>Total Ukuran</p>
          </div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="backup-filters">
        <div className="filter-group">
          <label>Cari Backup</label>
          <div className="filter-input-wrapper">
            <svg viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Cari berdasarkan nama..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-group">
          <label>Tipe</label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Tipe</option>
            <option value="database">Database</option>
            <option value="files">File</option>
            <option value="full">Full</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="running">Berjalan</option>
            <option value="completed">Berhasil</option>
            <option value="failed">Gagal</option>
          </select>
        </div>
      </div>

      {/* ─── Error ─── */}
      {error && <div className="backup-error">{error}</div>}

      {/* ─── Table ─── */}
      <div className="backup-table-wrapper">
        {loading ? (
          <div className="backup-loading">Memuat data backup...</div>
        ) : !backups || backups.data.length === 0 ? (
          <div className="backup-empty">
            <svg
              viewBox="0 0 24 24"
              width="48"
              height="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }}
            >
              <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
            </svg>
            Tidak ada data backup ditemukan.
          </div>
        ) : (
          <>
            <table className="backup-table">
              <thead>
                <tr>
                  <th>Nama File</th>
                  <th>Tipe</th>
                  <th>Status</th>
                  <th>Ukuran</th>
                  <th>Durasi</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {backups.data.map((backup) => (
                  <tr key={backup.id}>
                    {/* Name */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {backup.name}
                        </span>
                        {backup.creator && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            oleh {backup.creator.username}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td>
                      <span className={`backup-type-badge ${backup.type}`}>
                        {backup.type === 'database' && (
                          <svg viewBox="0 0 24 24" width="12" height="12">
                            <path
                              d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4z"
                              fill="currentColor"
                            />
                          </svg>
                        )}
                        {backup.type === 'files' && (
                          <svg viewBox="0 0 24 24" width="12" height="12">
                            <path
                              d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"
                              fill="currentColor"
                            />
                          </svg>
                        )}
                        {backup.type === 'full' && (
                          <svg viewBox="0 0 24 24" width="12" height="12">
                            <path
                              d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"
                              fill="currentColor"
                            />
                          </svg>
                        )}
                        {TYPE_LABELS[backup.type]}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`backup-status-badge ${backup.status}`}>
                        {backup.status === 'pending' && '⏳ Menunggu'}
                        {backup.status === 'running' && '⚙️ Berjalan'}
                        {backup.status === 'completed' && '✅ Berhasil'}
                        {backup.status === 'failed' && (
                          <span className="backup-error-tooltip">
                            ❌ Gagal
                            {backup.error_message && (
                              <span className="tooltip-text">
                                {backup.error_message}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Size */}
                    <td>
                      {backup.file_size ? formatBytes(backup.file_size) : '-'}
                    </td>

                    {/* Duration */}
                    <td>{backup.duration || '-'}</td>

                    {/* Created At */}
                    <td>{formatDate(backup.created_at)}</td>

                    {/* Actions */}
                    <td>
                      <div className="backup-action-group">
                        <button
                          className="backup-action-btn download"
                          title="Unduh Backup"
                          onClick={() => handleDownload(backup)}
                          disabled={
                            backup.status !== 'completed' ||
                            downloading === backup.id
                          }
                        >
                          {downloading === backup.id ? (
                            <svg
                              viewBox="0 0 24 24"
                              width="18"
                              height="18"
                              style={{ animation: 'spin 1s linear infinite' }}
                            >
                              <path
                                d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
                                fill="currentColor"
                              />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24">
                              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                            </svg>
                          )}
                        </button>

                        {/* Cancel Button (only for pending) */}
                        {backup.status === 'pending' && (
                          <button
                            className="backup-action-btn delete"
                            title="Batalkan Backup"
                            onClick={() => handleCancel(backup)}
                            disabled={cancelling === backup.id}
                          >
                            {cancelling === backup.id ? (
                              <svg viewBox="0 0 24 24" width="18" height="18" style={{ animation: 'spin 1s linear infinite' }}>
                                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" fill="currentColor"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                              </svg>
                            )}
                          </button>
                        )}

                        <button
                          className="backup-action-btn delete"
                          title="Hapus Backup"
                          onClick={() => openDeleteModal(backup)}
                          disabled={
                            backup.status === 'running' ||
                            backup.status === 'pending'
                          }
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="backup-pagination">
              <span className="backup-pagination-info">
                Menampilkan {backups.data.length} dari {backups.total} backup
              </span>
              <div className="backup-pagination-btns">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      Math.abs(p - page) <= 1 ||
                      p === 1 ||
                      p === totalPages
                  )
                  .map((p, idx, arr) => {
                    const isGap =
                      arr[idx - 1] && p - arr[idx - 1] > 1;
                    return (
                      <span key={p}>
                        {isGap && <button disabled>…</button>}
                        <button
                          className={p === page ? 'active' : ''}
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

      {/* ─── Create Backup Modal ─── */}
      {showCreateModal && (
        <div
          className="backup-modal-overlay"
          onClick={() => !creating && setShowCreateModal(false)}
        >
          <div
            className="backup-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="backup-modal-header">
              <div>
                <h3>Buat Backup Baru</h3>
                <p>Pilih jenis backup yang ingin dibuat</p>
              </div>
              <button
                className="backup-modal-close"
                onClick={() => !creating && setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="backup-modal-body">
              <div className="section-label">Jenis Backup</div>
              <div className="backup-checkbox-group">
                {/* Database */}
                <label
                  className={`backup-checkbox-option ${createType === 'database' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="backup-type"
                    value="database"
                    checked={createType === 'database'}
                    onChange={() => setCreateType('database')}
                  />
                  <div className="backup-checkbox-custom">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div className="backup-checkbox-text">
                    <h4>Database</h4>
                    <p>Mencadangkan seluruh data database MySQL menggunakan mysqldump</p>
                  </div>
                  <div className="backup-checkbox-icon db-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4z" />
                    </svg>
                  </div>
                </label>

                {/* Files */}
                <label
                  className={`backup-checkbox-option ${createType === 'files' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="backup-type"
                    value="files"
                    checked={createType === 'files'}
                    onChange={() => setCreateType('files')}
                  />
                  <div className="backup-checkbox-custom">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div className="backup-checkbox-text">
                    <h4>File Sistem</h4>
                    <p>Mencadangkan file upload, foto, dan dokumen lainnya</p>
                  </div>
                  <div className="backup-checkbox-icon file-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                    </svg>
                  </div>
                </label>

                {/* Full */}
                <label
                  className={`backup-checkbox-option ${createType === 'full' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="backup-type"
                    value="full"
                    checked={createType === 'full'}
                    onChange={() => setCreateType('full')}
                  />
                  <div className="backup-checkbox-custom">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div className="backup-checkbox-text">
                    <h4>Full Backup</h4>
                    <p>Mencadangkan database dan file secara lengkap dalam satu arsip</p>
                  </div>
                  <div className="backup-checkbox-icon full-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z" />
                    </svg>
                  </div>
                </label>
              </div>
            </div>

            <div className="backup-modal-footer">
              <button
                className="backup-btn-cancel"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Batal
              </button>
              <button
                className="backup-btn-submit"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      style={{ animation: 'spin 1s linear infinite' }}
                    >
                      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    Buat Backup
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteModal && (
        <div
          className="backup-modal-overlay"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="backup-delete-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Konfirmasi Hapus Backup</h3>
            <p>
              Apakah Anda yakin ingin menghapus backup{' '}
              <strong>{selectedBackup?.name}</strong>? File backup akan dihapus
              secara permanen dan tidak dapat dikembalikan.
            </p>
            <div className="backup-delete-actions">
              <button
                className="backup-btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                className="backup-btn-danger"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Menghapus...' : 'Hapus Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
