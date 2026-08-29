import { Outlet, useNavigate, Link } from 'react-router-dom';

export function ParticipantLayout() {
  const navigate = useNavigate();
  return (
    <>
      <header
        className="app-header"
        onClick={() => navigate('/')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') navigate('/');
        }}
      >
        <div style={{ position: 'relative' }}>
          <div className="header-badge">Portal Resmi Magang</div>
          <h1 className="header-title">Aplikasi Magang BPJS Ketenagakerjaan</h1>
          <p className="header-subtitle">Portal Kehadiran & Pengumpulan Tugas Magang</p>
        </div>
        <Link
          to="/login"
          className="header-admin-link"
          onClick={(e) => e.stopPropagation()}
          title="Masuk sebagai Admin"
        >
          Admin
        </Link>
      </header>
      <Outlet />
    </>
  );
}
