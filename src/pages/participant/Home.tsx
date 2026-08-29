import { useNavigate } from 'react-router-dom';

const menus = [
  { to: '/absensi', icon: '📝', title: 'ABSENSI – Kehadiran Biasa', desc: 'Catat kehadiran harian' },
  { to: '/seminar', icon: '🎓', title: 'ABSENSI SEMINAR', desc: 'Presensi seminar & webinar' },
  { to: '/viralisasi', icon: '📱', title: 'UPLOAD VIDEO VIRALISASI', desc: 'Kirim link video viralisasi' },
  { to: '/laporan', icon: '📄', title: 'UPLOAD LAPORAN', desc: 'Kirim dokumen laporan (PDF)' },
  { to: '/pu', icon: '🏢', title: 'AKUISISI DATA PU', desc: 'Pendataan peserta Penerima Upah' },
  { to: '/bpu', icon: '👥', title: 'AKUISISI DATA BPU', desc: 'Pendataan peserta Bukan Penerima Upah' },
  { to: '/materi', icon: '📚', title: 'MATERI & FORMULIR', desc: 'Download materi / formulir PDF' },
];

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <div className="menu-grid">
        {menus.map((m) => (
          <div key={m.to} className="menu-card" onClick={() => navigate(m.to)} role="button" tabIndex={0}>
            <div className="menu-icon">{m.icon}</div>
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
