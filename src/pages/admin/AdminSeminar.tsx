import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { PhotoViewModal } from '../../components/admin/FileActions';
import { fetchSeminar } from '../../services/adminService';
import type { SeminarRow } from '../../types';
import { formatDateTime, formatTime, formatDate } from '../../utils/constants';
import { exportToExcel } from '../../utils/excel';

export default function AdminSeminar() {
  const { showToast } = useToast();
  const [data, setData] = useState<SeminarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [photo, setPhoto] = useState<SeminarRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchSeminar({
      search: search || undefined,
      tanggal: tanggal || undefined,
    });
    setData(res);
    setLoading(false);
  }, [search, tanggal]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    exportToExcel(
      [
        { header: 'NIM', key: 'nim' },
        { header: 'Nama', key: 'nama' },
        { header: 'Fakultas', key: 'fakultas' },
        { header: 'Prodi', key: 'prodi' },
        { header: 'Kelompok', key: 'kelompok' },
        { header: 'Kegiatan', key: 'kegiatan' },
        { header: 'Tanggal', key: 'tanggal' },
        { header: 'Jam', key: 'jam' },
        { header: 'Status', key: 'status' },
        { header: 'Created At', key: 'created_at' },
      ],
      data.map((d) => ({
        nim: d.nim ?? '',
        nama: d.nama ?? '',
        fakultas: d.fakultas ?? '',
        prodi: d.prodi ?? '',
        kelompok: d.kelompok ?? '',
        kegiatan: d.kegiatan,
        tanggal: d.tanggal,
        jam: d.jam,
        status: d.status,
        created_at: d.created_at,
      })),
      `Absensi_Seminar_${tanggal || 'semua'}.xlsx`,
    ).then((r) => showToast(r.message, r.success ? 'success' : 'error'));
  };

  return (
    <div>
      <h2 className="admin-title">Absensi Seminar</h2>

      <div className="panel">
        <div className="panel-toolbar">
          <div className="toolbar-field">
            <label>Tanggal</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="toolbar-field">
            <label>Search</label>
            <input type="text" placeholder="Cari NIM / Nama / Kegiatan" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <th>NIM</th>
                  <th>Nama</th>
                  <th>Kegiatan</th>
                  <th>Tanggal</th>
                  <th>Jam</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id}>
                    <td>{d.nim}</td>
                    <td><strong>{d.nama}</strong></td>
                    <td>{d.kegiatan}</td>
                    <td>{formatDate(d.tanggal)}</td>
                    <td>{formatTime(d.jam)}</td>
                    <td>
                      <span className={`badge ${d.status === 'Hadir' ? 'badge-success' : 'badge-neutral'}`}>{d.status}</span>
                    </td>
                    <td>{formatDateTime(d.created_at)}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>
                      Tidak ada data absensi seminar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {photo && (
        <PhotoViewModal storagePath={photo.photo_path} filename={photo.photo_filename} onClose={() => setPhoto(null)} />
      )}
    </div>
  );
}
