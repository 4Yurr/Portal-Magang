// Services for the participant portal (public/anonymous side).

import { supabase } from '../lib/supabaseClient';
import type { MaterialRow, GeoLocation } from '../types';

// ---- Participant search (debounced by caller) ----
export async function searchParticipants(query: string): Promise<
  { nim: string; nama: string; fakultas: string; prodi: string; kelompok: string }[]
> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from('participants')
    .select('nim, nama, fakultas, prodi, kelompok')
    .or(`nim.ilike.${trimmed}%,nim.ilike.%${trimmed}%,nama.ilike.%${trimmed}%`)
    .eq('is_active', true)
    .order('nim', { ascending: true })
    .limit(20);

  if (error) {
    console.error('searchParticipants error:', error);
    return [];
  }
  return data ?? [];
}

export async function getParticipant(nim: string) {
  const { data, error } = await supabase
    .from('participants')
    .select('nim, nama, fakultas, prodi, kelompok')
    .eq('nim', nim)
    .single();
  if (error) return null;
  return data;
}

// ---- Server time (WIB) ----
// ---- Rest of file ---
// ============================================================================
// UPLOAD FOTO ABSENSI KE GOOGLE DRIVE (via Supabase Edge Function)
// ============================================================================
export async function uploadAttendancePhoto(opts: {
  nim: string;
  tanggal?: string;
  kegiatan?: string;
  jenis: 'biasa' | 'seminar' | 'laporan';
  filename: string;
  file: File;
}): Promise<{ ok: boolean; url: string | null; error: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const qs = new URLSearchParams({
      nim: opts.nim,
      jenis: opts.jenis,
      filename: opts.filename,
    });
    if (opts.tanggal) qs.set('tanggal', opts.tanggal);
    if (opts.kegiatan) qs.set('kegiatan', opts.kegiatan);
    if (opts.file.type) qs.set('type', opts.file.type);
    const res = await fetch(
      `${supabaseUrl}/functions/v1/upload-attendance?${qs.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': opts.file.type || 'image/jpeg',
          Authorization: `Bearer ${anonKey}`,
        },
        body: opts.file,
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, url: null, error: data.error || `HTTP ${res.status}` };
    }
    if (typeof data.photoUrl !== 'string' || !data.photoUrl.startsWith('https://drive.google.com/')) {
      return { ok: false, url: null, error: 'Google Drive tidak mengembalikan URL file.' };
    }
    return { ok: true, url: data.photoUrl, error: '' };
  } catch (e) {
    return { ok: false, url: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function uploadAkuisisiFileToDrive(opts: {
  id: string;
  kelompok: string;
  jenis: 'bpu' | 'pu';
  filename: string;
  file: File;
  namaKtp: string;
  nik: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
}): Promise<{ ok: boolean; error: string; id?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return { ok: false, error: 'Konfigurasi Supabase tidak tersedia.' };
    }

    const qs = new URLSearchParams({
      id: opts.id,
      kelompok: opts.kelompok,
      jenis: opts.jenis,
      filename: opts.filename,
      nama_ktp: opts.namaKtp,
      nik: opts.nik,
      jenis_kelamin: opts.jenisKelamin,
      mime_type: opts.file.type || 'application/octet-stream',
      size_bytes: String(opts.file.size),
    });
    if (opts.file.type) qs.set('type', opts.file.type);

    const res = await fetch(
      `${supabaseUrl}/functions/v1/upload-attendance?${qs.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': opts.file.type || 'application/octet-stream',
          Authorization: `Bearer ${anonKey}`,
        },
        body: opts.file,
      },
    );

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok && typeof data.photoUrl === 'string' && data.photoUrl.startsWith('https://drive.google.com/')) {
      return { ok: true, error: '', id: data.id || opts.id };
    }

    return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getServerWib(): Promise<{ date: Date }> {
  const { data } = await supabase.rpc('now_wib');
  const local = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  if (!data) return { date: local };

  // now_wib() returns a Jakarta-local timestamp. Some PostgREST responses add a
  // timezone suffix, which makes Date parse it as UTC and shifts the clock +7h.
  const raw = String(data).replace(/([+-]\d{2}:\d{2}|Z)$/i, '');
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/,
  );
  if (!match) return { date: local };

  const [, year, month, day, hour, minute, second] = match;
  return {
    date: new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  };
}

// ============================================================================
// ABSENSI BIASA
// ============================================================================
export async function submitAttendance(payload: {
  participant_id: string;
  tanggal: string;
  jam: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  photoUrl: string | null;
  photoFilename: string | null;
}): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.from('attendance').insert({
    participant_id: payload.participant_id,
    tanggal: payload.tanggal,
    jam: payload.jam,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy,
    photo_path: payload.photoUrl,
    photo_filename: payload.photoFilename,
    status: 'Hadir',
  });
  if (error) {
    const msg = (error.message || '') as string;
    if (msg.includes('ATTENDANCE_WINDOW_CLOSED')) {
      return { success: false, message: 'Absensi sedang ditutup. Silakan kirim pada jam yang telah ditentukan.' };
    }
    if (msg.includes('ATTENDANCE_WINDOW_NOT_CONFIGURED')) {
      return { success: false, message: 'Jadwal absensi belum dikonfigurasi. Hubungi admin.' };
    }
    if (msg.toLowerCase().includes('duplicate') || msg.includes('uq_attendance')) {
      return {
        success: false,
        message: 'Anda sudah melakukan absensi hari ini.',
      };
    }
    if (msg.includes('participants')) {
      return { success: false, message: 'NIM peserta tidak terdaftar di database.' };
    }
    console.error('submitAttendance error:', error);
    return { success: false, message: 'Gagal menyimpan absensi. Silakan coba lagi.' };
  }
  return { success: true, message: 'Absensi berhasil dicatat.' };
}

// ============================================================================
// ABSENSI SEMINAR
// ============================================================================
export async function submitSeminar(payload: {
  participant_id: string;
  kegiatan: string;
  tanggal: string;
  jam: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  photoUrl: string | null;
  photoFilename: string | null;
}): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.from('seminar_attendance').insert({
    participant_id: payload.participant_id,
    kegiatan: payload.kegiatan,
    tanggal: payload.tanggal,
    jam: payload.jam,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy,
    photo_path: payload.photoUrl,
    photo_filename: payload.photoFilename,
    status: 'Hadir',
  });
  if (error) {
    const msg = (error.message || '') as string;
    if (msg.toLowerCase().includes('duplicate') || msg.includes('uq_seminar')) {
      return {
        success: false,
        message: 'Anda sudah melakukan absensi untuk kegiatan ini pada tanggal ini.',
      };
    }
    if (msg.includes('participants')) {
      return { success: false, message: 'NIM peserta tidak terdaftar di database.' };
    }
    console.error('submitSeminar error:', error);
    return { success: false, message: 'Gagal menyimpan absensi seminar. Silakan coba lagi.' };
  }
  return { success: true, message: 'Absensi seminar berhasil dicatat.' };
}

// ============================================================================
// INSTAGRAM
// ============================================================================
export async function submitInstagram(payload: {
  kelompok: string;
  pengirim: string;
  url: string;
}): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.from('tiktok_submissions').insert({
    kelompok: payload.kelompok,
    pengirim: payload.pengirim,
    url: payload.url,
  });
  if (error) {
    console.error('submitInstagram error:', error);
    return { success: false, message: 'Gagal menyimpan link Instagram. Silakan coba lagi.' };
  }
  return { success: true, message: 'Link Instagram berhasil disimpan.' };
}

// ============================================================================
// LAPORAN (HANYA PDF, maks 10MB)
// ============================================================================
export async function submitReport(payload: {
  participant_id: string;
  judul: string;
  fileUrl: string;
  filename: string;
  mimeType: string;
  size: number;
}): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.from('reports').insert({
    participant_id: payload.participant_id,
    judul: payload.judul,
    storage_path: payload.fileUrl,
    filename: payload.filename,
    mime_type: payload.mimeType,
    size_bytes: payload.size,
  });
  if (error) {
    const msg = (error.message || '') as string;
    if (msg.includes('participants')) {
      return { success: false, message: 'NIM peserta tidak terdaftar di database.' };
    }
    console.error('submitReport error:', error);
    return { success: false, message: 'Gagal menyimpan laporan. Silakan coba lagi.' };
  }
  return { success: true, message: 'Laporan berhasil disimpan.' };
}

// ============================================================================
// AKUISISI BPU / PU (NIK SENSITIF)
// ============================================================================
export async function submitAkuisisi(
  table: 'akuisisi_bpu' | 'akuisisi_pu',
  payload: {
    kelompok: string;
    nama_ktp: string;
    nik: string;
    jenis_kelamin: 'Laki-laki' | 'Perempuan';
    fileUrl: string;
    filename: string;
    mimeType: string;
    size: number;
  },
): Promise<{ success: boolean; message: string; id?: string }> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from(table).insert({
    id,
    kelompok: payload.kelompok,
    nama_ktp: payload.nama_ktp,
    nik: payload.nik,
    jenis_kelamin: payload.jenis_kelamin,
    storage_path: payload.fileUrl,
    filename: payload.filename,
    mime_type: payload.mimeType,
    size_bytes: payload.size,
  });
  if (error) {
    console.error(`submitAkuisisi (${table}) error:`, error);
    return { success: false, message: `Gagal menyimpan data: ${error.message}` };
  }
  return { success: true, message: 'Data berhasil disimpan.', id };
}

// ============================================================================
// MATERI
// ============================================================================
export async function getMaterials(): Promise<MaterialRow[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('is_active', true)
    .order('slug', { ascending: true });
  if (error) {
    console.error('getMaterials error:', error);
    return [];
  }
  return data ?? [];
}

// Get public URL for materials (bucket is public)
export function materialPublicUrl(storagePath: string): string {
  // storagePath format: "materials/BPU.pdf"
  const idx = storagePath.indexOf('/');
  const bucket = storagePath.slice(0, idx);
  const path = storagePath.slice(idx + 1);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function withGeo<T>(
  _fn: (geo: GeoLocation) => Promise<T>,
): Promise<T> {
  return _fn({ latitude: 0, longitude: 0, accuracy: 0 });
}
