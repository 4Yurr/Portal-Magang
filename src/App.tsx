import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ParticipantLayout } from './layouts/ParticipantLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui/Spinner';
import Home from './pages/participant/Home';
import Absensi from './pages/participant/Absensi';
import Seminar from './pages/participant/Seminar';
import Viralisasi from './pages/participant/Viralisasi';
import Laporan from './pages/participant/Laporan';
import Materi from './pages/participant/Materi';
import PengumumanPeserta from './pages/participant/Pengumuman';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Peserta from './pages/admin/Peserta';
import AdminAbsensi from './pages/admin/AdminAbsensi';
import AdminRekapAbsensi from './pages/admin/AdminRekapAbsensi';
import AdminSeminar from './pages/admin/AdminSeminar';
import AdminViralisasi from './pages/admin/AdminViralisasi';
import AdminLaporan from './pages/admin/AdminLaporan';
import AdminMateri from './pages/admin/AdminMateri';
import ExportData from './pages/admin/ExportData';
import Pengaturan from './pages/admin/Pengaturan';
import AdminPengumuman from './pages/admin/AdminPengumuman';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner size={32} />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RouteTitle() {
  const location = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Dashboard | Portal Magang BPJS Ketenagakerjaan',
      '/absensi': 'Absensi | Portal Magang BPJS Ketenagakerjaan',
      '/seminar': 'Absensi Seminar | Portal Magang BPJS Ketenagakerjaan',
      '/viralisasi': 'Video Viralisasi | Portal Magang BPJS Ketenagakerjaan',
      '/laporan': 'Upload Laporan | Portal Magang BPJS Ketenagakerjaan',
      '/materi': 'Materi & Formulir | Portal Magang BPJS Ketenagakerjaan',
      '/pengumuman': 'Pengumuman | Portal Magang BPJS Ketenagakerjaan',
      '/login': 'Login | Portal Magang BPJS Ketenagakerjaan',
      '/admin': 'Dashboard Admin | Portal Magang BPJS Ketenagakerjaan',
      '/admin/peserta': 'Peserta | Portal Magang BPJS Ketenagakerjaan',
      '/admin/absensi': 'Log Absensi | Portal Magang BPJS Ketenagakerjaan',
      '/admin/absensi-biasa': 'Rekap Absensi Biasa | Portal Magang BPJS Ketenagakerjaan',
      '/admin/seminar': 'Absensi Seminar Admin | Portal Magang BPJS Ketenagakerjaan',
      '/admin/viralisasi': 'Video Viralisasi Admin | Portal Magang BPJS Ketenagakerjaan',
      '/admin/laporan': 'Laporan Admin | Portal Magang BPJS Ketenagakerjaan',
      '/admin/materi': 'Materi PDF Admin | Portal Magang BPJS Ketenagakerjaan',
      '/admin/pengaturan': 'Pengaturan | Portal Magang BPJS Ketenagakerjaan',
      '/admin/pengumuman': 'Pengumuman Admin | Portal Magang BPJS Ketenagakerjaan',
      '/admin/export': 'Export Data | Portal Magang BPJS Ketenagakerjaan',
    };

    const match = Object.keys(titles).find((key) => location.pathname === key || location.pathname.startsWith(`${key}/`));
    document.title = match ? titles[match] : 'Portal Magang BPJS Ketenagakerjaan';
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTitle />
      <Routes>
        {/* Portal Peserta */}
        <Route element={<ParticipantLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/absensi" element={<Absensi />} />
          <Route path="/seminar" element={<Seminar />} />
          <Route path="/viralisasi" element={<Viralisasi />} />
          <Route path="/laporan" element={<Laporan />} />
          <Route path="/materi" element={<Materi />} />
          <Route path="/pengumuman" element={<PengumumanPeserta />} />
        </Route>

        {/* Admin */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="peserta" element={<Peserta />} />
          <Route path="absensi" element={<AdminAbsensi />} />
          <Route path="absensi-biasa" element={<AdminRekapAbsensi />} />
          <Route path="seminar" element={<AdminSeminar />} />
          <Route path="viralisasi" element={<AdminViralisasi />} />
          <Route path="laporan" element={<AdminLaporan />} />
          <Route path="materi" element={<AdminMateri />} />
          <Route path="export" element={<ExportData />} />
          <Route path="pengaturan" element={<Pengaturan />} />
          <Route path="pengumuman" element={<AdminPengumuman />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
