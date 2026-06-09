import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { meetingService } from '../../services/meetingService';
import { useToast } from '../../contexts/ToastContext';
import type { MeetingDetailData, ParticipantWithAttendance } from '../../types/meeting';
import './MeetingDetail.css';
import imgWaiting from '../../assets/icons/Jadwal kehadiran/presensi qr.webp';
import imgSuccess from '../../assets/icons/Jadwal kehadiran/berhasil qr.webp';
import imgError from '../../assets/icons/Jadwal kehadiran/gagal qr.webp';

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MeetingDetail() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [data, setData] = useState<MeetingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [attendanceSearch, setAttendanceSearch] = useState('');

  /* scan modal */
  const [showScan, setShowScan] = useState(false);
  const [scanNip, setScanNip] = useState('');
  const [scanState, setScanState] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanEmployeeName, setScanEmployeeName] = useState('');
  const [scanErrorMessage, setScanErrorMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (!id) return;
    if (isInitial) setLoading(true);
    try {
      const res = await meetingService.show(Number(id));
      setData(res.data);
    } catch {
      setError('Gagal memuat detail rapat.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = () => setOpenDropdown(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* scan barcode */
  const handleScan = async () => {
    if (!id || !scanNip.trim()) return;
    setScanning(true);
    
    // Hapus timer reset sebelumnya (misal karyawan nge-scan secara sangat cepat / beruntun)
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);

    try {
      const res = await meetingService.scanBarcode(Number(id), scanNip.trim());
      const employeeName = res.data?.employee?.full_name || res.data?.employee?.name || 'Karyawan';
      setScanEmployeeName(employeeName);
      setScanState('success');
      fetchData();
    } catch (err: unknown) {
      let msg = 'Barcode tidak valid';
      if (err && typeof err === 'object' && 'response' in err) {
        const ae = err as { response?: { data?: { message?: string } } };
        msg = ae.response?.data?.message || msg;
      }
      setScanErrorMessage(msg);
      setScanState('error');
    } finally {
      setScanning(false);
      setScanNip(''); // Selalu bersihkan input setelah proses (baik sukses maupun gagal)
      setTimeout(() => scanRef.current?.focus(), 100);

      // Reset otomatis ke mode "Menunggu Scan" setelah 2.5 detik
      scanTimerRef.current = setTimeout(() => {
        setScanState('idle');
      }, 2500);
    }
  };

  /* manual attendance — toggle status */
  const handleChangeStatus = async (p: ParticipantWithAttendance, newStatus: 'hadir' | 'tidak_hadir') => {
    if (!id) return;
    setOpenDropdown(null);
    try {
      await meetingService.manualAttendance(Number(id), p.id, newStatus);
      showToast("Status kehadiran berhasil diperbarui");
      fetchData();
    } catch {
      // ignore
    }
  };

  /* filtered attendance participants based on search */
  const participants_with_attendance = data?.participants_with_attendance ?? [];
  const filteredAttendance = useMemo(() => {
    const q = attendanceSearch.toLowerCase().trim();
    if (!q) return participants_with_attendance;
    return participants_with_attendance.filter(p =>
      p.employee.full_name.toLowerCase().includes(q) ||
      (p.employee.position?.position || '').toLowerCase().includes(q) ||
      (p.employee.work_unit?.work_unit || '').toLowerCase().includes(q) ||
      (p.employee.nip || '').toLowerCase().includes(q)
    );
  }, [participants_with_attendance, attendanceSearch]);

  if (loading) return <div className="meeting-loading">Memuat detail rapat...</div>;
  if (error) return <div className="meeting-error">{error}</div>;
  if (!data) return null;

  const { meeting, attendance_summary } = data;

  return (
    <div className="meeting-detail-page">
      {/* Header */}
      <div className="meeting-page-header">
        <div className="meeting-page-header-text">
          <h1>Presensi Rapat</h1>
          <p>Catat kehadiran peserta rapat</p>
        </div>
        <div className="attendance-counters">
          <div className="attendance-counter">
            <span className="attendance-counter-value hadir">{attendance_summary.hadir}</span>
            <span className="attendance-counter-label">Hadir</span>
          </div>
          <div className="attendance-counter">
            <span className="attendance-counter-value tidak-hadir">{attendance_summary.tidak_hadir}</span>
            <span className="attendance-counter-label">Tidak Hadir</span>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="detail-info-card">
        <h2>
          <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
          Informasi Rapat
        </h2>

        <div className="detail-row single">
          <div className="detail-field">
            <label>Judul Rapat</label>
            <div className="detail-field-value">{meeting.title}</div>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-field">
            <label>Tanggal</label>
            <div className="detail-field-value">{formatDate(meeting.start_time)}</div>
          </div>
          <div className="detail-field">
            <label>Pihak Penyelenggara</label>
            <div className="detail-field-value">{meeting.organizer || '-'}</div>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-field">
            <label>Waktu Mulai</label>
            <div className="detail-field-value">{formatTime(meeting.start_time)}</div>
          </div>
          <div className="detail-field">
            <label>Waktu Selesai</label>
            <div className="detail-field-value">{formatTime(meeting.end_time)}</div>
          </div>
        </div>

        <div className="detail-row single">
          <div className="detail-field">
            <label>Tempat Rapat</label>
            <div className="detail-field-value">{meeting.room?.name || '-'}</div>
          </div>
        </div>
      </div>

      {/* Attendance list */}
      <div className="attendance-card">
        <div className="attendance-header">
          <h3>
            <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            Data Peserta Rapat ({attendance_summary.total} peserta)
          </h3>
          <button className="scan-barcode-btn" onClick={() => { 
            setShowScan(true); 
            setScanState('idle'); 
            setScanNip(''); 
          }}>
            <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h2V6h-2v3zm6 0h2V6h-2v3zm-3 0h2V6h-2v3zm-3 4h2v-3h-2v3zm6 0h2v-3h-2v3zm-3 0h2v-3h-2v3z"/></svg>
            Scan Barcode
          </button>
        </div>

        {/* Search peserta */}
        {participants_with_attendance.length > 0 && (
          <div className="attendance-search-wrapper">
            <svg className="attendance-search-icon" viewBox="0 0 24 24" width="18" height="18">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#94a3b8"/>
            </svg>
            <input
              type="text"
              className="attendance-search-input"
              placeholder="Cari peserta berdasarkan nama, jabatan, atau NIP..."
              value={attendanceSearch}
              onChange={e => setAttendanceSearch(e.target.value)}
            />
            {attendanceSearch && (
              <button type="button" className="attendance-search-clear" onClick={() => setAttendanceSearch('')}>
                ✕
              </button>
            )}
          </div>
        )}

        {filteredAttendance.length === 0 ? (
          <div className="attendance-empty">Tidak ada peserta yang cocok dengan pencarian.</div>
        ) : (
          <div className={`attendance-list${filteredAttendance.length > 5 ? ' scrollable' : ''}`}>
            {filteredAttendance.map(p => (
              <div className={`attendance-item${p.status === 'tidak_hadir' ? ' absent' : ''}`} key={p.id}>
                <div className="attendance-avatar">{initials(p.employee.full_name)}</div>
                <div className="attendance-info">
                  <div className="attendance-name">{p.employee.full_name}</div>
                  <div className="attendance-subtext">
                    {[p.employee.position?.position, p.employee.work_unit?.work_unit, `NIP: ${p.employee.nip}`].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <div className="attendance-time">
                  <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                  <span>{p.check_in_time ? formatTime(p.check_in_time) : '-'}</span>
                </div>
                <div className="attendance-dropdown-wrapper" onClick={e => e.stopPropagation()}>
                  <button
                    className={`attendance-dropdown-btn ${p.status === 'hadir' ? 'hadir' : 'tidak-hadir'}`}
                    onClick={() => setOpenDropdown(openDropdown === p.id ? null : p.id)}
                  >
                    {p.status === 'hadir' ? (
                      <>
                        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                        Hadir
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                        Tidak Hadir
                      </>
                    )}
                    <svg className="dropdown-chevron" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                  </button>
                  {openDropdown === p.id && (
                    <div className="attendance-dropdown-menu">
                      <button
                        className={`dropdown-option hadir${p.status === 'hadir' ? ' active' : ''}`}
                        onClick={() => handleChangeStatus(p, 'hadir')}
                      >
                        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                        Hadir
                      </button>
                      <button
                        className={`dropdown-option tidak-hadir${p.status === 'tidak_hadir' ? ' active' : ''}`}
                        onClick={() => handleChangeStatus(p, 'tidak_hadir')}
                      >
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                        Tidak Hadir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Scan barcode modal */}
      {showScan && (
        <div className="modal-overlay" onClick={() => setShowScan(false)}>
          <div className="modal-boxscan" onClick={e => e.stopPropagation()}>
            <button className="modal-close-icon" onClick={() => setShowScan(false)}>
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <h2 className="modal-title">Scan Barcode Karyawan</h2>
            <p className="modal-subtitle">Silakan scan barcode pada kartu karyawan Anda menggunakan scanner</p>

            <div className="scan-body">
              {scanState === 'idle' && (
                <div className="scan-state-content">
                  <img src={imgWaiting} alt="Menunggu scan" className="scan-status-img idle-img" />
                  <h3 className="scan-status-title">Menunggu Scan...</h3>
                  <p className="scan-status-desc">Arahkan kartu karyawan Anda ke scanner barcode yang tersedia</p>
                  <div className="scan-status-indicator blue">
                    <span className="dot"></span> Scanner aktif...
                  </div>
                </div>
              )}

              {scanState === 'success' && (
                <div className="scan-state-content">
                  <img src={imgSuccess} alt="Scan Berhasil" className="scan-status-img" />
                  <p className="scan-status-label green">Karyawan atas nama</p>
                  <h3 className="scan-employee-name blue">"{scanEmployeeName}"</h3>
                  <p className="scan-status-result green">Telah hadir</p>
                  <div className="scan-status-indicator blue">
                    <span className="dot"></span> Bersiap untuk scan berikutnya...
                  </div>
                </div>
              )}

              {scanState === 'error' && (
                <div className="scan-state-content">
                  <img src={imgError} alt="Scan Gagal" className="scan-status-img" />
                  <h3 className="scan-status-result red">Scan Gagal</h3>
                  <p className="scan-error-msg">{scanErrorMessage}</p>
                  <div className="scan-status-indicator blue">
                    <span className="dot"></span> Bersiap untuk scan berikutnya...
                  </div>
                </div>
              )}
            </div>

            <button className="scan-close-btn" onClick={() => setShowScan(false)}>Tutup</button>
            
            {/* Hidden input to keep functionality working for barcode scanner */}
            <input
              ref={scanRef}
              className="scan-hidden-input"
              type="text"
              value={scanNip}
              onChange={e => setScanNip(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleScan(); }}
              autoFocus
              disabled={scanning}
            />
          </div>
        </div>
      )}
    </div>
  );
}
