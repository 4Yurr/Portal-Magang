import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useParticipantSearch } from '../../hooks/useParticipantSearch';
import { ParticipantSearch } from '../../components/ui/ParticipantSearch';
import { Spinner } from '../../components/ui/Spinner';
import { uploadFile, submitReport } from '../../services/participantService';
import { isValidPdf, MAX_REPORT_SIZE } from '../../utils/constants';

export default function Laporan() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selected, select, clear } = useParticipantSearch();

  const [judul, setJudul] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState<object | null>(null);

  const handleFile = (f: File | null) => {
    setFileError(null);
    if (!f) {
      setFile(null);
      setFileLabel(null);
      return;
    }
    // Frontend validation: HANYA PDF, maks 10MB
    if (!isValidPdf(f)) {
      setFile(null);
      setFileLabel(null);
      setFileError('File laporan harus berformat PDF.');
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
    if (!selected) return showToast('Pilih peserta (NIM) terlebih dahulu', 'error');
    if (!judul.trim()) return showToast('Judul laporan wajib diisi', 'error');
    if (!file) return showToast('File laporan PDF wajib dipilih', 'error');
    if (!isValidPdf(file) || file.size > MAX_REPORT_SIZE) {
      setFileError('Validasi gagal: file harus PDF maksimal 10 MB.');
      return;
    }

    setSubmitting(true);
    try {
      const ts = Date.now();
      const filename = `${selected.nim}_${ts}.pdf`;
      const up = await uploadFile('reports', filename, file);
      if (!up.path) {
        showToast('Gagal mengunggah file: ' + (up.error ?? 'unknown'), 'error');
        setSubmitting(false);
        return;
      }

      const res = await submitReport({
        participant_id: selected.nim,
        judul: judul.trim(),
        file: {
          bucket: 'reports',
          path: filename,
          filename: file.name,
          mimeType: file.type || 'application/pdf',
          size: file.size,
        },
      });

      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) {
        clear();
        setJudul('');
        handleFile(null);
        setResetKey({});
      }
    } catch (e) {
      console.error('Laporan submit error:', e);
      showToast('Terjadi kesalahan saat menyimpan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="form-section">
        <div className="page-header">
          <h2>Upload Laporan</h2>
          <button className="btn-back" onClick={() => navigate('/')} type="button">
            ← Kembali
          </button>
        </div>

        <fieldset>
          <legend>1. Identitas Peserta</legend>
          <label>Cari Peserta (NIM) *</label>
          <ParticipantSearch
            key={resetKey ? String(resetKey) : 'initial'}
            onSelect={select}
            placeholder="Ketik NIM peserta (contoh: 23...)"
          />
          <label>Nama Lengkap</label>
          <input
            type="text"
            readOnly
            value={selected?.nama ?? ''}
            placeholder="Nama otomatis muncul setelah memilih NIM"
          />
        </fieldset>

        <fieldset>
          <legend>2. Dokumen Laporan</legend>
          <label>Judul Laporan *</label>
          <input
            type="text"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Laporan Akhir Magang Divisi Pelayanan"
          />

          <label>File Laporan (PDF, maks 10 MB) *</label>
          <div className="file-dropzone" onClick={() => document.getElementById('laporan-file')?.click()}>
            <span className="dropzone-icon">📄</span>
            <div className="dropzone-label">Pilih Dokumen PDF</div>
            <div className="dropzone-sub">Dokumen PDF (maksimal 10 MB) — hanya PDF yang diterima</div>
            <input
              id="laporan-file"
              type="file"
              accept=".pdf,application/pdf"
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
              <Spinner size={16} /> Mengunggah...
            </>
          ) : (
            'SUBMIT LAPORAN'
          )}
        </button>
      </div>
    </div>
  );
}
