import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useParticipantSearch } from '../../hooks/useParticipantSearch';
import { LocationPicker } from '../../components/participant/LocationPicker';
import { ParticipantSearch } from '../../components/ui/ParticipantSearch';
import { Spinner } from '../../components/ui/Spinner';
import { AppIcon } from '../../components/ui/AppIcon';
import type { GeoLocation } from '../../types';
import { fetchAttendanceSettings } from '../../services/adminService';
import { getServerWib, submitAttendance, uploadAttendancePhoto } from '../../services/participantService';
import { evalTimeWindowByConfig, wibDateString, wibTimeString, isValidPhoto, formatBytes } from '../../utils/constants';

export default function Absensi() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selected, select, clear } = useParticipantSearch();

  const [serverWibDate, setServerWibDate] = useState<Date | null>(null);
  const [lokasiKegiatan, setLokasiKegiatan] = useState('');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [attendanceWindow, setAttendanceWindow] = useState({ open: '08:00:00', close: '17:00:00' });
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

    const window = await fetchAttendanceSettings();
    if (window) {
      setAttendanceWindow({ open: window.open_time, close: window.close_time });
    }
  }, []);

  useEffect(() => {
    refreshServerTime();
    const t = setInterval(refreshServerTime, 30000);
    return () => clearInterval(t);
  }, [refreshServerTime]);

  const now = serverWibDate ?? new Date();
  const attendanceStatus = evalTimeWindowByConfig(now, attendanceWindow.open, attendanceWindow.close);

  const handlePhoto = (file: File | null) => {
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async () => {
    if (!selected) return showToast('Pilih peserta (NIM) terlebih dahulu', 'error');
    if (!lokasiKegiatan.trim()) return showToast('Lokasi kegiatan wajib diisi', 'error');
    if (!attendanceStatus.isOpen) {
      return showToast(`Absensi dibuka pukul ${attendanceWindow.open.slice(0, 5)} sampai ${attendanceWindow.close.slice(0, 5)} WIB.`, 'error');
    }
    if (!location) return showToast('Silakan klik Ambil Lokasi terlebih dahulu', 'error');
    if (!photo) return showToast('Foto kegiatan wajib dipilih', 'error');

    setSubmitting(true);
    try {
      const fileExtension = photo.name.includes('.') ? photo.name.split('.').pop()?.toLowerCase() : 'jpg';
      const userId = selected.nim.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const newFileName = `${userId}_${wibDateString(now)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExtension || 'jpg'}`;
      const photoUp = await uploadAttendancePhoto({
        nim: selected.nim,
        tanggal: wibDateString(now),
        jenis: 'biasa',
        filename: newFileName,
        file: photo,
      });
      if (!photoUp.url) {
        showToast(`Foto gagal diunggah. Absensi belum disimpan: ${photoUp.error ?? 'unknown'}`, 'error');
        return;
      }

      const res = await submitAttendance({
        participant_id: selected.nim,
        tanggal: wibDateString(now),
        jam: wibTimeString(now),
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        photoUrl: photoUp.url,
        photoFilename: newFileName,
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
          <AppIcon name="attendance" size={18} />
          <div>
            <strong>Jadwal Absensi:</strong> {attendanceWindow.open.slice(0, 5)} – {attendanceWindow.close.slice(0, 5)} WIB
            <br />
            <em>Waktu server: {wibDateString(now)} {wibTimeString(now)} WIB</em>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`badge ${attendanceStatus.isOpen ? 'badge-success' : 'badge-neutral'}`}>
            {attendanceStatus.isOpen ? 'Absensi Dibuka' : 'Absensi Ditutup'}
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
          <label className="file-dropzone" htmlFor="abs-photo">
            <AppIcon name="camera" className="dropzone-icon" size={30} />
            <div className="dropzone-label">Pilih Foto</div>
            <div className="dropzone-sub">Format JPEG/PNG, maksimal sesuai ketentuan foto</div>
            <input
              id="abs-photo"
              type="file"
              accept="image/*"
              className="file-input-visually-hidden"
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
          </label>
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
