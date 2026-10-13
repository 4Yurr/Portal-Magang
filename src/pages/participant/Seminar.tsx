import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useParticipantSearch } from '../../hooks/useParticipantSearch';
import { LocationPicker } from '../../components/participant/LocationPicker';
import { ParticipantSearch } from '../../components/ui/ParticipantSearch';
import { Spinner } from '../../components/ui/Spinner';
import { AppIcon } from '../../components/ui/AppIcon';
import type { GeoLocation } from '../../types';
import { getServerWib, submitSeminar } from '../../services/participantService';
import { wibDateString, wibTimeString } from '../../utils/constants';

export default function Seminar() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selected, select, clear } = useParticipantSearch();

  const [serverWibDate, setServerWibDate] = useState<Date | null>(null);
  const [kegiatan, setKegiatan] = useState('');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

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

  const handleSubmit = async () => {
    if (!selected) return showToast('Pilih peserta (NIM) terlebih dahulu', 'error');
    if (!kegiatan.trim()) return showToast('Nama seminar/kegiatan wajib diisi', 'error');
    if (!location) return showToast('Silakan klik Ambil Lokasi terlebih dahulu', 'error');

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
      });

      showToast(res.message, res.success ? 'success' : 'error');

      if (res.success) {
        clear();
        setKegiatan('');
        setLocation(null);
        setResetKey((key) => key + 1);
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
      <form
        className="form-section attendance-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="page-header">
          <h2>ABSENSI SEMINAR</h2>
          <button className="btn-back" onClick={() => navigate('/')} type="button">
            ← Kembali
          </button>
        </div>

        <p className="attendance-description">
          Catat kehadiran seminar dengan memilih peserta, mengisi nama kegiatan, dan mengonfirmasi lokasi.
        </p>

        <div className="info-banner">
          <AppIcon name="seminar" size={18} />
          <div>
            <strong>Kehadiran Seminar / Webinar Magang</strong>
            <small className="attendance-server-time">Waktu server: {wibDateString(now)} {wibTimeString(now)} WIB</small>
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
          <legend>2. Detail Seminar</legend>
          <p className="attendance-step-help">Tuliskan nama seminar atau webinar yang sedang diikuti.</p>
          <label>Nama Seminar / Kegiatan <span aria-hidden="true">*</span></label>
          <input
            type="text"
            required
            value={kegiatan}
            onChange={(e) => setKegiatan(e.target.value)}
            placeholder="Contoh: Seminar Kepemimpinan BPJS"
          />
        </fieldset>

        <fieldset>
          <legend>3. Konfirmasi Lokasi</legend>
          <p className="attendance-step-help">Ambil lokasi GPS agar koordinat ikut tercatat bersama absensi.</p>
          <LocationPicker onLocationChange={setLocation} />
        </fieldset>

        <div className="attendance-submit-area">
          <p className="attendance-submit-hint">
            {!selected
              ? 'Pilih peserta untuk melanjutkan.'
              : !kegiatan.trim()
                ? 'Isi nama seminar atau kegiatan untuk melanjutkan.'
                : !location
                  ? 'Ambil lokasi GPS untuk melanjutkan.'
                  : 'Data siap dikirim dan dicatat.'}
          </p>
          <button
            className="btn btn-primary btn-submit"
            type="submit"
            disabled={submitting || !selected || !kegiatan.trim() || !location}
          >
          {submitting ? (
            <>
              <Spinner size={16} /> Menyimpan...
            </>
          ) : (
            'KIRIM ABSENSI SEMINAR'
          )}
          </button>
        </div>
      </form>
    </div>
  );
}
