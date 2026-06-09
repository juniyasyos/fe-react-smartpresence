import React, { useState, useRef } from 'react';
import { useLogo } from '../../contexts/LogoContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import './UbahLogo.css';

// Import local fallback assets
import defaultSidebarLogo from '../../assets/images/logo kiri.webp';
import defaultPdfLogoKiri from '../../assets/icons/laporan/hasil/logo kiri.webp';
import defaultPdfLogoKanan from '../../assets/icons/laporan/hasil/logo kanan.webp';
import defaultStampImage from '../../assets/icons/laporan/hasil/logo kiri.webp'; // Gunakan fallback logo kiri atau buat gambar stempel kosong

interface LogoSection {
  type: 'logo_kiri_sidebar' | 'logo_kiri_pdf' | 'logo_kanan_pdf' | 'stamp_image';
  title: string;
  description: string;
  currentUrl: string | null;
  fallbackUrl: string;
}

export default function UbahLogo() {
  const { logoKiriSidebar, logoKiriPdf, logoKananPdf, stampImage, refreshLogos } = useLogo();
  const { showToast } = useToast();
  
  const [uploading, setUploading] = useState<Record<string, boolean>>({
    logo_kiri_sidebar: false,
    logo_kiri_pdf: false,
    logo_kanan_pdf: false,
    stamp_image: false,
  });

  const fileInputRefs = {
    logo_kiri_sidebar: useRef<HTMLInputElement>(null),
    logo_kiri_pdf: useRef<HTMLInputElement>(null),
    logo_kanan_pdf: useRef<HTMLInputElement>(null),
    stamp_image: useRef<HTMLInputElement>(null),
  };

  const sections: LogoSection[] = [
    {
      type: 'logo_kiri_sidebar',
      title: 'Logo Kiri Utama (Sidebar & Login)',
      description: 'Digunakan di bagian atas sidebar menu dan halaman login aplikasi.',
      currentUrl: logoKiriSidebar,
      fallbackUrl: defaultSidebarLogo,
    },
    {
      type: 'logo_kiri_pdf',
      title: 'Logo Kiri PDF Kop Surat',
      description: 'Logo sebelah kiri pada kop surat laporan hasil rapat ekspor PDF.',
      currentUrl: logoKiriPdf,
      fallbackUrl: defaultPdfLogoKiri,
    },
    {
      type: 'logo_kanan_pdf',
      title: 'Logo Kanan PDF Kop Surat',
      description: 'Logo sebelah kanan pada kop surat laporan hasil rapat ekspor PDF.',
      currentUrl: logoKananPdf,
      fallbackUrl: defaultPdfLogoKanan,
    },
    {
      type: 'stamp_image',
      title: 'Stempel Penanggung Jawab',
      description: 'Gambar stempel yang akan disisipkan di tanda tangan penanggung jawab saat mengekspor PDF (jika dicentang).',
      currentUrl: stampImage,
      fallbackUrl: defaultStampImage,
    },
  ];

  const handleUpload = async (type: LogoSection['type'], file: File) => {
    // Validasi file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Format gambar tidak didukung. Gunakan PNG, JPG, JPEG, atau WEBP.', 'error');
      return;
    }

    // Validasi file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file terlalu besar. Maksimal adalah 5MB.', 'error');
      return;
    }

    setUploading(prev => ({ ...prev, [type]: true }));
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    try {
      const response = await api.post('/logo/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        showToast('Logo berhasil diperbarui!', 'success');
        await refreshLogos();
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Gagal mengunggah logo ke server.';
      showToast(errMsg, 'error');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleCardClick = (type: LogoSection['type']) => {
    fileInputRefs[type].current?.click();
  };

  const handleFileChange = (type: LogoSection['type'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(type, file);
      // Reset input value agar user bisa mengunggah file yang sama lagi
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (type: LogoSection['type'], e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(type, file);
    }
  };

  return (
    <div className="ubah-logo-page">
      <div className="ubah-logo-header">
        <h1 className="ubah-logo-title">Ubah Logo Aplikasi</h1>
        <p className="ubah-logo-subtitle">
          Kustomisasi tampilan logo utama aplikasi dan logo pada kop surat ekspor PDF laporan.
        </p>
      </div>

      <div className="ubah-logo-grid">
        {sections.map(section => (
          <div 
            key={section.type} 
            className={`logo-upload-card ${uploading[section.type] ? 'uploading' : ''}`}
            onClick={() => handleCardClick(section.type)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(section.type, e)}
          >
            <input 
              type="file" 
              ref={fileInputRefs[section.type]}
              onChange={(e) => handleFileChange(section.type, e)}
              accept=".png, .jpg, .jpeg, .webp"
              style={{ display: 'none' }}
            />

            <div className="logo-preview-container">
              <img 
                src={section.currentUrl || section.fallbackUrl} 
                alt={section.title} 
                className="logo-preview-image"
              />
              {uploading[section.type] && (
                <div className="logo-upload-overlay">
                  <div className="logo-spinner"></div>
                  <span>Mengunggah...</span>
                </div>
              )}
            </div>

            <div className="logo-card-info">
              <h3 className="logo-card-title">{section.title}</h3>
              <p className="logo-card-desc">{section.description}</p>
              <div className="logo-card-action">
                <svg viewBox="0 0 24 24" fill="currentColor" className="logo-action-icon">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
                <span>Pilih file atau seret ke sini</span>
              </div>
              <span className="logo-formats-hint">Mendukung PNG, JPG, WEBP (Maksimal 5MB)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
