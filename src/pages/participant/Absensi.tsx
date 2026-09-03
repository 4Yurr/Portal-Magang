import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useParticipantSearch } from '../../hooks/useParticipantSearch';
import { LocationPicker } from '../../components/participant/LocationPicker';
import { ParticipantSearch } from '../../components/ui/ParticipantSearch';
import { Spinner } from '../../components/ui/Spinner';
import type { GeoLocation } from '../../types';
import { fetchAttendanceSettings } from '../../services/adminService';
import { getServerWib, submitAttendance, uploadFile } from '../../services/participantService';
import { evalSessionWindowByConfig, wibDateString, wibTimeString, isValidPhoto, formatBytes } from '../../utils/constants';

export default function Absensi() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selected, select, clear } = useParticipantSearch();

  const [serverWibDate, setServerWibDate] = useState<Date | null>(null);
  const [lokasiKegiatan, setLokasiKegiatan] = useState('');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [attendanceSettings, setAttendanceSettings] = useState<Record<'PAGI' | 'SORE', { start: string; end: string; isActive: boolean }>>({
    PAGI: { start: '08:00:00', end: '09:30:00', isActive: true },
    SORE: { start: '15:30:00', end: '17:00:00', isActive: true },
  });
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

    const settings = await fetchAttendanceSettings();
    const mapped = {
      PAGI: { start: '08:00:00', end: '09:30:00', isActive: true },
      SORE: { start: '15:30:00', end: '17:00:00', isActive: true },
    } as Record<'PAGI' | 'SORE', { start: string; end: string; isActive: boolean }>;

    settings.forEach((cfg) => {
      const session = cfg.session as 'PAGI' | 'SORE';
      mapped[session] = {
        start: cfg.start_time,
        end: cfg.end_time,
        isActive: cfg.is_active,
      };
    });

    setAttendanceSettings(mapped);
  }, []);

  useEffect(() => {
    refreshServerTime();
    const t = setInterval(refreshServerTime, 30000);
    return () => clearInterval(t);
  }, [refreshServerTime]);

  const now = serverWibDate ?? new Date();
  const pagi = evalSessionWindowByConfig(now, attendanceSettings.PAGI.start, attendanceSettings.PAGI.end);
  const sore = evalSessionWindowByConfig(now, attendanceSettings.SORE.start, attendanceSettings.SORE.end);
  const activeSession = pagi.isOpen && attendanceSettings.PAGI.isActive ? 'PAGI' : sore.isOpen && attendanceSettings.SORE.isActive ? 'SORE' : null;

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
    if (!photo) return showToast('Foto kegiatan wajib dipilih', 'error');

    const session = activeSession;
    setSubmitting(true);
    try {
      const extension = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${selected.nim}_${wibDateString(now)}_${session}_${Date.now()}.${extension}`;
      const photoUp = await uploadFile('attendance-photos', filename, photo);
      if (!photoUp.path) {
        showToast('Gagal mengunggah foto: ' + (photoUp.error ?? 'unknown'), 'error');
        return;
      }

      const res = await submitAttendance({
        participant_id: selected.nim,
        tanggal: wibDateString(now),
        session: session as 'PAGI' | 'SORE',
        jam: wibTimeString(now),
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        file: {
          bucket: 'attendance-photos',
          path: photoUp.path,
          filename: photo.name,
          mimeType: photo.type || 'image/jpeg',
          size: photo.size,
        },
      });

      showToast(res.message, res.success ? 'success' : 'error');

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
            <strong>Jadwal Absensi:</strong> Sesi Pagi ({attendanceSettings.PAGI.start.slice(0, 5)} – {attendanceSettings.PAGI.end.slice(0, 5)} WIB) & Sesi Sore ({attendanceSettings.SORE.start.slice(0, 5)} – {attendanceSettings.SORE.end.slice(0, 5)} WIB)
            <br />
            <em>Waktu server: {wibDateString(now)} {wibTimeString(now)} WIB</em>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`badge ${pagi.isOpen && attendanceSettings.PAGI.isActive ? 'badge-success' : 'badge-neutral'}`}>
            {pagi.isOpen && attendanceSettings.PAGI.isActive ? 'Absensi Pagi Dibuka' : 'Absensi Pagi Ditutup'}
          </span>
          <span className={`badge ${sore.isOpen && attendanceSettings.SORE.isActive ? 'badge-success' : 'badge-neutral'}`}>
            {sore.isOpen && attendanceSettings.SORE.isActive ? 'Absensi Sore Dibuka' : 'Absensi Sore Ditutup'}
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
          <label>Foto Kegiatan *</label>
          <div className="file-dropzone" onClick={() => document.getElementById('abs-photo')?.click()}>
            <span className="dropzone-icon">🖼️</span>
            <div className="dropzone-label">Pilih Foto</div>
            <div className="dropzone-sub">Format JPEG/PNG, maksimal sesuai ketentuan foto</div>
            <input
              id="abs-photo"
              type="file"
              accept="image/*"
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
