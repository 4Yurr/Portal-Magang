import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialRow } from '../../types';
import { getMaterials, materialPublicUrl } from '../../services/participantService';

export default function Materi() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await getMaterials();
      if (mounted) setMaterials(res);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="form-section" style={{ maxWidth: 640 }}>
        <div className="page-header">
          <h2>MATERI & FORMULIR</h2>
          <button className="btn-back" onClick={() => navigate('/')} type="button">
            ← Kembali
          </button>
        </div>

        <div className="info-banner">
          <span>📚</span>
          <div>
            <strong>Download Materi & Formulir</strong>
            <br />
            Unduh formulir/materi acuan yang diperlukan untuk tugas magang Anda.
          </div>
        </div>

        {materials.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>Belum ada materi yang tersedia.</p>
        )}

        {materials.map((m) => (
          <div key={m.id} className="download-banner">
            <div className="download-info">
              <span className="download-icon">📥</span>
              <div>
                <strong>{m.title}</strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{m.description}</div>
              </div>
            </div>
            <a
              className="btn btn-accent"
              href={materialPublicUrl(m.storage_path)}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              Download PDF
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
