import { useState, useEffect, useCallback, useRef } from 'react';
import ActionIcon from '../../components/ui/ActionIcon';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { laporanService } from '../../services/laporanService';
import { employeeService } from '../../services/employeeService';
import type { Employee } from '../../types/employee';
import { useAuthStore } from '../../store/authStore';
import { useLogo } from '../../contexts/LogoContext';
import './LaporanDetail.css';

/* Types */
interface Room { id: number; name: string; location?: string; }
interface Minutes { id: number; content: string | null; notulis_name: string | null; notulis_position: string | null; director_name: string | null; director_position: string | null; director_signature_url?: string | null; notulis_signature_url?: string | null; }
interface Doc { id: number; type: string; file_name: string; file_size: number; mime_type: string; url: string | null; created_at: string; }
interface MeetingInfo { id: number; title: string; organizer: string; start_time: string; end_time: string; status: string; }
interface DetailData {
  meeting: MeetingInfo; room: Room | null;
  attendance_summary: { total: number; hadir: number; tidak_hadir: number; };
  notulensi: Minutes | null; documents: Doc[];
}
interface ExportPeserta { nama: string; nip: string; unit_kerja: string; status: string; check_in: string | null; }

/* Helpers */
function fmtDate(d: string) { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }); }
function statusLabel(s: string) { return { menunggu: 'Menunggu', berlangsung: 'Berlangsung', selesai: 'Selesai', dibatalkan: 'Dibatalkan' }[s] || s; }
function fmtDateTime(d: string) { const dt = new Date(d); return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
function fixUrl(url: string | null | undefined) {
  if (!url) return url;
  if (url.startsWith('data:')) return url; // Biarkan base64 dari file upload lokal
  return url.replaceAll('http://localhost:8000', '');
}

/* Custom Searchable Select */
function SearchableSelect({ label, placeholder, value, options, onChange, disabled }: { label: string; placeholder: string; value: string; options: { name: string; position: string }[]; onChange: (name: string, position: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`lap-searchable-select ${disabled ? 'disabled' : ''}`} ref={wrapperRef}>
      <label>{label} <span className="required">*</span></label>
      <div className={`lap-select-trigger ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`} onClick={() => { if (!disabled) { setOpen(!open); setSearch(''); } }}>
        <span className={value ? 'has-value' : 'placeholder'}>{value || placeholder}</span>
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M12 16L6 10H18L12 16Z" fill="#94a3b8" />
          <path d="M12 8L18 14H6L12 8Z" fill="#94a3b8" style={{ transform: 'translateY(-6px)' }} />
        </svg>
      </div>
      {open && (
        <div className="lap-select-dropdown">
          <input type="text" placeholder="Cari karyawan..." value={search} onChange={e => setSearch(e.target.value)} autoFocus className="lap-select-search-input" />
          <div className="lap-select-options">
            {filtered.length === 0 ? <div className="lap-select-empty">Tidak ada karyawan ditemukan</div> :
              filtered.map((o, idx) => (
                <div key={idx} className="lap-select-option" onClick={() => { onChange(o.name, o.position); setOpen(false); }}>
                  {o.name}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default function LaporanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role_id === 1;
  const editorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DetailData | null>(null);
  const [participants, setParticipants] = useState<ExportPeserta[]>([]);
  const [content, setContent] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [directorPosition, setDirectorPosition] = useState('');
  const [notulisName, setNotulisName] = useState('');
  const [notulisPosition, setNotulisPosition] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSections, setExportSections] = useState({ info: true, undangan: true, kehadiran: true, notulensi: true, dokumentasi: true });
  const [useStamp, setUseStamp] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const { logoKiriPdf, logoKananPdf, stampImage } = useLogo();

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailRes, exportRes] = await Promise.all([laporanService.getDetail(Number(id)), laporanService.getExport(Number(id))]);
      const d: DetailData = detailRes.data.data;
      setData(d);
      setContent(d.notulensi?.content ? fixUrl(d.notulensi.content) || '' : '');
      setDirectorName(d.notulensi?.director_name || '');
      setDirectorPosition(d.notulensi?.director_position || '');
      setNotulisName(d.notulensi?.notulis_name || '');
      setNotulisPosition(d.notulensi?.notulis_position || '');
      setParticipants(exportRes.data.data.peserta || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    employeeService.list({ per_page: 1000 }).then(res => setEmployees(res.data.data || [])).catch(() => { });
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await laporanService.upsertMinutes(Number(id), { content, director_name: directorName, director_position: directorPosition, notulis_name: notulisName, notulis_position: notulisPosition });
      showToast('Perubahan berhasil disimpan!');
      fetchData();
    } catch { showToast('Gagal menyimpan perubahan'); } finally { setSaving(false); }
  };

  const handleUploadDoc = async (file: File, type: string) => {
    if (!id) return;
    try { await laporanService.uploadDocument(Number(id), file, type); showToast('Dokumen berhasil diunggah!'); fetchData(); }
    catch { showToast('Gagal mengunggah dokumen'); }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!id || !confirm('Hapus dokumen ini?')) return;
    try { await laporanService.deleteDocument(Number(id), docId); showToast('Dokumen berhasil dihapus'); fetchData(); }
    catch { showToast('Gagal menghapus dokumen'); }
  };

  const insertTableTemplate = (templateType: number) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    let tableHtml = '';
    if (templateType === 1) {
      tableHtml = `
        <table style="border-collapse: collapse; width: 100%; border: 1px solid #000; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 8px; width: 50px; text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">NO</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">PEMBAHASAN</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">PENYELESAIAN</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">1</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">2</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      tableHtml = `
        <table style="border-collapse: collapse; width: 100%; border: 1px solid #000; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 8px; width: 50px; text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">NO</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">PEMBAHASAN</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">PIC</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">PENYELESAIAN</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">1</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">2</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">&nbsp;</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    editorRef.current.insertContent(tableHtml);
  };

  if (loading) return <div className="lap-detail-loading"><div className="lap-detail-spinner" />Memuat detail laporan...</div>;
  if (!data) return <div className="lap-detail-loading">Data tidak ditemukan.</div>;

  const { meeting, room, attendance_summary, documents } = data;
  const undanganDocs = documents.filter(d => d.type === 'undangan');
  const dokumentasiDocs = documents.filter(d => d.type !== 'undangan');

  return (
    <div className="lap-detail">
      {toast && <div className="lap-toast"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>{toast}</div>}

      <button className="lap-back" onClick={() => navigate('/laporan')}>
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>Kembali ke Daftar Laporan
      </button>

      {/* Header */}
      <div className="lap-header-card">
        <div className="lap-header-left">
          <div className="lap-header-icon"><svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" /></svg></div>
          <div className="lap-header-text"><h1>{meeting.title}</h1><span className={`lap-header-status ${meeting.status}`}>{statusLabel(meeting.status)}</span></div>
        </div>
        <button className="lap-export-btn" onClick={() => setShowExport(true)}>
          <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>Ekspor PDF
        </button>
      </div>

      {/* Info badges */}
      <div className="lap-info-badges">
        <div className="lap-info-badge">
          <div className="lap-info-badge-icon blue"><svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" /></svg></div>
          <div><div className="lap-info-badge-label">Tanggal</div><div className="lap-info-badge-value">{fmtDate(meeting.start_time)}</div></div>
        </div>
        <div className="lap-info-badge">
          <div className="lap-info-badge-icon orange"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></svg></div>
          <div><div className="lap-info-badge-label">Waktu</div><div className="lap-info-badge-value">{fmtTime(meeting.start_time)} - {fmtTime(meeting.end_time)}</div></div>
        </div>
        <div className="lap-info-badge">
          <div className="lap-info-badge-icon green"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg></div>
          <div><div className="lap-info-badge-label">Ruangan</div><div className="lap-info-badge-value">{room?.name || '-'}</div></div>
        </div>
      </div>

      {/* Informasi Rapat */}
      <div className="lap-section">
        <div className="lap-section-header"><h2>Informasi Rapat</h2></div>
        <table className="lap-info-table"><tbody>
          <tr><td>Penyelenggara</td><td>{meeting.organizer || '-'}</td></tr>
          <tr><td>Jumlah Peserta</td><td>{attendance_summary.total} orang</td></tr>
          <tr><td>Jumlah Hadir</td><td className="text-green">{attendance_summary.hadir} orang</td></tr>
          <tr><td>Jumlah Tidak Hadir</td><td className="text-red">{attendance_summary.tidak_hadir} orang</td></tr>
        </tbody></table>
      </div>

      {/* Undangan Rapat */}
      <div className="lap-section">
        <div className="lap-section-header">
          <h2>Undangan Rapat</h2>
          <label className="lap-upload-btn">
            <svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>Unggah Undangan (PDF)
            <input type="file" accept=".pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadDoc(f, 'undangan'); e.target.value = ''; }} />
          </label>
        </div>
        {undanganDocs.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '.875rem' }}>Belum ada undangan yang diunggah.</div> :
          undanganDocs.map(doc => (
            <div className="lap-doc-item" key={doc.id}>
              <div className="lap-doc-info">
                <div className="lap-doc-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" /></svg></div>
                <div><div className="lap-doc-name">{doc.file_name}</div><div className="lap-doc-meta">Diunggah pada {fmtDateTime(doc.created_at)}</div></div>
              </div>
              <div className="lap-doc-actions">
                {doc.url && <a href={fixUrl(doc.url) || undefined} target="_blank" rel="noopener noreferrer" className="lap-doc-action-btn download"><ActionIcon name="unduh" size={16} /></a>}
                <button className="lap-doc-action-btn delete" onClick={() => handleDeleteDoc(doc.id)}><ActionIcon name="hapus" size={16} /></button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Daftar Kehadiran */}
      <div className="lap-section">
        <div className="lap-section-header"><h2>Daftar Kehadiran</h2></div>
        {participants.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '.875rem' }}>Belum ada data peserta.</div> :
          <div style={{ overflowX: 'auto' }}>
            <table className="lap-attendance-table">
              <thead><tr><th>No</th><th>Nama Peserta</th><th>Waktu Absen</th><th>Tanda Tangan</th></tr></thead>
              <tbody>{participants.map((p, i) => {
                const emp = employees.find(e =>
                  (p.nip && p.nip !== '-' && e.nip === p.nip) ||
                  e.full_name?.toLowerCase().trim() === p.nama?.toLowerCase().trim()
                );
                const signatureUrl = (p as any).signature_url || emp?.signature_url;
                return (
                  <tr key={i}><td>{i + 1}</td><td>{p.nama}</td><td>{p.check_in ? fmtTime(p.check_in) : '-'}</td>
                    <td>{p.status === 'Hadir' ? (signatureUrl ? <img src={fixUrl(signatureUrl) || undefined} alt="Tanda Tangan" style={{ height: '40px', objectFit: 'contain' }} /> : <span className="lap-sig-box">{p.nama.split(' ').pop()}</span>) : '-'}</td></tr>
                )
              })}</tbody>
            </table>
          </div>
        }
      </div>

      {/* Notulensi Rapat - TinyMCE Editor */}
      <div className="lap-section">
        <div className="lap-section-header"><h2>Notulensi Rapat</h2></div>
        {!isSuperAdmin && (
          <div className="lap-editor-tools">
            <div className="lap-tools-group">
              <span className="lap-tools-label">Template Tabel:</span>
              <button type="button" className="lap-tool-btn template-btn" onMouseDown={e => { e.preventDefault(); insertTableTemplate(1); }}>
                Template 1 (3 Kolom)
              </button>
              <button type="button" className="lap-tool-btn template-btn" onMouseDown={e => { e.preventDefault(); insertTableTemplate(2); }}>
                Template 2 (4 Kolom)
              </button>
            </div>
          </div>
        )}
        <div className="lap-quill-wrap">
          <Editor
            tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
            value={content}
            onEditorChange={(newVal) => setContent(newVal)}
            onInit={(_, editor) => {
              editorRef.current = editor;
            }}
            disabled={isSuperAdmin}
            init={{
              height: 500,
              menubar: 'edit insert format table',
              plugins: ['table', 'lists', 'link', 'image', 'code', 'wordcount'],
              toolbar: 'undo redo | fontfamily fontsize jarakenter | bold italic underline | alignleft aligncenter alignright alignjustify | bullist | table | removeformat',
              font_family_formats: 'Arial=arial,helvetica,sans-serif; Times New Roman=times new roman,times,serif; Georgia=georgia,palatino,serif; Inter=inter,sans-serif; Courier New=courier new,courier,monospace',
              font_size_formats: '8pt 10pt 11pt 12pt 14pt 16pt 18pt 24pt 36pt',
              branding: false,
              promotion: false,
              statusbar: true,
              formats: {
                custom_margin: { selector: 'p,h1,h2,h3,h4,h5,h6,div,li,td,th', styles: { marginBottom: '%value' } }
              },
              setup: (editor: any) => {
                const spacingOptions = ['0', '0.5', '1', '1.5', '2', '2.5', '3'];

                editor.ui.registry.addMenuButton('jarakenter', {
                  text: 'Jarak Enter',
                  tooltip: 'Atur Jarak Paragraf (Enter)',
                  fetch: (callback: any) => {
                    const items = spacingOptions.map((val) => {
                      const isMatched = editor.formatter.match('custom_margin', { value: val + 'em' }) ||
                                        (val === '0' && (editor.formatter.match('custom_margin', { value: '0px' }) || editor.formatter.match('custom_margin', { value: '0' })));
                      return {
                        type: 'togglemenuitem',
                        text: val,
                        active: isMatched,
                        onAction: () => {
                          editor.formatter.apply('custom_margin', { value: val + 'em' });
                        }
                      };
                    });
                    
                    if (!items.some(item => item.active)) {
                      const defaultItem = items.find(item => item.text === '1');
                      if (defaultItem) defaultItem.active = true;
                    }

                    callback(items);
                  }
                });
              },
              images_upload_handler: async (blobInfo: any) => {
                const file = new File([blobInfo.blob()], blobInfo.filename(), { type: blobInfo.blob().type });
                try {
                  const res = await laporanService.uploadMinutesImage(file);
                  return fixUrl(res.data.url) || '';
                } catch (e) {
                  throw new Error('Gagal mengunggah gambar');
                }
              },
              content_style: `
                body {
                  font-family: "Times New Roman", Times, serif;
                  font-size: 12pt;
                  color: #000;
                  line-height: 1.6;
                  background-color: #fff;
                }
                p { margin-top: 0; margin-bottom: 1em; }
                ul {
                  list-style-type: none;
                  padding-left: 15px;
                  margin-top: 4px;
                  margin-bottom: 4px;
                }
                ul li {
                  position: relative;
                }
                ul li::before {
                  content: "- ";
                  position: absolute;
                  left: -12px;
                  top: 0;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                  border: 1px solid #000;
                }
                table td, table th {
                  border: 1px solid #000;
                  padding: 8px;
                  min-width: 50px;
                  vertical-align: top;
                }
              `
            }}
          />
        </div>
      </div>

      {/* Dokumentasi */}
      <div className="lap-section">
        <div className="lap-section-header">
          <h2>Dokumentasi</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <span className="lap-section-meta">Maksimal 3 Gambar</span>
            <label className="lap-upload-btn">
              <svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>Unggah Foto
              <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { if (dokumentasiDocs.length >= 3) { alert('Maksimal 3 gambar'); return; } handleUploadDoc(f, 'dokumentasi'); } e.target.value = ''; }} />
            </label>
          </div>
        </div>
        {dokumentasiDocs.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '.875rem' }}>Belum ada dokumentasi.</div> :
          dokumentasiDocs.map(doc => (
            <div className="lap-doc-item" key={doc.id}>
              <div className="lap-doc-info" style={{ cursor: doc.url ? 'pointer' : 'default' }} onClick={() => doc.url && window.open(fixUrl(doc.url) || '', '_blank')}>
                <div className="lap-doc-icon" style={{ padding: 0, overflow: 'hidden' }}>
                  {doc.url ? <img src={fixUrl(doc.url) || undefined} alt={doc.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>}
                </div>
                <div><div className="lap-doc-name" style={{ color: doc.url ? '#1d4ed8' : 'inherit' }}>{doc.file_name}</div><div className="lap-doc-meta">Diunggah pada {fmtDateTime(doc.created_at)}</div></div>
              </div>
              <div className="lap-doc-actions"><button className="lap-doc-action-btn delete" onClick={() => handleDeleteDoc(doc.id)}><ActionIcon name="hapus" size={16} /></button></div>
            </div>
          ))
        }
      </div>

      {/* Tanda Tangan */}
      <div className="lap-section">
        <div className="lap-section-header"><h2>Tanda Tangan</h2></div>
        <div className="lap-ttd-row">
          <div className="lap-ttd-group">
            <SearchableSelect
              label="Penanggung Jawab"
              placeholder="Pilih Penanggung Jawab"
              value={directorName}
              options={employees.map(e => ({ name: e.full_name, position: e.position?.position || e.employee_type?.employee_type || '' }))}
              onChange={(name, position) => { setDirectorName(name); setDirectorPosition(position); }}
              disabled={isSuperAdmin}
            />
          </div>
          <div className="lap-ttd-group">
            <SearchableSelect
              label="Notulensi"
              placeholder="Pilih Notulensi"
              value={notulisName}
              options={employees.map(e => ({ name: e.full_name, position: e.position?.position || e.employee_type?.employee_type || '' }))}
              onChange={(name, position) => { setNotulisName(name); setNotulisPosition(position); }}
              disabled={isSuperAdmin}
            />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="lap-bottom-bar">
        <button className="lap-btn-cancel" onClick={() => navigate('/laporan')}>Batal</button>
        <button className="lap-btn-save" onClick={handleSave} disabled={saving || isSuperAdmin}>
          <svg viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" /></svg>
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="lap-modal-overlay" onClick={() => setShowExport(false)}>
          <div className="lap-modal" onClick={e => e.stopPropagation()}>
            <button className="lap-modal-close" onClick={() => setShowExport(false)}><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg></button>
            <h3>Ekspor Laporan ke PDF</h3>
            <p>Pilih dokumen yang ingin disertakan dalam file PDF</p>
            <div>
              {([['info', 'Informasi Rapat'], ['undangan', 'Undangan'], ['kehadiran', 'Daftar Kehadiran'], ['notulensi', 'Notulensi Rapat'], ['dokumentasi', 'Dokumentasi']] as [keyof typeof exportSections, string][]).map(([key, label]) => (
                <label className="lap-modal-option" key={key}>
                  <input type="checkbox" checked={exportSections[key]} onChange={() => setExportSections(prev => ({ ...prev, [key]: !prev[key] }))} />{label}
                </label>
              ))}
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <label className="lap-modal-option">
                <input type="checkbox" checked={useStamp} onChange={() => setUseStamp(!useStamp)} />
                Tambahkan Stempel pada TTD Penanggung Jawab
              </label>
            </div>

            <div className="lap-modal-footer">
              <button className="lap-btn-cancel" onClick={() => setShowExport(false)}>Batal</button>
              <button className="lap-export-btn" disabled={exporting} onClick={async () => {
                if (!data) return;
                setExporting(true);
                try {
                  const { generateLaporanPdf } = await import('./generatePdf');
                  await generateLaporanPdf({
                    logoLeftUrl: logoKiriPdf,
                    logoRightUrl: logoKananPdf,
                    meeting: data.meeting,
                    room: data.room,
                    attendance_summary: data.attendance_summary,
                    participants,
                    employees,
                    notulensiContent: content,
                    notulensi: data.notulensi as any,
                    directorName,
                    directorPosition,
                    notulisName,
                    notulisPosition,
                    documents: data.documents,
                    exportSections,
                    useStamp,
                    stampImage,
                  });
                  showToast('PDF berhasil diunduh!');
                } catch (e) {
                  console.error('PDF export error:', e);
                  showToast('Gagal mengekspor PDF');
                } finally {
                  setExporting(false);
                  setShowExport(false);
                }
              }}>
                <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
                {exporting ? 'Mengekspor...' : 'Ekspor PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
