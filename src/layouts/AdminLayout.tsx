import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../services/adminService';

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/peserta', label: 'Peserta' },
  { to: '/admin/absensi', label: 'Absensi' },
  { to: '/admin/seminar', label: 'Absensi Seminar' },
  { to: '/admin/viralisasi', label: 'Video Viralisasi' },
  { to: '/admin/laporan', label: 'Laporan' },
  { to: '/admin/bpu', label: 'Akuisisi Data BPU' },
  { to: '/admin/pu', label: 'Akuisisi Data PU' },
  { to: '/admin/materi', label: 'Materi PDF' },
  { to: '/admin/export', label: 'Export Data' },
];

export function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <strong>Admin Portal</strong>
          <span>Magang BPJS Ketenagakerjaan</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {user?.email && <div style={{ fontSize: '0.78rem', opacity: 0.8, marginBottom: 8 }}>{user.email}</div>}
          <button className="btn btn-outline" style={{ width: '100%', padding: '8px' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div style={{ fontWeight: 600 }}>Portal Admin — Aplikasi Magang BPJS Ketenagakerjaan</div>
          <NavLink to="/" style={{ fontSize: '0.85rem' }}>
            ← Lihat Portal Peserta
          </NavLink>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
