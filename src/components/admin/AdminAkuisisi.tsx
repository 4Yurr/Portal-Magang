// Shared admin table for Akuisisi BPU / PU (NIK sensitive -> masked).

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';
import { FileModal, DownloadButton } from './FileActions';
import { fetchAkuisisi, deleteAkuisisi, updateAkuisisi } from '../../services/adminService';
import type { AkuisisiRow } from '../../types';
import { formatDateTime, formatBytes, maskNik } from '../../utils/constants';
import { exportToExcel } from '../../utils/excel';

type Props = {
  type: 'BPU' | 'PU';
  title: string;
  table: 'akuisisi_bpu' | 'akuisisi_pu';
};

export function AdminAkuisisi({ type, title, table }: Props) {
  const { showToast } = useToast();
  const [data, setData] = useState<AkuisisiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kelompok, setKelompok] = useState('');
  const [fileView, setFileView] = useState<AkuisisiRow | null>(null);
  const [showNik, setShowNik] = useState(false);
  const [editingRow, setEditingRow] = useState<AkuisisiRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AkuisisiRow | null>(null);

  const [kelompokDraft, setKelompokDraft] = useState('');
  const [namaKtpDraft, setNamaKtpDraft] = useState('');
  const [nikDraft, setNikDraft] = useState('');
  const [jenisKelaminDraft, setJenisKelaminDraft] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAkuisisi(table, {
      search: search || undefined,
      kelompok: kelompok || undefined,
    });
    setData(res);
    setLoading(false);
  }, [search, kelompok, table]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (row: AkuisisiRow) => {
    if (!kelompokDraft) return showToast('Pilih kelompok', 'error');
    if (!namaKtpDraft.trim()) return showToast('Nama wajib diisi', 'error');
    if (!/^\d{16}$/.test(nikDraft.trim())) return showToast('NIK harus 16 digit angka', 'error');

    const { error } = await updateAkuisisi(table, row.id, {
      kelompok: kelompokDraft,
      nama_ktp: namaKtpDraft.trim(),
      nik: nikDraft.trim(),
      jenis_kelamin: jenisKelaminDraft,
    });

    if (error) {
      showToast('Gagal memperbarui data ' + type, 'error');
      return;
    }

    showToast('Data ' + type + ' berhasil diperbarui', 'success');
    setEditingRow(null);
    load();
  };

  const removeRow = async () => {
    if (!deleteTarget) return;
    const { error } = await deleteAkuisisi(table, deleteTarget.id);
    if (error) {
      showToast('Gagal menghapus data ' + type, 'error');
      return;
    }

    showToast('Data ' + type + ' berhasil dihapus', 'success');
    setDeleteTarget(null);
    load();
  };

  const handleExport = () => {
    exportToExcel(
      [
        { header: 'Kelompok', key: 'kelompok' },
        { header: 'Nama sesuai KTP', key: 'nama_ktp' },
        { header: 'NIK', key: 'nik' },
        { header: 'Jenis Kelamin', key: 'jenis_kelamin' },
        { header: 'Nama File', key: 'filename' },
        { header: 'Ukuran (bytes)', key: 'size_bytes' },
        { header: 'Tanggal', key: 'created_at' },
      ],
      data.map((d) => ({
        kelompok: d.kelompok,
        nama_ktp: d.nama_ktp,
        nik: showNik ? d.nik : maskNik(d.nik),
        jenis_kelamin: d.jenis_kelamin,
        filename: d.filename,
        size_bytes: d.size_bytes,
        created_at: d.created_at,
      })),
      `Data_${type}.xlsx`,
    ).then((r) => showToast(r.message, r.success ? 'success' : 'error'));
  };

  return (
    <div>
      <h2 className="admin-title">{title}</h2>

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
            <input type="text" placeholder="Cari Nama / NIK" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className={`btn ${showNik ? 'btn-danger' : 'btn-outline'}`} onClick={() => setShowNik((v) => !v)}>
            {showNik ? 'Sembunyikan NIK' : 'Tampilkan NIK Penuh'}
          </button>
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
                  <th>Nama sesuai KTP</th>
                  <th>NIK</th>
                  <th>Jenis Kelamin</th>
                  <th>File</th>
                  <th>Ukuran</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id}>
                    <td>{d.kelompok}</td>
                    <td><strong>{d.nama_ktp}</strong></td>
                    <td>{showNik ? d.nik : maskNik(d.nik)}</td>
                    <td>{d.jenis_kelamin}</td>
                    <td>{d.filename}</td>
                    <td>{formatBytes(d.size_bytes)}</td>
                    <td>{formatDateTime(d.created_at)}</td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {d.mime_type.startsWith('image/') || d.filename.toLowerCase().endsWith('.pdf') ? (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 9px', fontSize: '0.78rem' }}
                          onClick={() => setFileView(d)}
                        >
                          Lihat
                        </button>
                      ) : null}
                      <DownloadButton storagePath={d.storage_path} filename={d.filename} label="Download" />
                      <button
                        className="btn btn-outline"
                        style={{ padding: '5px 9px', fontSize: '0.78rem' }}
                        onClick={() => {
                          setEditingRow(d);
                          setKelompokDraft(d.kelompok);
                          setNamaKtpDraft(d.nama_ktp);
                          setNikDraft(d.nik);
                          setJenisKelaminDraft(d.jenis_kelamin);
                        }}
                      >
                        Edit
                      </button>
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
                    <td colSpan={8} style={{ textAlign: 'center', padding: 30 }}>
                      Tidak ada data {type}.
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

      {editingRow && (
        <div className="modal-overlay" onClick={() => setEditingRow(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ubah Data {type}</h3>
            <label>Kelompok</label>
            <select value={kelompokDraft} onChange={(e) => setKelompokDraft(e.target.value)}>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={String(i + 1)}>
                  Kelompok {i + 1}
                </option>
              ))}
            </select>

            <label>Nama Lengkap (sesuai KTP)</label>
            <input type="text" value={namaKtpDraft} onChange={(e) => setNamaKtpDraft(e.target.value)} />

            <label>NIK</label>
            <input
              type="text"
              value={nikDraft}
              maxLength={16}
              onChange={(e) => setNikDraft(e.target.value.replace(/\D/g, ''))}
            />

            <label>Jenis Kelamin</label>
            <select value={jenisKelaminDraft} onChange={(e) => setJenisKelaminDraft(e.target.value as 'Laki-laki' | 'Perempuan')}>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
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
              Apakah Anda yakin ingin menghapus data {type} <strong>{deleteTarget.nama_ktp}</strong>?
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
