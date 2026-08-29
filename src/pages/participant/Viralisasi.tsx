import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { submitTikTok } from '../../services/participantService';
import { isValidTikTokUrl } from '../../utils/constants';

const KELOMPOK = Array.from({ length: 10 }, (_, i) => String(i + 1));

export default function Viralisasi() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [kelompok, setKelompok] = useState('');
  const [pengirim, setPengirim] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!kelompok) return showToast('Pilih nomor kelompok', 'error');
    if (!pengirim.trim()) return showToast('Nama pengirim wajib diisi', 'error');
    if (!url.trim()) return showToast('Tautan TikTok wajib diisi', 'error');
    if (!isValidTikTokUrl(url)) {
      return showToast('Link TikTok tidak valid. Gunakan domain tiktok.com yang resmi.', 'error');
    }

    setSubmitting(true);
    const res = await submitTikTok({ kelompok, pengirim: pengirim.trim(), url: url.trim() });
    setSubmitting(false);

    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      setKelompok('');
      setPengirim('');
      setUrl('');
    }
  };

  return (
    <div className="page">
      <div className="form-section">
        <div className="page-header">
          <h2>Upload Video Viralisasi</h2>
          <button className="btn-back" onClick={() => navigate('/')} type="button">
            ← Kembali
          </button>
        </div>

        <fieldset>
          <legend>Informasi Video Viralisasi</legend>
          <label>Nomor Kelompok *</label>
          <select value={kelompok} onChange={(e) => setKelompok(e.target.value)}>
            <option value="">-- Pilih Kelompok --</option>
            {KELOMPOK.map((k) => (
              <option key={k} value={k}>
                Kelompok {k}
              </option>
            ))}
          </select>

          <label>Nama Pengirim *</label>
          <input
            type="text"
            value={pengirim}
            onChange={(e) => setPengirim(e.target.value)}
            placeholder="Nama lengkap anggota pengirim"
          />

          <label>Tautan Video TikTok *</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://vt.tiktok.com/… atau https://www.tiktok.com/@…"
          />
          <p className="helper-text">
            Masukkan tautan video TikTok yang valid (www.tiktok.com, vt.tiktok.com, vm.tiktok.com, m.tiktok.com).
          </p>
        </fieldset>

        <button className="btn btn-primary btn-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size={16} /> Menyimpan...
            </>
          ) : (
            'SUBMIT LINK TIKTOK'
          )}
        </button>
      </div>
    </div>
  );
}
