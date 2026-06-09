import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { meetingService, meetingRoomService } from '../../services/meetingService';
import { employeeService, workUnitService } from '../../services/employeeService';
import { useAuthStore } from '../../store/authStore';
import type { MeetingRoom, MeetingFormData } from '../../types/meeting';
import type { Employee, WorkUnit } from '../../types/employee';
import './MeetingForm.css';

/* helpers */
function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function toLocalDateValue(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalTimeValue(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const AVATAR_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#0ea5e9'];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─── Scrollable Time Picker ─── */
const HOURS_LIST = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ITEM_H = 40;

function ScrollCol({ items, selected, onSelect }: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const scrollToIdx = useCallback((idx: number, smooth = false) => {
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'instant' as ScrollBehavior });
  }, []);

  // Scroll to selected on first render
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0) scrollToIdx(idx, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      scrollToIdx(clamped);
      onSelect(items[clamped]);
    }, 120);
  };

  return (
    <div className="tpd-col" ref={ref} onScroll={handleScroll}>
      <div style={{ height: ITEM_H * 2, flexShrink: 0 }} />
      {items.map(item => (
        <div
          key={item}
          className={`tpd-item${item === selected ? ' active' : ''}`}
          onClick={() => { onSelect(item); scrollToIdx(items.indexOf(item), true); }}
        >
          {item}
        </div>
      ))}
      <div style={{ height: ITEM_H * 2, flexShrink: 0 }} />
    </div>
  );
}

function TimePickerInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const parts = value ? value.split(':') : ['00', '00'];
  const hh = parts[0] || '00';
  const mm = parts[1] || '00';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const setHH = useCallback((h: string) => onChange(`${h}:${mm}`), [mm, onChange]);
  const setMM = useCallback((m: string) => onChange(`${hh}:${m}`), [hh, onChange]);

  return (
    <div className="tpd-wrapper" ref={wrapRef}>
      <div className={`tpd-trigger${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)}>
        <span className="tpd-display">{value || '00:00'}</span>
        <svg className="tpd-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
        </svg>
      </div>
      {open && (
        <div className="tpd-dropdown">
          <div className="tpd-cols-wrapper">
            <div className="tpd-highlight" />
            <div className="tpd-cols">
              <ScrollCol items={HOURS_LIST} selected={hh} onSelect={setHH} />
              <div className="tpd-sep">:</div>
              <ScrollCol items={MINUTES_LIST} selected={mm} onSelect={setMM} />
            </div>
          </div>
          <div className="tpd-footer">
            <button type="button" className="tpd-ok-btn" onClick={() => setOpen(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  /* dropdown data */
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);

  /* form */
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState(() => {
    // Auto-fill with logged-in user's username for new meetings
    if (!id) return user?.username || '';
    return '';
  });
  const [roomId, setRoomId] = useState<number | ''>('');
  const [meetingDate, setMeetingDate] = useState('');
  const [startTimeOnly, setStartTimeOnly] = useState('');
  const [endTimeOnly, setEndTimeOnly] = useState('');
  const [participants, setParticipants] = useState<Employee[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loadingDetail, setLoadingDetail] = useState(isEdit);

  /* ─── Division-based participant modal ─── */
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [divisions, setDivisions] = useState<WorkUnit[]>([]);
  const [divisionEmployees, setDivisionEmployees] = useState<Record<number, Employee[]>>({});
  const [unassignedEmployees, setUnassignedEmployees] = useState<Employee[]>([]);
  const [allEmployeesMap, setAllEmployeesMap] = useState<Record<number, Employee>>({});
  const [expandedDivisions, setExpandedDivisions] = useState<Set<number>>(new Set());
  const [expandedUnassigned, setExpandedUnassigned] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<Set<number>>(new Set());
  const [divisionSearch, setDivisionSearch] = useState('');
  const [divisionDataLoaded, setDivisionDataLoaded] = useState(false);
  const [divisionLoading, setDivisionLoading] = useState(false);

  /* load rooms */
  useEffect(() => {
    meetingRoomService.list().then(setRooms).catch(() => { });
  }, []);

  /* load meeting detail for edit */
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        const res = await meetingService.show(Number(id));
        const m = res.data.meeting;
        setTitle(m.title);
        setOrganizer(m.organizer || '');
        setRoomId(m.room_id);
        setMeetingDate(toLocalDateValue(m.start_time));
        setStartTimeOnly(toLocalTimeValue(m.start_time));
        setEndTimeOnly(toLocalTimeValue(m.end_time));
        setParticipants(m.participants?.map(p => p.employee) || []);
      } catch {
        // ignore
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [isEdit, id]);

  /* load division data (once) */
  const loadDivisionData = useCallback(async () => {
    if (divisionDataLoaded) return;
    setDivisionLoading(true);
    try {
      const units = await workUnitService.list();
      const namedUnits = units.filter((u: { work_unit: string | null }) => u.work_unit && u.work_unit.toLowerCase() !== 'none');
      setDivisions(namedUnits);

      // 1. Ambil karyawan tanpa unit kerja (work_unit_id IS NULL)
      const unassignedRes = await employeeService.list({ work_unit_id: 'All', per_page: 500 });
      const unassigned: Employee[] = unassignedRes.data.data || [];
      setUnassignedEmployees(unassigned);
      const unassignedIds = new Set(unassigned.map((e: Employee) => e.id));

      const empMap: Record<number, Employee[]> = {};
      const allMap: Record<number, Employee> = {};

      // 2. Fetch per unit
      // Unit lain: filter keluar unassigned agar tidak duplikat
      await Promise.all(
        namedUnits.map(async (unit: { id: number; work_unit: string }) => {
          const res = await employeeService.list({ work_unit_id: unit.id, per_page: 200 });
          const allEmps: Employee[] = res.data.data || [];
          const emps = allEmps.filter((e: Employee) => !unassignedIds.has(e.id));
          empMap[unit.id] = emps;
          emps.forEach((emp: Employee) => { allMap[emp.id] = emp; });
        })
      );

      unassigned.forEach((emp: Employee) => { allMap[emp.id] = emp; });
      setDivisionEmployees(empMap);
      setAllEmployeesMap(allMap);
      setDivisionDataLoaded(true);
    } catch {
      // ignore
    } finally {
      setDivisionLoading(false);
    }
  }, [divisionDataLoaded]);

  /* open modal */
  const openParticipantModal = useCallback(() => {
    setPendingSelection(new Set(participants.map(p => p.id)));
    setDivisionSearch('');
    setExpandedDivisions(new Set());
    setExpandedUnassigned(false);
    setShowEmpModal(true);
    loadDivisionData();
  }, [participants, loadDivisionData]);

  /* filtered participants based on search */
  const filteredParticipants = useMemo(() => {
    const q = participantSearch.toLowerCase().trim();
    if (!q) return participants;
    return participants.filter(p =>
      p.full_name.toLowerCase().includes(q) ||
      (p.position?.position || '').toLowerCase().includes(q) ||
      (p.work_unit?.work_unit || '').toLowerCase().includes(q) ||
      (p.nip || '').toLowerCase().includes(q)
    );
  }, [participants, participantSearch]);

  /* filtered divisions based on search — hanya unit yang punya nama */
  const filteredDivisions = useMemo(() => {
    const q = divisionSearch.toLowerCase().trim();
    const named = divisions.filter(div => div.work_unit); // pastikan nama tidak kosong
    if (!q) return named;
    return named.filter(div => {
      const emps = divisionEmployees[div.id] || [];
      return (
        div.work_unit.toLowerCase().includes(q) ||
        emps.some(e => e.full_name.toLowerCase().includes(q))
      );
    });
  }, [divisions, divisionEmployees, divisionSearch]);

  /* get filtered employees within a division */
  const getFilteredEmployees = useCallback((divId: number) => {
    const emps = divisionEmployees[divId] || [];
    const q = divisionSearch.toLowerCase().trim();
    if (!q) return emps;
    return emps.filter(e => e.full_name.toLowerCase().includes(q));
  }, [divisionEmployees, divisionSearch]);

  /* toggle expand */
  const toggleExpand = (divId: number) => {
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(divId)) next.delete(divId);
      else next.add(divId);
      return next;
    });
  };

  /* toggle single employee */
  const toggleEmployee = (empId: number) => {
    setPendingSelection(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  /* select all / deselect all for a division */
  const toggleSelectAllDivision = (divId: number) => {
    const emps = getFilteredEmployees(divId);
    const allSelected = emps.every(e => pendingSelection.has(e.id));
    setPendingSelection(prev => {
      const next = new Set(prev);
      if (allSelected) {
        emps.forEach(e => next.delete(e.id));
      } else {
        emps.forEach(e => next.add(e.id));
      }
      return next;
    });
  };

  /* save modal selection */
  const handleModalSave = () => {
    const selectedEmps: Employee[] = [];
    pendingSelection.forEach(id => {
      const emp = allEmployeesMap[id];
      if (emp) selectedEmps.push(emp);
    });
    setParticipants(selectedEmps);
    setShowEmpModal(false);
  };

  /* remove participant from list */
  const removeParticipant = (empId: number) => {
    setParticipants(prev => prev.filter(p => p.id !== empId));
  };

  /* submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    const startIso = meetingDate && startTimeOnly ? new Date(`${meetingDate}T${startTimeOnly}`).toISOString() : '';
    const endIso = meetingDate && endTimeOnly ? new Date(`${meetingDate}T${endTimeOnly}`).toISOString() : '';

    const payload: MeetingFormData = {
      title,
      organizer,
      room_id: roomId as number,
      start_time: startIso,
      end_time: endIso,
      participant_employee_ids: participants.map(p => p.id),
      participant_work_unit_ids: [],
    };

    try {
      if (isEdit && id) {
        await meetingService.update(Number(id), payload);
      } else {
        await meetingService.store(payload);
      }
      navigate('/meetings', { state: { toastMessage: isEdit ? 'Jadwal Rapat berhasil diperbarui!' : 'Jadwal Rapat berhasil dibuat!' } });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]> } } };
        if (axiosErr.response?.data?.errors) {
          setErrors(axiosErr.response.data.errors);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingDetail) {
    return <div className="meeting-loading">Memuat data rapat...</div>;
  }

  return (
    <div className="meeting-form-page">
      {/* Header */}
      <div className="meeting-page-header">
        <div className="meeting-page-header-text">
          <h1>{isEdit ? 'Edit Jadwal Rapat' : 'Tambah Jadwal Rapat'}</h1>
          <p>{isEdit ? 'Ubah informasi jadwal rapat' : 'Buat jadwal rapat baru untuk RS Citra Husada'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Info Card */}
        <div className="meeting-form-card">
          <h2 className="meeting-form-card-title">
            <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" /></svg>
            Informasi Rapat
          </h2>

          <div className="form-row single">
            <div className="form-field">
              <label>Judul Rapat <span className="required">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Masukkan judul rapat" required />
              {errors.title && <div className="form-field-error">{errors.title[0]}</div>}
            </div>
          </div>

          <div className={`form-row ${!isEdit ? 'single' : ''}`}>
            <div className="form-field">
              <label>Tanggal Rapat <span className="required">*</span></label>
              <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} required />
              {errors.start_time && <div className="form-field-error">{errors.start_time[0]}</div>}
            </div>

          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Waktu Mulai <span className="required">*</span></label>
              <TimePickerInput value={startTimeOnly} onChange={setStartTimeOnly} />
            </div>
            <div className="form-field">
              <label>Waktu Selesai <span className="required">*</span></label>
              <TimePickerInput value={endTimeOnly} onChange={setEndTimeOnly} />
              {errors.end_time && <div className="form-field-error">{errors.end_time[0]}</div>}
            </div>
          </div>

          <div className="form-row single">
            <div className="form-field">
              <label>Tempat Rapat <span className="required">*</span></label>
              <select value={roomId} onChange={e => setRoomId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Pilih tempat rapat</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.room_id && <div className="form-field-error">{errors.room_id[0]}</div>}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="participants-card">
          <div className="participants-header">
            <h3>
              <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
              Data Peserta Rapat ({participants.length} peserta)
            </h3>
            <button type="button" className="add-participant-btn" onClick={openParticipantModal}>
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
              Tambah Peserta Rapat
            </button>
          </div>

          {errors.participants && <div className="form-field-error" style={{ marginBottom: '0.75rem' }}>{errors.participants[0]}</div>}

          {/* Search peserta */}
          {participants.length > 0 && (
            <div className="participant-search-wrapper">
              <svg className="participant-search-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#94a3b8" />
              </svg>
              <input
                type="text"
                className="participant-search-input"
                placeholder="Cari peserta berdasarkan nama, jabatan, atau NIP..."
                value={participantSearch}
                onChange={e => setParticipantSearch(e.target.value)}
              />
              {participantSearch && (
                <button type="button" className="participant-search-clear" onClick={() => setParticipantSearch('')}>
                  ✕
                </button>
              )}
            </div>
          )}

          {participants.length === 0 ? (
            <div className="participants-empty">Belum ada peserta ditambahkan.</div>
          ) : filteredParticipants.length === 0 ? (
            <div className="participants-empty">Tidak ada peserta yang cocok dengan pencarian.</div>
          ) : (
            <div className={`participant-list${filteredParticipants.length > 5 ? ' scrollable' : ''}`}>
              {filteredParticipants.map(p => (
                <div className="participant-item" key={p.id}>
                  <div className="participant-avatar" style={{ background: avatarColor(p.full_name) }}>{initials(p.full_name)}</div>
                  <div className="participant-info">
                    <div className="participant-name">{p.full_name}</div>
                    <div className="participant-detail">
                      {[p.position?.position, p.work_unit?.work_unit, `NIP: ${p.nip}`].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                  <button type="button" className="participant-remove-btn" onClick={() => removeParticipant(p.id)} title="Hapus peserta">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="meeting-form-footer">
          <button type="button" className="btn-cancel" onClick={() => navigate('/meetings')}>Batal</button>
          <button type="submit" className="btn-submit" disabled={saving}>
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Jadwal Rapat'}
          </button>
        </div>
      </form>

      {/* ─── Division & Participant Selection Modal ─── */}
      {showEmpModal && (
        <div className="modal-overlay" onClick={() => setShowEmpModal(false)}>
          <div className="division-modal-box" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="division-modal-header">
              <h3>Tambah Peserta Rapat</h3>
              <button type="button" className="division-modal-close" onClick={() => setShowEmpModal(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" /></svg>
              </button>
            </div>

            {/* Search */}
            <div className="division-search-wrapper">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#94a3b8" /></svg>
              <input
                type="text"
                className="division-search-input"
                placeholder="Cari peserta berdasarkan nama..."
                value={divisionSearch}
                onChange={e => setDivisionSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Unit Kerja list */}
            <div className="division-list">
              {divisionLoading ? (
                <div className="division-loading">Memuat data unit kerja...</div>
              ) : filteredDivisions.length === 0 && unassignedEmployees.length === 0 ? (
                <div className="division-loading">Tidak ada data karyawan ditemukan.</div>
              ) : (
                <>
                  {/* Seksi per unit kerja */}
                  {filteredDivisions.map(div => {
                    const emps = getFilteredEmployees(div.id);
                    const totalMembers = (divisionEmployees[div.id] || []).length;
                    const isExpanded = expandedDivisions.has(div.id);
                    const allSelected = emps.length > 0 && emps.every(e => pendingSelection.has(e.id));
                    const someSelected = emps.some(e => pendingSelection.has(e.id));

                    return (
                      <div className="division-section" key={div.id}>
                        {/* Division header */}
                        <div className="division-header" onClick={() => toggleExpand(div.id)}>
                          <div className="division-header-left">
                            <div className="division-icon">
                              <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" fill="#1d4ed8" /></svg>
                            </div>
                            <div className="division-title-info">
                              <span className="division-name">{div.work_unit === 'none' ? 'Semua' : div.work_unit}</span>
                              <span className="division-count">{totalMembers} anggota</span>
                            </div>
                          </div>
                          <div className="division-header-right">
                            <label className="division-select-all" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                onChange={() => toggleSelectAllDivision(div.id)}
                              />
                              <span>Pilih Semua</span>
                            </label>
                            <svg className={`division-chevron ${isExpanded ? 'expanded' : ''}`} viewBox="0 0 24 24" width="20" height="20">
                              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill="#64748b" />
                            </svg>
                          </div>
                        </div>

                        {/* Employee list */}
                        {isExpanded && (
                          <div className="division-members">
                            {emps.length === 0 ? (
                              <div className="division-no-members">Tidak ada anggota ditemukan.</div>
                            ) : (
                              emps.map(emp => {
                                const checked = pendingSelection.has(emp.id);
                                return (
                                  <div
                                    key={emp.id}
                                    className={`division-member-item ${checked ? 'checked' : ''}`}
                                    onClick={() => toggleEmployee(emp.id)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleEmployee(emp.id)}
                                      onClick={e => e.stopPropagation()}
                                      className="member-checkbox"
                                    />
                                    <div className="member-avatar" style={{ background: avatarColor(emp.full_name) }}>
                                      {initials(emp.full_name)}
                                    </div>
                                    <div className="member-info">
                                      <div className="member-name">{emp.full_name}</div>
                                      <div className="member-position">{emp.position?.position || '-'}</div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Seksi Tanpa Unit Kerja */}
                  {(() => {
                    const q = divisionSearch.toLowerCase().trim();
                    const unassignedFiltered = q
                      ? unassignedEmployees.filter(e => e.full_name.toLowerCase().includes(q))
                      : unassignedEmployees;
                    if (unassignedFiltered.length === 0 && q) return null;
                    const allSel = unassignedFiltered.length > 0 && unassignedFiltered.every(e => pendingSelection.has(e.id));
                    const someSel = unassignedFiltered.some(e => pendingSelection.has(e.id));
                    const toggleAllUnassigned = () => {
                      setPendingSelection(prev => {
                        const next = new Set(prev);
                        if (allSel) unassignedFiltered.forEach(e => next.delete(e.id));
                        else unassignedFiltered.forEach(e => next.add(e.id));
                        return next;
                      });
                    };
                    return (
                      <div className="division-section">
                        <div className="division-header" onClick={() => setExpandedUnassigned(v => !v)}>
                          <div className="division-header-left">
                            <div className="division-icon" style={{ background: '#fef3c7' }}>
                              <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#d97706" /></svg>
                            </div>
                            <div className="division-title-info">
                              <span className="division-name">Tanpa Unit Kerja</span>
                              <span className="division-count">{unassignedEmployees.length} anggota</span>
                            </div>
                          </div>
                          <div className="division-header-right">
                            <label className="division-select-all" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={allSel}
                                ref={el => { if (el) el.indeterminate = someSel && !allSel; }}
                                onChange={toggleAllUnassigned}
                              />
                              <span>Pilih Semua</span>
                            </label>
                            <svg className={`division-chevron ${expandedUnassigned ? 'expanded' : ''}`} viewBox="0 0 24 24" width="20" height="20">
                              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill="#64748b" />
                            </svg>
                          </div>
                        </div>

                        {expandedUnassigned && (
                          <div className="division-members">
                            {unassignedFiltered.length === 0 ? (
                              <div className="division-no-members">Tidak ada anggota ditemukan.</div>
                            ) : (
                              unassignedFiltered.map(emp => {
                                const checked = pendingSelection.has(emp.id);
                                return (
                                  <div
                                    key={emp.id}
                                    className={`division-member-item ${checked ? 'checked' : ''}`}
                                    onClick={() => toggleEmployee(emp.id)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleEmployee(emp.id)}
                                      onClick={e => e.stopPropagation()}
                                      className="member-checkbox"
                                    />
                                    <div className="member-avatar" style={{ background: avatarColor(emp.full_name) }}>
                                      {initials(emp.full_name)}
                                    </div>
                                    <div className="member-info">
                                      <div className="member-name">{emp.full_name}</div>
                                      <div className="member-position">{emp.position?.position || '-'}</div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="division-modal-footer">
              <span className="division-selected-count">{pendingSelection.size} peserta dipilih</span>
              <div className="division-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEmpModal(false)}>Batal</button>
                <button type="button" className="btn-division-save" onClick={handleModalSave}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
