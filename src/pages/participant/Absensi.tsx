import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useParticipantSearch } from '../../hooks/useParticipantSearch';
import { LocationPicker } from '../../components/participant/LocationPicker';
import { ParticipantSearch } from '../../components/ui/ParticipantSearch';
import { Spinner } from '../../components/ui/Spinner';
import type { GeoLocation } from '../../types';
import { getServerWib, submitAttendance, uploadAttendancePhoto } from '../../services/participantService';
import { evalSessionWindow, wibDateString, wibTimeString, isValidPhoto, formatBytes } from '../../utils/constants';

export default function Absensi() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selected, select, clear } = useParticipantSearch();

  const [serverWibDate, setServerWibDate] = useState<Date | null>(null);
  const [lokasiKegiatan, setLokasiKegiatan] = useState('');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState<object | null>(null);
  const resetKeyRef = useRef(resetKey);

  // Track reset changes to clear the selector
  if (resetKeyRef.current !== resetKey) {
    resetKeyRef.current = resetKey;
  }

  const refreshServerTime = useCallback(async () => {
    const { date } = await getServerWib();
    setServerWibDate(date);
  }, []);

  useEffect(() => {
    refreshServerTime();
    const t = setInterval(refreshServerTime, 30000);
    return () => clearInterval(t);
  }, [refreshServerTime]);

  const now = serverWibDate ?? new Date();
  const pagi = evalSessionWindow(now, 'PAGI');
  const sore = evalSessionWindow(now, 'SORE');
  const activeSession = pagi.isOpen ? 'PAGI' : sore.isOpen ? 'SORE' : null;

  const handlePhoto = (file: File | null) => {
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async () => {
    if (!selected) return showToast('Pilih peserta (NIM) terlebih dahulu', 'error');
    if (!lokasiKegiatan.trim()) return showToast('Lokasi kegiatan wajib diisi', 'error');
    if (!activeSession) {
      return showToast('Absensi saat ini belum dibuka. Sesi Pagi 08:00-09:30 atau Sesi Sore 15:30-17:00 WIB.', 'error');
    }
    if (!location) return showToast('Silakan klik Ambil Lokasi terlebih dahulu', 'error');
    if (!photo) return showToast('Foto kegiatan wajib diambil', 'error');

    const session = activeSession;
    setSubmitting(true);
    try {
      const res = await submitAttendance({
        participant_id: selected.nim,
        tanggal: wibDateString(now),
        session: session as 'PAGI' | 'SORE',
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
          session: session as 'PAGI' | 'SORE',
          jenis: 'biasa',
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
        setLokasiKegiatan('');
        setLocation(null);
        handlePhoto(null);
        setResetKey({});
      }
    } catch (e) {
      console.error('Absensi submit error:', e);
      showToast('Terjadi kesalahan saat menyimpan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="form-section">
        <div className="page-header">
          <h2>KEHADIRAN BIASA</h2>
          <button className="btn-back" onClick={() => navigate('/')} type="button">
            ← Kembali
          </button>
        </div>

        <div className="info-banner">
          <span>⏰</span>
          <div>
            <strong>Jadwal Absensi:</strong> Sesi Pagi (08:00 – 09:30 WIB) & Sesi Sore (15:30 – 17:00 WIB)
            <br />
            <em>Waktu server: {wibDateString(now)} {wibTimeString(now)} WIB</em>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`badge ${pagi.isOpen ? 'badge-success' : 'badge-neutral'}`}>
            {pagi.isOpen ? 'Absensi Pagi Dibuka' : 'Absensi Pagi Ditutup'}
          </span>
          <span className={`badge ${sore.isOpen ? 'badge-success' : 'badge-neutral'}`}>
            {sore.isOpen ? 'Absensi Sore Dibuka' : 'Absensi Sore Ditutup'}
          </span>
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
          <legend>2. Lokasi Kegiatan</legend>
          <label>Lokasi Kegiatan *</label>
          <input
            type="text"
            value={lokasiKegiatan}
            onChange={(e) => setLokasiKegiatan(e.target.value)}
            placeholder="Contoh: Kantor Regional BPJS Ketenagakerjaan"
          />
          <div style={{ marginTop: 10 }}>
            <LocationPicker onLocationChange={setLocation} />
          </div>
        </fieldset>

        <fieldset>
          <legend>3. Foto Kegiatan</legend>
          <label>Foto Selfie di Lokasi *</label>
          <div className="file-dropzone" onClick={() => document.getElementById('abs-photo')?.click()}>
            <span className="dropzone-icon">📷</span>
            <div className="dropzone-label">Ambil Foto / Pilih Gambar</div>
            <div className="dropzone-sub">Format JPEG/PNG, selfie di lokasi kegiatan</div>
            <input
              id="abs-photo"
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
                <div style={{ marginTop: 6 }}>
                  {photo?.name} ({formatBytes(photo?.size ?? 0)})
                </div>
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
            'KIRIM ABSENSI'
          )}
        </button>
      </div>
    </div>
  );
}
