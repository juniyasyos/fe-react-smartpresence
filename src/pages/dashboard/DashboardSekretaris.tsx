import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { laporanService } from '../../services/laporanService';
import './DashboardSekretaris.css';

import iconRapatHariIniSekertaris from '../../assets/icons/dashboard/rapat hari ini sekertaris.webp';
import iconLengkap from '../../assets/icons/dashboard/lengkap.webp';
import iconTidakLengkap from '../../assets/icons/dashboard/tidak lengkap.webp';

interface MeetingRoom { id: number; name: string; location?: string; }
interface TodayMeeting {
  id: number; title: string; start_time: string; end_time: string;
  status: string; room: MeetingRoom | null; participants_count: number;
}
interface LaporanMeeting {
  id: number; lampiran: { has_undangan: boolean; has_notulensi: boolean; has_dokumentasi: boolean; };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function statusLabel(s: string) {
  return { menunggu: 'Menunggu', berlangsung: 'Berlangsung', selesai: 'Selesai', dibatalkan: 'Dibatalkan' }[s] || s;
}

export default function DashboardSekretaris() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todaysMeetings, setTodaysMeetings] = useState<TodayMeeting[]>([]);
  const [laporanMap, setLaporanMap] = useState<Record<number, LaporanMeeting>>({});
  const [dateStr, setDateStr] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, lapRes] = await Promise.all([
        api.get('/dashboard'),
        laporanService.getList({ per_page: 100 }),
      ]);
      setTodaysMeetings(dashRes.data.data.todays_meetings);
      setDateStr(dashRes.data.data.date);
      const map: Record<number, LaporanMeeting> = {};
      (lapRes.data?.data?.data || []).forEach((item: LaporanMeeting) => { map[item.id] = item; });
      setLaporanMap(map);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rapatHariIni = todaysMeetings.length;
  const dokLengkap = todaysMeetings.filter(m => {
    const l = laporanMap[m.id]?.lampiran;
    return l && l.has_undangan && l.has_notulensi && l.has_dokumentasi;
  }).length;

  if (loading) return <div className="dash-sek-loading"><div className="dash-sek-loading-spinner" />Memuat dashboard...</div>;

  return (
    <div className="dash-sek">
      <div className="dash-sek-header">
        <h1>Dashboard</h1>
        {dateStr && <p>{formatDate(dateStr)}</p>}
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-card-info"><span className="stat-card-label">Rapat Hari Ini</span><span className="stat-card-value">{rapatHariIni}</span></div>
          <div className="stat-card-icon"><img src={iconRapatHariIniSekertaris} alt="Rapat Hari Ini" /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-info"><span className="stat-card-label">Dok. Lengkap</span><span className="stat-card-value">{dokLengkap}</span></div>
          <div className="stat-card-icon"><img src={iconLengkap} alt="Dok. Lengkap" /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-info"><span className="stat-card-label">Belum Lengkap</span><span className="stat-card-value">{rapatHariIni - dokLengkap}</span></div>
          <div className="stat-card-icon"><img src={iconTidakLengkap} alt="Belum Lengkap" /></div>
        </div>
      </div>

      <div className="dash-sek-section-header">
        <h2>Daftar Rapat Hari Ini</h2>
        {dateStr && <span className="dash-sek-section-date">{formatDate(dateStr)}</span>}
      </div>

      <div className="dash-sek-meetings">
        {todaysMeetings.length === 0 ? (
          <div className="dash-sek-empty">Tidak ada rapat untuk hari ini.</div>
        ) : todaysMeetings.map(m => {
          const lap = laporanMap[m.id]?.lampiran;
          return (
            <div className="dash-sek-meeting-card" key={m.id}>
              <div className="dash-sek-card-top">
                <h3 className="dash-sek-card-title">{m.title}</h3>
                <span className={`dash-sek-status ${m.status}`}>{statusLabel(m.status)}</span>
              </div>
              <div className="dash-sek-card-meta">
                <span className="dash-sek-card-meta-item"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>{formatTime(m.start_time)} - {formatTime(m.end_time)}</span>
                {m.room && <span className="dash-sek-card-meta-item"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>{m.room.name}</span>}
                <span className="dash-sek-card-meta-item"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>{m.participants_count} peserta</span>
              </div>
              <div className="dash-sek-card-bottom">
                <div className="dash-sek-lampiran">
                  <span className="dash-sek-lampiran-item"><span className={lap?.has_undangan ? 'dot-green' : 'dot-red'} />Undangan</span>
                  <span className="dash-sek-lampiran-item"><span className={lap?.has_notulensi ? 'dot-green' : 'dot-red'} />Notulensi</span>
                  <span className="dash-sek-lampiran-item"><span className={lap?.has_dokumentasi ? 'dot-green' : 'dot-red'} />Dokumentasi</span>
                </div>
                <button className="dash-sek-unggah-btn" onClick={() => navigate(`/laporan/${m.id}`)}>
                  <svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>Unggah
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
