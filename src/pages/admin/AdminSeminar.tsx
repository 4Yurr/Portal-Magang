import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { PhotoViewModal } from '../../components/admin/FileActions';
import { deleteSeminar, fetchSeminar, updateSeminar } from '../../services/adminService';
import type { AttendanceStatus, SeminarRow } from '../../types';
import { formatDateTime, formatTime, formatDate } from '../../utils/constants';
import { exportToExcel } from '../../utils/excel';

export default function AdminSeminar() {
  const { showToast } = useToast();
  const [data, setData] = useState<SeminarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [photo, setPhoto] = useState<SeminarRow | null>(null);
  const [editingRow, setEditingRow] = useState<SeminarRow | null>(null);
  const [statusDraft, setStatusDraft] = useState<AttendanceStatus>('Hadir');
  const [kegiatanDraft, setKegiatanDraft] = useState('');
  const [tanggalDraft, setTanggalDraft] = useState('');
  const [jamDraft, setJamDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SeminarRow | null>(null);

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

  const handleUpdate = async (row: SeminarRow) => {
    if (!kegiatanDraft.trim()) return showToast('Nama kegiatan wajib diisi', 'error');

    const { error } = await updateSeminar(row.id, {
      status: statusDraft,
      kegiatan: kegiatanDraft.trim(),
      tanggal: tanggalDraft,
      jam: jamDraft + (jamDraft.length === 5 ? ':00' : ''),
    });
    if (error) {
      showToast('Gagal mengubah data seminar', 'error');
      return;
    }
    showToast('Status absensi seminar berhasil diperbarui', 'success');
    setEditingRow(null);
    load();
  };

  const removeRow = async () => {
    if (!deleteTarget) return;
    const { error } = await deleteSeminar(deleteTarget.id);
    if (error) {
      showToast('Gagal menghapus absensi seminar', 'error');
      return;
    }
    showToast('Data absensi seminar berhasil dihapus', 'success');
    setDeleteTarget(null);
    load();
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
                  <th>Foto</th>
                  <th>Created At</th>
                  <th>Aksi</th>
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
                      <span className={`badge ${d.status === 'Hadir' ? 'badge-success' : d.status === 'Izin' ? 'badge-warning' : d.status === 'Sakit' ? 'badge-neutral' : 'badge-danger'}`}>{d.status}</span>
                    </td>
                    <td>
                      {d.photo_path ? (
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setPhoto(d)}>
                          Lihat
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{formatDateTime(d.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => {
                          setEditingRow(d);
                          setStatusDraft(d.status);
                          setKegiatanDraft(d.kegiatan);
                          setTanggalDraft(d.tanggal);
                          setJamDraft(d.jam ? d.jam.slice(0, 5) : '');
                        }}>
                          Edit
                        </button>
                        <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => setDeleteTarget(d)}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 30 }}>
                      Tidak ada data absensi seminar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editingRow && (
        <div className="modal-overlay" onClick={() => setEditingRow(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ubah Data Absensi Seminar</h3>
            <p>
              <strong>{editingRow.nama}</strong> — NIM: {editingRow.nim}
            </p>
            <label>Nama Seminar / Kegiatan</label>
            <input type="text" value={kegiatanDraft} onChange={(e) => setKegiatanDraft(e.target.value)} />
            <label>Tanggal</label>
            <input type="date" value={tanggalDraft} onChange={(e) => setTanggalDraft(e.target.value)} />
            <label>Jam</label>
            <input type="time" value={jamDraft} onChange={(e) => setJamDraft(e.target.value)} />
            <label>Status</label>
            <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as AttendanceStatus)}>
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Ditolak">Ditolak</option>
            </select>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => handleUpdate(editingRow)}>Simpan</button>
              <button className="btn btn-outline" onClick={() => setEditingRow(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Konfirmasi Hapus</h3>
            <p>
              Yakin ingin menghapus absensi seminar <strong>{deleteTarget.nama}</strong> untuk kegiatan {deleteTarget.kegiatan}?
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

      {photo && (
        <PhotoViewModal storagePath={photo.photo_path} filename={photo.photo_filename} onClose={() => setPhoto(null)} />
      )}
    </div>
  );
}
