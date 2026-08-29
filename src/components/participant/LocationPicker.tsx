// Location picker using browser Geolocation API. No radius/distance validation.

import { useEffect } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { GeoLocation } from '../../types';

type Props = {
  onLocationChange: (loc: GeoLocation | null) => void;
};

export function LocationPicker({ onLocationChange }: Props) {
  const { location, locating, error, status, getLocation, reset } = useGeolocation();

  // Sync location up to parent whenever it changes
  useEffect(() => {
    onLocationChange(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <div>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => {
          if (location) {
            reset();
            return;
          }
          getLocation();
        }}
        disabled={locating}
      >
        {locating ? 'Mengambil lokasi...' : location ? '📍 Lokasi Diambil (Hapus)' : '📍 Ambil Lokasi Saya'}
      </button>

      {location && (
        <div style={{ marginTop: 10 }}>
          <p className="location-status success">
            ✅ Lat: {location.latitude.toFixed(5)} | Lon: {location.longitude.toFixed(5)} | Akurasi ±
            {Math.round(location.accuracy)} m
          </p>
          <a
            className="btn btn-accent"
            style={{ fontSize: '0.85rem', padding: '8px 14px', marginTop: 6 }}
            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka Google Maps ↗
          </a>
        </div>
      )}

      {!location && status && <p className={`location-status ${error ? 'error' : ''}`}>{status}</p>}
    </div>
  );
}
