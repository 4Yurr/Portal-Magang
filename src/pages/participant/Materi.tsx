import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialRow } from '../../types';
import { getMaterials, materialPublicUrl } from '../../services/participantService';

const localMaterials: MaterialRow[] = [
  {
    id: 'local-bpu',
    slug: 'bpu',
    title: 'Formulir / Materi Acuan BPU',
    description: 'Formulir dan materi acuan pendataan Bukan Penerima Upah (BPU).',
    storage_path: 'BPU.pdf',
    filename: 'BPU.pdf',
    is_active: true,
  },
  {
    id: 'local-pu',
    slug: 'pu',
    title: 'Formulir / Materi Acuan PU',
    description: 'Formulir dan materi acuan pendataan Penerima Upah (PU).',
    storage_path: 'PU.pdf',
    filename: 'PU.pdf',
    is_active: true,
  },
  {
    id: 'local-brosur-bpu-2026',
    slug: 'brosur-bpu-2026',
    title: 'Brosur BPU 2026',
    description: 'Informasi program BPJS Ketenagakerjaan untuk pekerja bukan penerima upah.',
    storage_path: 'FA Brosur BPU_2026.pdf',
    filename: 'FA Brosur BPU_2026.pdf',
    is_active: true,
  },
  {
    id: 'local-brosur-pu-mikro-2026',
    slug: 'brosur-pu-mikro-2026',
    title: 'Brosur PU Mikro 2026',
    description: 'Informasi program BPJS Ketenagakerjaan bagi pekerja penerima upah mikro.',
    storage_path: 'FA Brosur PU Mikro_2026.pdf',
    filename: 'FA Brosur PU Mikro_2026.pdf',
    is_active: true,
  },
  {
    id: 'local-brosur-pu-umb-2026',
    slug: 'brosur-pu-umb-2026',
    title: 'Brosur PU UMB 2026',
    description: 'Informasi program BPJS Ketenagakerjaan bagi pekerja penerima upah.',
    storage_path: 'FA Brosur PU UMB_2026.pdf',
    filename: 'FA Brosur PU UMB_2026.pdf',
    is_active: true,
  },
];

function localMaterialUrl(filename: string): string {
  return `/materials/${encodeURIComponent(filename)}`;
}

export default function Materi() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await getMaterials();
      const localFilenames = new Set(localMaterials.map((material) => material.filename));
      const additionalMaterials = res.filter((material) => !localFilenames.has(material.filename));
      if (mounted) setMaterials([...localMaterials, ...additionalMaterials]);
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
              href={m.id.startsWith('local-') ? localMaterialUrl(m.filename) : materialPublicUrl(m.storage_path)}
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
