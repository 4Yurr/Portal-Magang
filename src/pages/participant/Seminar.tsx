import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useParticipantSearch } from '../../hooks/useParticipantSearch';
import { LocationPicker } from '../../components/participant/LocationPicker';
import { ParticipantSearch } from '../../components/ui/ParticipantSearch';
import { Spinner } from '../../components/ui/Spinner';
import type { GeoLocation } from '../../types';
import { getServerWib, submitSeminar, uploadAttendancePhoto } from '../../services/participantService';
import { wibDateString, wibTimeString, isValidPhoto } from '../../utils/constants';

export default function Seminar() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selected, select, clear } = useParticipantSearch();

  const [serverWibDate, setServerWibDate] = useState<Date | null>(null);
  const [kegiatan, setKegiatan] = useState('');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState<object | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const { date } = await getServerWib();
      setServerWibDate(date);
    };
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, []);

  const now = serverWibDate ?? new Date();

  const handlePhoto = (file: File | null) => {
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async () => {
    if (!selected) return showToast('Pilih peserta (NIM) terlebih dahulu', 'error');
    if (!kegiatan.trim()) return showToast('Nama seminar/kegiatan wajib diisi', 'error');
    if (!location) return showToast('Silakan klik Ambil Lokasi terlebih dahulu', 'error');
    if (!photo) return showToast('Foto selfie wajib diambil', 'error');

    setSubmitting(true);
    try {
      const res = await submitSeminar({
        participant_id: selected.nim,
        kegiatan: kegiatan.trim(),
        tanggal: wibDateString(now),
        jam: wibTimeString(now),
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        file: null,
      });

      if (res.success) {
        // Upload foto ke Google Drive (opsional; gagal tidak membatalkan absensi)
        const photoUp = await uploadAttendancePhoto({
          nim: selected.nim,
          tanggal: wibDateString(now),
          kegiatan: kegiatan.trim(),
          jenis: 'seminar',
          filename: photo.name,
          file: photo,
        });
        if (!photoUp.ok) {
          console.error('Drive photo upload failed:', photoUp.error);
          showToast('Absensi tercatat, tapi foto gagal diunggah ke Drive.', 'info');
        } else {
          showToast(res.message, 'success');
        }
      } else {
        showToast(res.message, 'error');
      }

      if (res.success) {
        clear();
        setKegiatan('');
        setLocation(null);
        handlePhoto(null);
        setResetKey({});
      }
    } catch (e) {
      console.error('Seminar submit error:', e);
      showToast('Terjadi kesalahan saat menyimpan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="form-section">
        <div className="page-header">
          <h2>ABSENSI SEMINAR</h2>
          <button className="btn-back" onClick={() => navigate('/')} type="button">
            ← Kembali
          </button>
        </div>

        <div className="info-banner">
          <span>🎓</span>
          <div>
            <strong>Kehadiran Seminar / Webinar Magang</strong>
            <br />
            <em>Waktu server: {wibDateString(now)} {wibTimeString(now)} WIB</em>
          </div>
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
          <legend>2. Detail Seminar</legend>
          <label>Nama Seminar / Kegiatan *</label>
          <input
            type="text"
            value={kegiatan}
            onChange={(e) => setKegiatan(e.target.value)}
            placeholder="Contoh: Seminar Kepemimpinan BPJS"
          />
        </fieldset>

        <fieldset>
          <legend>3. Lokasi Kegiatan</legend>
          <LocationPicker onLocationChange={setLocation} />
        </fieldset>

        <fieldset>
          <legend>4. Foto Kegiatan</legend>
          <label>Foto Selfie di Lokasi Seminar *</label>
          <div className="file-dropzone" onClick={() => document.getElementById('seminar-photo')?.click()}>
            <span className="dropzone-icon">📷</span>
            <div className="dropzone-label">Ambil Foto / Pilih Gambar</div>
            <div className="dropzone-sub">Foto selfie jelas di lokasi seminar</div>
            <input
              id="seminar-photo"
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && !isValidPhoto(f)) {
                  showToast('Format foto tidak valid', 'error');
                  e.target.value = '';
                  return;
                }
                handlePhoto(f);
              }}
            />
            {photoPreview && (
              <div className="file-name-preview">
                <img src={photoPreview} alt="Preview" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} />
                <div style={{ marginTop: 6 }}>{photo?.name}</div>
              </div>
            )}
          </div>
        </fieldset>

        <button className="btn btn-primary btn-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size={16} /> Menyimpan...
            </>
          ) : (
            'KIRIM ABSENSI SEMINAR'
          )}
        </button>
      </div>
    </div>
  );
}
