import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import DashboardSekretaris from './DashboardSekretaris';
import './Dashboard.css';

/* ─── Types ─── */
interface DashboardSummary {
  total_employees: number;
  meetings_today: number;
  meetings_pending: number;
  meetings_completed: number;
}

interface MeetingRoom {
  id: number;
  name: string;
  location?: string;
}

interface MeetingCreator {
  id: number;
  username: string;
}

interface TodayMeeting {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  room: MeetingRoom | null;
  creator: MeetingCreator | null;
  participants_count: number;
  attendance_present: number;
  attendance_absent: number;
}

interface RoomMeeting {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface RoomUsage {
  id: number;
  name: string;
  meetings: RoomMeeting[];
}

interface DashboardData {
  date: string;
  summary: DashboardSummary;
  todays_meetings: TodayMeeting[];
  room_usage: RoomUsage[];
}

/* ─── Helpers ─── */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    menunggu: 'Menunggu',
    berlangsung: 'Berlangsung',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
  };
  return map[status] || status;
}

function getStatusClass(status: string): string {
  return status.replace(/\s+/g, '_').toLowerCase();
}

/* ─── Timeline helpers ─── */
const TIMELINE_START = 7; // 07:00
const TIMELINE_END = 17; // 17:00
const TIMELINE_HOURS = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i);

function getTimelinePosition(timeStr: string): number {
  const d = new Date(timeStr);
  let h = d.getHours() + d.getMinutes() / 60;
  h = Math.max(TIMELINE_START, Math.min(TIMELINE_END, h));
  // Tambahkan 0.5 agar rata dengan posisi teks jam di tengah (center) sel
  return (h - TIMELINE_START) + 0.5;
}

function getTimelineWidth(startStr: string, endStr: string): number {
  const s = new Date(startStr);
  const e = new Date(endStr);
  let startH = s.getHours() + s.getMinutes() / 60;
  let endH = e.getHours() + e.getMinutes() / 60;
  startH = Math.max(TIMELINE_START, Math.min(TIMELINE_END, startH));
  endH = Math.max(TIMELINE_START, Math.min(TIMELINE_END, endH));
  return Math.max(0, endH - startH);
}

import iconTotalKaryawan from '../../assets/icons/dashboard/total karyawan.webp';
import iconRapatHariIni from '../../assets/icons/dashboard/rapat hari ini.webp';
import iconRapatMenunggu from '../../assets/icons/dashboard/rapat menunggu.webp';
import iconRapatSelesai from '../../assets/icons/dashboard/rapat selesai.webp';

/* ─── Component ─── */
export default function Dashboard() {
  const { user } = useAuthStore();
  if (user?.role_id === 3) return <DashboardSekretaris />;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const fetchData = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard', { params: { date } });
      setData(res.data.data);
    } catch {
      setError('Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-spinner" />
        Memuat dashboard...
      </div>
    );
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  if (!data) return null;

  const { summary, todays_meetings, room_usage, date } = data;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-date">{formatDate(date)}</p>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Total Karyawan</span>
            <span className="stat-card-value">{summary.total_employees}</span>
          </div>
          <div className="stat-card-icon">
            <img src={iconTotalKaryawan} alt="Total Karyawan" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Rapat Hari Ini</span>
            <span className="stat-card-value">{summary.meetings_today}</span>
          </div>
          <div className="stat-card-icon">
            <img src={iconRapatHariIni} alt="Rapat Hari Ini" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Rapat Menunggu</span>
            <span className="stat-card-value">{summary.meetings_pending}</span>
          </div>
          <div className="stat-card-icon">
            <img src={iconRapatMenunggu} alt="Rapat Menunggu" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Rapat Selesai</span>
            <span className="stat-card-value">{summary.meetings_completed}</span>
          </div>
          <div className="stat-card-icon">
            <img src={iconRapatSelesai} alt="Rapat Selesai" />
          </div>
        </div>
      </div>

      {/* Today's Meetings */}
      <div className="section-header">
        <h2>Jadwal Rapat Hari Ini</h2>
        <span className="section-date">{formatDate(date)}</span>
      </div>

      <div className="meetings-list">
        {todays_meetings.length === 0 ? (
          <div className="dashboard-empty">Tidak ada rapat untuk tanggal ini.</div>
        ) : (
          todays_meetings.map((m) => (
            <div className="meeting-card" key={m.id}>
              <div className="meeting-card-top">
                <h3 className="meeting-card-title">{m.title}</h3>
                <span className={`meeting-status ${getStatusClass(m.status)}`}>
                  {getStatusLabel(m.status)}
                </span>
              </div>

              <div className="meeting-card-details">
                <span className="meeting-card-detail-item">
                  <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                  {formatTime(m.start_time)} - {formatTime(m.end_time)}
                </span>
                {m.room && (
                  <span className="meeting-card-detail-item">
                    <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                    {m.room.name}
                  </span>
                )}
              </div>

              <div className="meeting-card-bottom">
                <span className="meeting-card-creator">
                  <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  {m.creator?.username || '-'}
                </span>
                <div className="meeting-card-attendance">
                  <span className="attendance-total">
                    <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                    {m.participants_count} peserta
                  </span>
                  {m.attendance_present > 0 && (
                    <span className="attendance-present">✓ {m.attendance_present} hadir</span>
                  )}
                  {m.attendance_absent > 0 && (
                    <span className="attendance-absent">✗ {m.attendance_absent} tidak hadir</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Room Usage Timeline */}
      <div className="room-usage-section">
        <div className="room-usage-header">
          <h2>Jadwal Penggunaan Ruang Rapat</h2>
          <div className="room-usage-nav">
            <button onClick={() => changeDate(-1)} title="Hari sebelumnya">
              <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
            </button>
            <span className="room-usage-date">{formatDate(selectedDate)}</span>
            <button onClick={() => changeDate(1)} title="Hari berikutnya">
              <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
            </button>
            <button onClick={goToToday}>
              <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
              Hari Ini
            </button>
          </div>
        </div>

        {room_usage.length === 0 ? (
          <div className="dashboard-empty">Tidak ada ruangan aktif.</div>
        ) : (
          <div className="timeline-wrapper">
            <div className="timeline-grid">
              {/* Header row */}
              <div className="timeline-header-row">
                <div className="timeline-cell header room-name">Ruang Rapat</div>
                {TIMELINE_HOURS.map((h) => (
                  <div className="timeline-cell header" key={h}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Room rows */}
              {room_usage.map((room, roomIdx) => (
                <div className="timeline-room-row" key={room.id}>
                  <div className="timeline-cell room-name">{room.name}</div>
                  {TIMELINE_HOURS.map((h, colIdx) => (
                    <div className="timeline-cell" key={h}>
                      {colIdx === 0 &&
                        room.meetings.map((m) => {
                          const left = getTimelinePosition(m.start_time);
                          const width = getTimelineWidth(m.start_time, m.end_time);

                          if (width <= 0) return null;

                          // Offset by the room-name column width (~140px out of total)
                          return (
                            <div
                              key={m.id}
                              className={`timeline-meeting-block color-${roomIdx % 6}`}
                              style={{
                                left: `calc(${left} * 100%)`,
                                width: `calc(${width} * 100%)`,
                              }}
                              title={`${m.title}\n${formatTime(m.start_time)} - ${formatTime(m.end_time)}`}
                            >
                              <span className="meeting-block-title">{m.title}</span>
                              <span className="meeting-block-time">
                                {formatTime(m.start_time)} - {formatTime(m.end_time)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
