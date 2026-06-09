import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { useTheme } from '../../hooks/useTheme';
import { useLogo } from '../../contexts/LogoContext';
import './Sidebar.css';

/* ─── Logo ─── */
import sidebarLogo from '../../assets/images/logo kiri.webp';

/* ─── Sidebar menu icons ─── */
import iconBeranda from '../../assets/icons/sidebar/Beranda.webp';
import iconJadwalRapat from '../../assets/icons/sidebar/Jadwal Rapat.webp';
import iconKaryawan from '../../assets/icons/sidebar/Karyawan.webp';
import iconRuangRapat from '../../assets/icons/sidebar/Ruang Rapat.webp';
import iconPengguna from '../../assets/icons/sidebar/Pengguna.webp';
import iconLaporan from '../../assets/icons/sidebar/Laporan.webp';
import iconUnitKerja from '../../assets/icons/sidebar/Unit Kerja.webp';
import iconBackup from '../../assets/icons/sidebar/Backup.svg';
import iconKeluar from '../../assets/icons/sidebar/Keluar.webp';

/* ─── Role constants ─── */
const ROLE_SUPER_ADMIN = 1;
const ROLE_SEKRETARIS = 3;

/*
 * Each menu item can have a `roles` array.
 * – If `roles` is undefined, the item is visible to ALL authenticated users.
 * – If `roles` is set, only users whose role_id is in the array can see it.
 */
interface MenuItem {
  label: string;
  path: string;
  iconSrc?: string;
  iconNode?: React.ReactNode;
  roles?: number[]; // undefined = visible to all
}

const menuItems: MenuItem[] = [
  {
    label: 'Beranda',
    path: '/dashboard',
    iconSrc: iconBeranda,
  },
  {
    label: 'Jadwal Rapat',
    path: '/meetings',
    iconSrc: iconJadwalRapat,
  },
  {
    label: 'Karyawan',
    path: '/employees',
    iconSrc: iconKaryawan,
    roles: [ROLE_SUPER_ADMIN],
  },
  {
    label: 'Ruang Rapat',
    path: '/rooms',
    iconSrc: iconRuangRapat,
    roles: [ROLE_SUPER_ADMIN],
  },
  {
    label: 'Pengguna',
    path: '/users',
    iconSrc: iconPengguna,
    roles: [ROLE_SUPER_ADMIN],
  },
  {
    label: 'Laporan',
    path: '/laporan',
    iconSrc: iconLaporan,
    roles: [ROLE_SUPER_ADMIN, ROLE_SEKRETARIS],
  },
  {
    label: 'Unit Kerja',
    path: '/work-units',
    iconSrc: iconUnitKerja,
    roles: [ROLE_SUPER_ADMIN],
  },
  {
    label: 'Cadangan',
    path: '/backups',
    iconSrc: iconBackup,
    roles: [ROLE_SUPER_ADMIN],
  },
  {
    label: 'Ubah Logo',
    path: '/ubah-logo',
    iconNode: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="sidebar-menu-icon" style={{ width: '22px', height: '22px' }}>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
      </svg>
    ),
    roles: [ROLE_SUPER_ADMIN],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onToggleMobile: () => void;
}

export default function Sidebar({ mobileOpen, onToggleMobile }: SidebarProps) {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { logoKiriSidebar } = useLogo();

  const userRoleId = user?.role_id;

  // Filter menu items based on user's role
  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.roles) return true; // no restriction → visible to all
    return userRoleId !== undefined && item.roles.includes(userRoleId);
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    logout();
    setShowLogoutModal(false);
    navigate('/login', { replace: true });
  };

  const sidebarClass = `sidebar${mobileOpen ? ' mobile-open' : ''}`;

  return (
    <>
      {/* Hamburger button – mobile only */}
      <button className="sidebar-hamburger" onClick={onToggleMobile} aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
      </button>

      {/* Overlay – mobile only */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={onToggleMobile}
      />

      {/* Sidebar */}
      <aside className={sidebarClass}>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <img src={logoKiriSidebar || sidebarLogo} alt="Logo RS Citra Husada" width="57" height="57" />
          </div>
          <div className="sidebar-brand-text">
            <h2>RS CITRA HUSADA</h2>
            <p>Smart Presence</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
              onClick={() => mobileOpen && onToggleMobile()}
            >
              <span className="sidebar-nav-icon">
                {item.iconNode ? (
                  item.iconNode
                ) : (
                  <img src={item.iconSrc} alt={item.label} className="sidebar-menu-icon" />
                )}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer actions: Theme Toggle + Logout */}
        <div className="sidebar-footer">
          <div className="theme-toggle-container">
            <span className="theme-label">Mode Gelap</span>
            <button
              className={`theme-toggle-btn ${isDark ? 'dark' : ''}`}
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
            >
              <div className="theme-toggle-thumb">
                {isDark ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="moon-icon">
                    <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="sun-icon">
                    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                  </svg>
                )}
              </div>
            </button>
          </div>

          <button className="sidebar-logout-btn" onClick={() => setShowLogoutModal(true)}>
            <span className="sidebar-nav-icon">
              <img src={iconKeluar} alt="Keluar" className="sidebar-menu-icon" />
            </span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="sidebar-modal-overlay">
          <div className="logout-modal-box">
            <h3>Konfirmasi Keluar</h3>
            <p>Apakah Anda yakin ingin keluar dari sistem?</p>
            <div className="logout-modal-actions">
              <button className="sidebar-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Batal
              </button>
              <button className="sidebar-btn-danger" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Keluar...' : 'Ya, Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
