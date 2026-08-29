import { useEffect, useState } from 'react';
import { fetchDashboardStats, fetchRecentActivities } from '../../services/adminService';
import { formatDateTime, maskNik } from '../../utils/constants';
import { Spinner } from '../../components/ui/Spinner';

type Stats = {
  totalParticipants: number;
  totalHadirHariIni: number;
  absensiPagi: number;
  absensiSore: number;
  totalSeminar: number;
  totalLaporan: number;
  totalTikTok: number;
  totalBPU: number;
  totalPU: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<{
    attendance: unknown[];
    reports: unknown[];
    bpu: unknown[];
    pu: unknown[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, r] = await Promise.all([fetchDashboardStats(), fetchRecentActivities()]);
      setStats(s);
      setRecent(r);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={32} />
      </div>
    );
  }

  const cards = [
    { label: 'Total Peserta', value: stats.totalParticipants },
    { label: 'Hadir Hari Ini', value: stats.totalHadirHariIni },
    { label: 'Absensi Pagi', value: stats.absensiPagi },
    { label: 'Absensi Sore', value: stats.absensiSore },
    { label: 'Total Absensi Seminar', value: stats.totalSeminar },
    { label: 'Total Laporan', value: stats.totalLaporan },
    { label: 'Total Video Viralisasi', value: stats.totalTikTok },
    { label: 'Total BPU', value: stats.totalBPU },
    { label: 'Total PU', value: stats.totalPU },
  ];

  return (
    <div>
      <h2 className="admin-title">Dashboard</h2>

      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
          </div>
        ))}
      </div>

      <h3 style={{ margin: '24px 0 12px' }}>Aktivitas Terbaru</h3>
      <div className="recent-grid">
        <div className="recent-panel">
          <h4>Absensi Terbaru</h4>
          <ul className="recent-list">
            {(recent?.attendance ?? []).slice(0, 5).map((r: any) => (
              <li key={r.id}>
                <strong>{r.nama ?? r.nim}</strong> — {r.session} ({formatDateTime(r.created_at)})
              </li>
            ))}
            {(recent?.attendance ?? []).length === 0 && <li>Belum ada data absensi.</li>}
          </ul>
        </div>

        <div className="recent-panel">
          <h4>Laporan Terbaru</h4>
          <ul className="recent-list">
            {(recent?.reports ?? []).slice(0, 5).map((r: any) => (
              <li key={r.id}>
                <strong>{r.nama ?? r.nim}</strong> — {r.judul}
              </li>
            ))}
            {(recent?.reports ?? []).length === 0 && <li>Belum ada laporan.</li>}
          </ul>
        </div>

        <div className="recent-panel">
          <h4>BPU Terbaru</h4>
          <ul className="recent-list">
            {(recent?.bpu ?? []).slice(0, 5).map((r: any) => (
              <li key={r.id}>
                <strong>{r.nama_ktp}</strong> — Kel. {r.kelompok} (NIK {maskNik(r.nik)})
              </li>
            ))}
            {(recent?.bpu ?? []).length === 0 && <li>Belum ada data BPU.</li>}
          </ul>
        </div>

        <div className="recent-panel">
          <h4>PU Terbaru</h4>
          <ul className="recent-list">
            {(recent?.pu ?? []).slice(0, 5).map((r: any) => (
              <li key={r.id}>
                <strong>{r.nama_ktp}</strong> — Kel. {r.kelompok} (NIK {maskNik(r.nik)})
              </li>
            ))}
            {(recent?.pu ?? []).length === 0 && <li>Belum ada data PU.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
