// Central Export Data hub — exports respect the current filter of each dataset.

import { useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import {
  fetchAttendance,
  fetchSeminar,
  fetchTikTok,
  fetchReports,
  fetchAkuisisi,
  fetchParticipants,
} from '../../services/adminService';
import { maskNik } from '../../utils/constants';
import { exportToExcel } from '../../utils/excel';

export default function ExportData() {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<{ success: boolean; message: string }>) => {
    setExporting(key);
    const r = await fn();
    setExporting(null);
    showToast(r.message, r.success ? 'success' : 'error');
  };

  const handleAttendance = () =>
    run('attendance', async () => {
      const rows = await fetchAttendance();
      return exportToExcel(
        [
          { header: 'NIM', key: 'nim' },
          { header: 'Nama', key: 'nama' },
          { header: 'Fakultas', key: 'fakultas' },
          { header: 'Prodi', key: 'prodi' },
          { header: 'Kelompok', key: 'kelompok' },
          { header: 'Tanggal', key: 'tanggal' },
          { header: 'Jam', key: 'jam' },
          { header: 'Sesi', key: 'session' },
          { header: 'Status', key: 'status' },
          { header: 'Latitude', key: 'latitude' },
          { header: 'Longitude', key: 'longitude' },
          { header: 'Accuracy', key: 'accuracy' },
          { header: 'Created At', key: 'created_at' },
        ],
        rows.map((d) => ({
          nim: d.nim ?? '',
          nama: d.nama ?? '',
          fakultas: d.fakultas ?? '',
          prodi: d.prodi ?? '',
          kelompok: d.kelompok ?? '',
          tanggal: d.tanggal,
          jam: d.jam,
          session: d.session,
          status: d.status,
          latitude: d.latitude,
          longitude: d.longitude,
          accuracy: d.accuracy,
          created_at: d.created_at,
        })),
        'Absensi.xlsx',
      );
    });

  const handleSeminar = () =>
    run('seminar', async () => {
      const rows = await fetchSeminar();
      return exportToExcel(
        [
          { header: 'NIM', key: 'nim' },
          { header: 'Nama', key: 'nama' },
          { header: 'Kegiatan', key: 'kegiatan' },
          { header: 'Tanggal', key: 'tanggal' },
          { header: 'Jam', key: 'jam' },
          { header: 'Status', key: 'status' },
          { header: 'Created At', key: 'created_at' },
        ],
        rows.map((d) => ({
          nim: d.nim ?? '',
          nama: d.nama ?? '',
          kegiatan: d.kegiatan,
          tanggal: d.tanggal,
          jam: d.jam,
          status: d.status,
          created_at: d.created_at,
        })),
        'Absensi_Seminar.xlsx',
      );
    });

  const handleTikTok = () =>
    run('tiktok', async () => {
      const rows = await fetchTikTok();
      return exportToExcel(
        [
          { header: 'Kelompok', key: 'kelompok' },
          { header: 'Nama Pengirim', key: 'pengirim' },
          { header: 'URL TikTok', key: 'url' },
          { header: 'Tanggal', key: 'created_at' },
        ],
        rows.map((d) => ({
          kelompok: d.kelompok,
          pengirim: d.pengirim,
          url: d.url,
          created_at: d.created_at,
        })),
        'Video_Viralisasi.xlsx',
      );
    });

  const handleReports = () =>
    run('reports', async () => {
      const rows = await fetchReports();
      return exportToExcel(
        [
          { header: 'NIM', key: 'nim' },
          { header: 'Nama', key: 'nama' },
          { header: 'Judul Laporan', key: 'judul' },
          { header: 'Nama File', key: 'filename' },
          { header: 'Ukuran (bytes)', key: 'size_bytes' },
          { header: 'Tanggal Upload', key: 'created_at' },
        ],
        rows.map((d) => ({
          nim: d.nim ?? '',
          nama: d.nama ?? '',
          judul: d.judul,
          filename: d.filename,
          size_bytes: d.size_bytes,
          created_at: d.created_at,
        })),
        'Laporan.xlsx',
      );
    });

  const handleBPU = () =>
    run('bpu', async () => {
      const rows = await fetchAkuisisi('akuisisi_bpu');
      return exportToExcel(
        [
          { header: 'Kelompok', key: 'kelompok' },
          { header: 'Nama sesuai KTP', key: 'nama_ktp' },
          { header: 'NIK', key: 'nik' },
          { header: 'Jenis Kelamin', key: 'jenis_kelamin' },
          { header: 'Nama File', key: 'filename' },
          { header: 'Tanggal', key: 'created_at' },
        ],
        rows.map((d) => ({
          kelompok: d.kelompok,
          nama_ktp: d.nama_ktp,
          nik: maskNik(d.nik),
          jenis_kelamin: d.jenis_kelamin,
          filename: d.filename,
          created_at: d.created_at,
        })),
        'Data_BPU.xlsx',
      );
    });

  const handlePU = () =>
    run('pu', async () => {
      const rows = await fetchAkuisisi('akuisisi_pu');
      return exportToExcel(
        [
          { header: 'Kelompok', key: 'kelompok' },
          { header: 'Nama sesuai KTP', key: 'nama_ktp' },
          { header: 'NIK', key: 'nik' },
          { header: 'Jenis Kelamin', key: 'jenis_kelamin' },
          { header: 'Nama File', key: 'filename' },
          { header: 'Tanggal', key: 'created_at' },
        ],
        rows.map((d) => ({
          kelompok: d.kelompok,
          nama_ktp: d.nama_ktp,
          nik: maskNik(d.nik),
          jenis_kelamin: d.jenis_kelamin,
          filename: d.filename,
          created_at: d.created_at,
        })),
        'Data_PU.xlsx',
      );
    });

  const handleParticipants = () =>
    run('peserta', async () => {
      const rows = await fetchParticipants({ pageSize: 100000 });
      return exportToExcel(
        [
          { header: 'NIM', key: 'nim' },
          { header: 'Nama', key: 'nama' },
          { header: 'Fakultas', key: 'fakultas' },
          { header: 'Prodi', key: 'prodi' },
          { header: 'Kelompok', key: 'kelompok' },
        ],
        rows.data.map((d) => ({
          nim: d.nim,
          nama: d.nama,
          fakultas: d.fakultas,
          prodi: d.prodi,
          kelompok: d.kelompok,
        })),
        'Data_Peserta.xlsx',
      );
    });

  type ExportItem = {
    key: string;
    label: string;
    desc: string;
    filename: string;
    onClick: () => void;
  };

  const items: ExportItem[] = [
    { key: 'attendance', label: 'Data Absensi', desc: 'Absensi.xlsx', filename: 'Absensi.xlsx', onClick: handleAttendance },
    { key: 'seminar', label: 'Absensi Seminar', desc: 'Absensi_Seminar.xlsx', filename: 'Absensi_Seminar.xlsx', onClick: handleSeminar },
    { key: 'tiktok', label: 'Video Viralisasi', desc: 'Video_Viralisasi.xlsx', filename: 'Video_Viralisasi.xlsx', onClick: handleTikTok },
    { key: 'reports', label: 'Laporan', desc: 'Laporan.xlsx', filename: 'Laporan.xlsx', onClick: handleReports },
    { key: 'bpu', label: 'Data BPU', desc: 'Data_BPU.xlsx', filename: 'Data_BPU.xlsx', onClick: handleBPU },
    { key: 'pu', label: 'Data PU', desc: 'Data_PU.xlsx', filename: 'Data_PU.xlsx', onClick: handlePU },
    { key: 'peserta', label: 'Data Peserta', desc: 'Data_Peserta.xlsx', filename: 'Data_Peserta.xlsx', onClick: handleParticipants },
  ];

  return (
    <div>
      <h2 className="admin-title">Export Data (Excel .xlsx)</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Export seluruh data utama dalam format Excel. NIK pada data BPU/PU otomatis di-mask.
      </p>

      <div className="stats-grid">
        {items.map((it) => (
          <div key={it.key} className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 600, color: 'var(--bpjs-blue-dark)' }}>{it.label}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{it.desc}</div>
            <button className="btn btn-accent" style={{ marginTop: 'auto' }} onClick={it.onClick} disabled={exporting !== null}>
              {exporting === it.key ? <Spinner size={14} /> : 'Export Excel'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
