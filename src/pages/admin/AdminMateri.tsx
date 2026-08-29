import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabaseClient';
import { getPublicMaterialUrl } from '../../services/adminService';
import type { MaterialRow } from '../../types';
import { exportToExcel } from '../../utils/excel';

export default function AdminMateri() {
  const { showToast } = useToast();
  const [data, setData] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('materials').select('*').order('slug');
    if (error) {
      console.error(error);
      setData([]);
    } else {
      setData((data ?? []) as MaterialRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (m: MaterialRow) => {
    const { error } = await supabase
      .from('materials')
      .update({ is_active: !m.is_active })
      .eq('id', m.id);
    if (error) {
      showToast('Gagal mengubah status materi', 'error');
      return;
    }
    showToast('Status materi diperbarui', 'success');
    load();
  };

  const handleExport = () => {
    exportToExcel(
      [
        { header: 'Slug', key: 'slug' },
        { header: 'Judul', key: 'title' },
        { header: 'Deskripsi', key: 'description' },
        { header: 'Storage Path', key: 'storage_path' },
        { header: 'Filename', key: 'filename' },
        { header: 'Aktif', key: 'is_active' },
      ],
      data.map((d) => ({
        slug: d.slug,
        title: d.title,
        description: d.description,
        storage_path: d.storage_path,
        filename: d.filename,
        is_active: d.is_active ? 'Ya' : 'Tidak',
      })),
      'Materi_PDF.xlsx',
    ).then((r) => showToast(r.message, r.success ? 'success' : 'error'));
  };

  return (
    <div>
      <h2 className="admin-title">Materi PDF</h2>

      <div className="info-banner" style={{ marginBottom: 16 }}>
        <span>📚</span>
        <div>
          <strong>Cara unggah file materi (BPU.pdf / PU.pdf):</strong>
          <br />
          File PDF ditempatkan di bucket storage <code>materials</code> (mis. path{' '}
          <code>materials/BPU.pdf</code> dan <code>materials/PU.pdf</code>). Karena bucket{' '}
          <code>materials</code> bersifat <strong>publik</strong>, peserta dapat mendownload-nya langsung.
          Gunakan Dashboard Supabase → Storage → materials → Upload.
        </div>
      </div>

      <div className="panel">
        <div className="panel-toolbar">
          <button className="btn btn-accent" onClick={handleExport}>
            Download Excel
          </button>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Spinner size={28} />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Deskripsi</th>
                  <th>Storage Path</th>
                  <th>Status</th>
                  <th>Link Publik</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.title}</strong></td>
                    <td>{m.description}</td>
                    <td>{m.storage_path}</td>
                    <td>
                      <span className={`badge ${m.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {m.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <a href={getPublicMaterialUrl(m.storage_path)} target="_blank" rel="noopener noreferrer">
                        Buka
                      </a>
                    </td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => toggleActive(m)}>
                        {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>
                      Belum ada materi. Jalankan migration 0002 untuk seed BPU.pdf & PU.pdf.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
