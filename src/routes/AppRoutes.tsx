import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getUserRoleId } from '../types/user';

// Eager load Login and Layout as they are critical path
import Login from '../pages/auth/Login';
import DashboardLayout from '../components/layout/DashboardLayout';

// Lazy load pages
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const UserManagement = lazy(() => import('../pages/users/UserManagement'));
const RoomManagement = lazy(() => import('../pages/rooms/RoomManagement'));
const EmployeeManagement = lazy(() => import('../pages/employees/EmployeeManagement'));
const MeetingManagement = lazy(() => import('../pages/meetings/MeetingManagement'));
const MeetingForm = lazy(() => import('../pages/meetings/MeetingForm'));
const MeetingDetail = lazy(() => import('../pages/meetings/MeetingDetail'));
const WorkUnitManagement = lazy(() => import('../pages/work-units/WorkUnitManagement'));
const EmployeeTypeManagement = lazy(() => import('../pages/employee-types/EmployeeTypeManagement'));
const LaporanRapat = lazy(() => import('../pages/laporan/LaporanRapat'));
const LaporanDetail = lazy(() => import('../pages/laporan/LaporanDetail'));
const BackupManagement = lazy(() => import('../pages/backups/BackupManagement'));
const UbahLogo = lazy(() => import('../pages/settings/UbahLogo'));
const Profile = lazy(() => import('../pages/profile/Profile'));

/* ─── Role constants ─── */
const ROLE_SUPER_ADMIN = 1;
const ROLE_SEKRETARIS = 3;

// Loading Fallback Component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function ProtectedRoute() {
  const { isAuthenticated, isCheckingSession } = useAuthStore();
  
  if (isCheckingSession) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-body)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function RoleProtectedRoute({ allowedRoles }: { allowedRoles: number[] }) {
  const { user, isCheckingSession } = useAuthStore();

  if (isCheckingSession) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-body)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const userRoleId = getUserRoleId(user);
  if (!user || userRoleId === undefined || !allowedRoles.includes(userRoleId)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/meetings" element={<MeetingManagement />} />
            <Route path="/meetings/create" element={<MeetingForm />} />
            <Route path="/meetings/:id" element={<MeetingDetail />} />
            <Route path="/meetings/:id/edit" element={<MeetingForm />} />
            <Route path="/profile" element={<Profile />} />

            {/* Laporan – SuperAdmin + Sekretaris */}
            <Route element={<RoleProtectedRoute allowedRoles={[ROLE_SUPER_ADMIN, ROLE_SEKRETARIS]} />}>
              <Route path="/laporan" element={<LaporanRapat />} />
              <Route path="/laporan/:id" element={<LaporanDetail />} />
            </Route>

            {/* SuperAdmin only */}
            <Route element={<RoleProtectedRoute allowedRoles={[ROLE_SUPER_ADMIN]} />}>
              <Route path="/employees" element={<EmployeeManagement />} />
              <Route path="/rooms" element={<RoomManagement />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/work-units" element={<WorkUnitManagement />} />
              <Route path="/employee-types" element={<EmployeeTypeManagement />} />
              <Route path="/backups" element={<BackupManagement />} />
              <Route path="/ubah-logo" element={<UbahLogo />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

