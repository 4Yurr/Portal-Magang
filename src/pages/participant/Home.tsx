import { useNavigate } from 'react-router-dom';
import { AppIcon, type AppIconName } from '../../components/ui/AppIcon';

const menus: Array<{ to: string; icon: AppIconName; title: string; desc: string }> = [
  { to: '/absensi', icon: 'attendance', title: 'ABSENSI – Kehadiran Biasa', desc: 'Catat kehadiran harian' },
  { to: '/seminar', icon: 'seminar', title: 'ABSENSI SEMINAR', desc: 'Presensi seminar & webinar' },
  { to: '/viralisasi', icon: 'video', title: 'UPLOAD VIDEO VIRALISASI', desc: 'Kirim link video viralisasi' },
  { to: '/laporan', icon: 'report', title: 'UPLOAD LAPORAN', desc: 'Kirim dokumen laporan (PDF)' },
  { to: '/pengumuman', icon: 'announcement', title: 'PENGUMUMAN', desc: 'Informasi terbaru kegiatan magang' },
  { to: '/materi', icon: 'material', title: 'MATERI & FORMULIR', desc: 'Download materi / formulir PDF' },
];

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <div className="menu-grid">
        {menus.map((m) => (
          <div key={m.to} className="menu-card" onClick={() => navigate(m.to)} role="button" tabIndex={0}>
            <div className="menu-icon"><AppIcon name={m.icon} size={20} /></div>
            <div>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
