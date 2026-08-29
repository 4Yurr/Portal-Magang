import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { FileModal, DownloadButton } from '../../components/admin/FileActions';
import { fetchReports } from '../../services/adminService';
import type { ReportRow } from '../../types';
import { formatDateTime, formatBytes } from '../../utils/constants';
import { exportToExcel } from '../../utils/excel';

export default function AdminLaporan() {
  const { showToast } = useToast();
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [fileView, setFileView] = useState<ReportRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchReports({
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
        { header: 'Judul Laporan', key: 'judul' },
        { header: 'Nama File', key: 'filename' },
        { header: 'Ukuran (bytes)', key: 'size_bytes' },
        { header: 'Tanggal Upload', key: 'created_at' },
      ],
      data.map((d) => ({
        nim: d.nim ?? '',
        nama: d.nama ?? '',
        fakultas: d.fakultas ?? '',
        prodi: d.prodi ?? '',
        kelompok: d.kelompok ?? '',
        judul: d.judul,
        filename: d.filename,
        size_bytes: d.size_bytes,
        created_at: d.created_at,
      })),
      `Laporan.xlsx`,
    ).then((r) => showToast(r.message, r.success ? 'success' : 'error'));
  };

  return (
    <div>
      <h2 className="admin-title">Laporan Akhir</h2>

      <div className="panel">
        <div className="panel-toolbar">
          <div className="toolbar-field">
            <label>Tanggal</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="toolbar-field">
            <label>Search</label>
            <input type="text" placeholder="Cari NIM / Nama / Judul" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <th>Judul Laporan</th>
                  <th>File</th>
                  <th>Ukuran</th>
                  <th>Tanggal Upload</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id}>
                    <td>{d.nim}</td>
                    <td><strong>{d.nama}</strong></td>
                    <td>{d.judul}</td>
                    <td>{d.filename}</td>
                    <td>{formatBytes(d.size_bytes)}</td>
                    <td>{formatDateTime(d.created_at)}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '5px 9px', fontSize: '0.78rem' }}
                        onClick={() => setFileView(d)}
                      >
                        Lihat PDF
                      </button>
                      <DownloadButton storagePath={d.storage_path} filename={d.filename} label="Download" />
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>
                      Tidak ada laporan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {fileView && (
        <FileModal
          storagePath={fileView.storage_path}
          filename={fileView.filename}
          mimeType={fileView.mime_type}
          onClose={() => setFileView(null)}
        />
      )}
    </div>
  );
}
