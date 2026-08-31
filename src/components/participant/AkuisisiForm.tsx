// Shared form for Akuisisi Data BPU / PU.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { uploadFile, submitAkuisisi, uploadAkuisisiFileToDrive } from '../../services/participantService';
import { isValidNIK, MAX_REPORT_SIZE } from '../../utils/constants';

const KELOMPOK = Array.from({ length: 10 }, (_, i) => String(i + 1));

type Props = {
  type: 'BPU' | 'PU';
};

export function AkuisisiForm({ type }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const bucket = type === 'BPU' ? 'bpu' : 'pu';

  const [kelompok, setKelompok] = useState('');
  const [namaKtp, setNamaKtp] = useState('');
  const [nik, setNik] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (f: File | null) => {
    setFileError(null);
    if (!f) {
      setFile(null);
      setFileLabel(null);
      return;
    }
    if (f.size > MAX_REPORT_SIZE) {
      setFile(null);
      setFileLabel(null);
      setFileError('Ukuran file maksimal 10 MB.');
      return;
    }
    setFile(f);
    setFileLabel(f.name);
  };

  const handleSubmit = async () => {
    if (!kelompok) return showToast('Pilih kelompok magang', 'error');
    if (!namaKtp.trim()) return showToast('Nama lengkap sesuai KTP wajib diisi', 'error');
    if (!isValidNIK(nik)) return showToast('NIK harus 16 digit angka', 'error');
    if (!jenisKelamin) return showToast('Pilih jenis kelamin', 'error');
    if (!file) return showToast('File wajib diunggah', 'error');

    setSubmitting(true);
    try {
      const ext = (file.name.includes('.') ? file.name.split('.').pop() : 'pdf') ?? 'pdf';
      const filename = `${type}_${kelompok}_${Date.now()}.${ext}`;
      const up = await uploadFile(bucket, filename, file);
      if (!up.path) {
        showToast('Gagal mengunggah file: ' + (up.error ?? 'unknown'), 'error');
        setSubmitting(false);
        return;
      }

      const res = await submitAkuisisi(type === 'BPU' ? 'akuisisi_bpu' : 'akuisisi_pu', {
        kelompok,
        nama_ktp: namaKtp.trim(),
        nik: nik.trim(),
        jenis_kelamin: jenisKelamin as 'Laki-laki' | 'Perempuan',
        file: {
          bucket,
          path: filename,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        },
      });

      if (res.success && res.id) {
        const driveUp = await uploadAkuisisiFileToDrive({
          id: res.id,
          kelompok,
          jenis: type.toLowerCase() as 'bpu' | 'pu',
          filename: file.name,
          file,
        });

        if (!driveUp.ok) {
          console.error('Google Drive upload failed:', driveUp.error);
          showToast('Data disimpan, tapi gagal mengunggah ke Google Drive.', 'info');
        } else {
          showToast('Data dan file Google Drive berhasil disimpan.', 'success');
        }

        setKelompok('');
        setNamaKtp('');
        setNik('');
        setJenisKelamin('');
        handleFile(null);
      } else {
        showToast(res.message || 'Gagal menyimpan data.', 'error');
      }
    } catch (e) {
      console.error(`${type} submit error:`, e);
      showToast('Terjadi kesalahan saat menyimpan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="form-section">
        <div className="page-header">
          <h2>Akuisisi Data {type}</h2>
          <button className="btn-back" onClick={() => navigate('/')} type="button">
            ← Kembali
          </button>
        </div>

        <div className="info-banner">
          <span>{type === 'BPU' ? '👥' : '🏢'}</span>
          <div>
            <strong>{type === 'BPU' ? 'Bukan Penerima Upah (BPU)' : 'Penerima Upah (PU)'}</strong>
            <br />
            Isi data calon peserta {type} sesuai KTP dan unggah file pendukung.
          </div>
        </div>

        <fieldset>
          <legend>Kelompok</legend>
          <label>Pilih Kelompok *</label>
          <select value={kelompok} onChange={(e) => setKelompok(e.target.value)}>
            <option value="">-- Pilih Kelompok --</option>
            {KELOMPOK.map((k) => (
              <option key={k} value={k}>
                Kelompok {k}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset>
          <legend>Identitas Calon Peserta {type}</legend>
          <label>Nama Lengkap Sesuai KTP *</label>
          <input
            type="text"
            value={namaKtp}
            onChange={(e) => setNamaKtp(e.target.value)}
            placeholder="Nama lengkap sesuai KTP"
          />

          <label>Nomor Induk Kependudukan (NIK) *</label>
          <input
            type="text"
            value={nik}
            maxLength={16}
            inputMode="numeric"
            onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
            placeholder="16 digit angka NIK"
          />

          <label>Jenis Kelamin *</label>
          <select value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)}>
            <option value="">-- Pilih Jenis Kelamin --</option>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>

          <label>Upload File {type} *</label>
          <div className="file-dropzone" onClick={() => document.getElementById('akuisisi-file')?.click()}>
            <span className="dropzone-icon">📄</span>
            <div className="dropzone-label">Pilih File {type} (PDF / Foto)</div>
            <div className="dropzone-sub">Dokumen formulir atau foto bukti {type} (maks 10 MB)</div>
            <input
              id="akuisisi-file"
              type="file"
              accept=".pdf,image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {fileLabel && <div className="file-name-preview">📎 {fileLabel}</div>}
          </div>
          {fileError && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>{fileError}</p>
          )}
        </fieldset>

        <button className="btn btn-primary btn-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size={16} /> Menyimpan...
            </>
          ) : (
            `SUBMIT DATA ${type}`
          )}
        </button>
      </div>
    </div>
  );
}
