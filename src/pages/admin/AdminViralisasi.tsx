import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { fetchTikTok, deleteTikTok } from '../../services/adminService';
import type { TikTokRow } from '../../types';
import { formatDateTime } from '../../utils/constants';
import { exportToExcel } from '../../utils/excel';

export default function AdminViralisasi() {
  const { showToast } = useToast();
  const [data, setData] = useState<TikTokRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kelompok, setKelompok] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TikTokRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchTikTok({
      search: search || undefined,
      kelompok: kelompok || undefined,
    });
    setData(res);
    setLoading(false);
  }, [search, kelompok]);

  const removeRow = async () => {
    if (!deleteTarget) return;
    const { error } = await deleteTikTok(deleteTarget.id);
    if (error) {
      showToast('Gagal menghapus link TikTok', 'error');
      return;
    }
    showToast('Link TikTok berhasil dihapus', 'success');
    setDeleteTarget(null);
    load();
  };

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    exportToExcel(
      [
        { header: 'Kelompok', key: 'kelompok' },
        { header: 'Nama Pengirim', key: 'pengirim' },
        { header: 'URL TikTok', key: 'url' },
        { header: 'Catatan', key: 'note' },
        { header: 'Tanggal', key: 'created_at' },
      ],
      data.map((d) => ({
        kelompok: d.kelompok,
        pengirim: d.pengirim,
        url: d.url,
        note: d.note,
        created_at: d.created_at,
      })),
      `Video_Viralisasi.xlsx`,
    ).then((r) => showToast(r.message, r.success ? 'success' : 'error'));
  };

  return (
    <div>
      <h2 className="admin-title">Video Viralisasi (TikTok)</h2>

      <div className="panel">
        <div className="panel-toolbar">
          <div className="toolbar-field">
            <label>Kelompok</label>
            <select value={kelompok} onChange={(e) => setKelompok(e.target.value)}>
              <option value="">Semua</option>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={String(i + 1)}>
                  Kelompok {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="toolbar-field">
            <label>Search</label>
            <input type="text" placeholder="Cari pengirim / URL" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
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
                  <th>Kelompok</th>
                  <th>Nama Pengirim</th>
                  <th>URL TikTok</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id}>
                    <td>{d.kelompok}</td>
                    <td><strong>{d.pengirim}</strong></td>
                    <td>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                        {d.url}
                      </a>
                    </td>
                    <td>{formatDateTime(d.created_at)}</td>
                    <td><span className="badge badge-success">Berhasil</span></td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '5px 9px', fontSize: '0.78rem' }}
                        onClick={() => setDeleteTarget(d)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>
                      Tidak ada data viralisasi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Konfirmasi Hapus</h3>
            <p>
              Apakah Anda yakin ingin menghapus link TikTok dari <strong>{deleteTarget.pengirim}</strong>?
              <br />
              <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Data yang dihapus tidak dapat dikembalikan.</span>
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-danger" onClick={removeRow}>Hapus Permanen</button>
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
