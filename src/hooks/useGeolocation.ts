// Geolocation hook using the browser Geolocation API.

import { useState } from 'react';
import type { GeoLocation } from '../types';

export type GeoError = {
  code: number | null;
  message: string;
};

const ERROR_MESSAGES: Record<number, string> = {
  1: 'Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk melanjutkan.',
  2: 'Posisi tidak tersedia. Pastikan GPS aktif dan coba lagi.',
  3: 'Waktu pengambilan lokasi habis. Coba lagi.',
};

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<GeoError | null>(null);
  const [status, setStatus] = useState('Lokasi belum diambil');

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError({ code: null, message: 'Geolocation tidak didukung pada browser ini.' });
      setStatus('Geolocation tidak didukung');
      return;
    }
    setLocating(true);
    setError(null);
    setStatus('Mengambil lokasi GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation({ latitude, longitude, accuracy });
        setLocating(false);
        setStatus(
          `Lokasi diambil: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (Akurasi ±${Math.round(
            accuracy,
          )} m)`,
        );
      },
      (err) => {
        const message = ERROR_MESSAGES[err.code] || err.message || 'Gagal mengambil lokasi.';
        setError({ code: err.code, message });
        setLocating(false);
        setStatus(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const reset = () => {
    setLocation(null);
    setError(null);
    setLocating(false);
    setStatus('Lokasi belum diambil');
  };

  return { location, locating, error, status, getLocation, reset };
}
