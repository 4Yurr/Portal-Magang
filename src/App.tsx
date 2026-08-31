import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ParticipantLayout } from './layouts/ParticipantLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui/Spinner';
import Home from './pages/participant/Home';
import Absensi from './pages/participant/Absensi';
import Seminar from './pages/participant/Seminar';
import Viralisasi from './pages/participant/Viralisasi';
import Laporan from './pages/participant/Laporan';
import AkuisisiBPU from './pages/participant/AkuisisiBPU';
import AkuisisiPU from './pages/participant/AkuisisiPU';
import Materi from './pages/participant/Materi';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Peserta from './pages/admin/Peserta';
import AdminAbsensi from './pages/admin/AdminAbsensi';
import AdminSeminar from './pages/admin/AdminSeminar';
import AdminViralisasi from './pages/admin/AdminViralisasi';
import AdminLaporan from './pages/admin/AdminLaporan';
import AdminBPU from './pages/admin/AdminBPU';
import AdminPU from './pages/admin/AdminPU';
import AdminMateri from './pages/admin/AdminMateri';
import ExportData from './pages/admin/ExportData';
import Pengaturan from './pages/admin/Pengaturan';

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal Peserta */}
        <Route element={<ParticipantLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/absensi" element={<Absensi />} />
          <Route path="/seminar" element={<Seminar />} />
          <Route path="/viralisasi" element={<Viralisasi />} />
          <Route path="/laporan" element={<Laporan />} />
          <Route path="/bpu" element={<AkuisisiBPU />} />
          <Route path="/pu" element={<AkuisisiPU />} />
          <Route path="/materi" element={<Materi />} />
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
          <Route path="seminar" element={<AdminSeminar />} />
          <Route path="viralisasi" element={<AdminViralisasi />} />
          <Route path="laporan" element={<AdminLaporan />} />
          <Route path="bpu" element={<AdminBPU />} />
          <Route path="pu" element={<AdminPU />} />
          <Route path="materi" element={<AdminMateri />} />
          <Route path="export" element={<ExportData />} />
          <Route path="pengaturan" element={<Pengaturan />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
