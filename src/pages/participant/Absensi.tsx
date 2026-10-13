import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useParticipantSearch } from '../../hooks/useParticipantSearch';
import { LocationPicker } from '../../components/participant/LocationPicker';
import { ParticipantSearch } from '../../components/ui/ParticipantSearch';
import { Spinner } from '../../components/ui/Spinner';
import { AppIcon } from '../../components/ui/AppIcon';
import type { GeoLocation } from '../../types';
import { fetchAttendanceSettings } from '../../services/adminService';
import { getServerWib, submitAttendance } from '../../services/participantService';
import { evalTimeWindowByConfig, wibDateString, wibTimeString } from '../../utils/constants';

export default function Absensi() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selected, select, clear } = useParticipantSearch();

  const [serverWibDate, setServerWibDate] = useState<Date | null>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [attendanceWindow, setAttendanceWindow] = useState({ open: '08:00:00', close: '17:00:00' });
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

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

  const handleSubmit = async () => {
    if (!selected) return showToast('Pilih peserta (NIM) terlebih dahulu', 'error');
    if (!attendanceStatus.isOpen) {
      return showToast(`Absensi dibuka pukul ${attendanceWindow.open.slice(0, 5)} sampai ${attendanceWindow.close.slice(0, 5)} WIB.`, 'error');
    }
    if (!location) return showToast('Silakan klik Ambil Lokasi terlebih dahulu', 'error');

    setSubmitting(true);
    try {
      const res = await submitAttendance({
        participant_id: selected.nim,
        tanggal: wibDateString(now),
        jam: wibTimeString(now),
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      });

      showToast(res.message, res.success ? 'success' : 'error');

      if (res.success) {
        clear();
        setLocation(null);
        setResetKey((key) => key + 1);
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
      <form
        className="form-section attendance-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="page-header">
          <h2>KEHADIRAN BIASA</h2>
          <button className="btn-back" onClick={() => navigate('/')} type="button">
            ← Kembali
          </button>
        </div>

        <p className="attendance-description">
          Isi data peserta dan konfirmasi lokasi untuk mencatat kehadiran harian.
        </p>

        <div className="info-banner">
          <AppIcon name="attendance" size={18} />
          <div className="attendance-overview">
            <div className="attendance-overview-row">
              <strong>Jadwal absensi</strong>
              <span className={`badge ${attendanceStatus.isOpen ? 'badge-success' : 'badge-neutral'}`}>
                {attendanceStatus.isOpen ? 'Dibuka' : 'Ditutup'}
              </span>
            </div>
            <div>{attendanceWindow.open.slice(0, 5)}–{attendanceWindow.close.slice(0, 5)} WIB</div>
            <small>Waktu server: {wibDateString(now)} {wibTimeString(now)} WIB</small>
          </div>
        </div>

        <fieldset>
          <legend>1. Identitas Peserta</legend>
          <p className="attendance-step-help">Cari dan pilih nama peserta berdasarkan NIM.</p>
          <label>Cari Peserta (NIM) <span aria-hidden="true">*</span></label>
          <ParticipantSearch
            clearKey={resetKey}
            onSelect={select}
            onClear={clear}
            placeholder="Ketik NIM peserta (contoh: 23...)"
          />
          {selected && (
            <div className="attendance-selected-participant">
              <span>Peserta terpilih</span>
              <strong>{selected.nama}</strong>
              <small>NIM {selected.nim}</small>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>2. Konfirmasi Lokasi</legend>
          <p className="attendance-step-help">Ambil lokasi GPS agar koordinat ikut tercatat bersama absensi.</p>
          <LocationPicker onLocationChange={setLocation} />
        </fieldset>

        <div className="attendance-submit-area">
          <p className="attendance-submit-hint">
            {!attendanceStatus.isOpen
              ? `Absensi dapat dikirim pukul ${attendanceWindow.open.slice(0, 5)}–${attendanceWindow.close.slice(0, 5)} WIB.`
              : !selected
                ? 'Pilih peserta untuk melanjutkan.'
                : !location
                  ? 'Ambil lokasi GPS untuk melanjutkan.'
                  : 'Data siap dikirim dan dicatat.'}
          </p>
          <button
            className="btn btn-primary btn-submit"
            type="submit"
            disabled={submitting || !selected || !location || !attendanceStatus.isOpen}
          >
          {submitting ? (
            <>
              <Spinner size={16} /> Menyimpan...
            </>
          ) : (
            attendanceStatus.isOpen ? 'KIRIM ABSENSI' : 'ABSENSI DITUTUP'
          )}
          </button>
        </div>
      </form>
    </div>
  );
}
