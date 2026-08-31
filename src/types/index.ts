// Domain-level types used across the app.

export type Session = 'PAGI' | 'SORE';
export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Ditolak';
export type AttendanceStatusOption = 'Hadir' | 'Izin' | 'Sakit';

export type Participant = {
  nim: string;
  nama: string;
  fakultas: string;
  prodi: string;
  kelompok: string;
  is_active: boolean;
};

export type AttendanceRow = {
  id: string;
  nim: string | null;
  nama: string | null;
  fakultas: string | null;
  prodi: string | null;
  kelompok: string | null;
  tanggal: string;
  jam: string;
  session: 'PAGI' | 'SORE';
  status: AttendanceStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photo_path: string | null;
  photo_filename: string | null;
  created_at: string;
};

export type SeminarRow = {
  id: string;
  nim: string | null;
  nama: string | null;
  fakultas: string | null;
  prodi: string | null;
  kelompok: string | null;
  kegiatan: string;
  tanggal: string;
  jam: string;
  status: AttendanceStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photo_path: string | null;
  photo_filename: string | null;
  created_at: string;
};

export type ReportRow = {
  id: string;
  nim: string | null;
  nama: string | null;
  fakultas: string | null;
  prodi: string | null;
  kelompok: string | null;
  judul: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export type TikTokRow = {
  id: string;
  kelompok: string;
  pengirim: string;
  url: string;
  note: string;
  created_at: string;
};

export type AkuisisiRow = {
  id: string;
  kelompok: string;
  nama_ktp: string;
  nik: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  drive_file_id: string | null;
  drive_url: string | null;
};

export type MaterialRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  storage_path: string;
  filename: string;
  is_active: boolean;
};

export type GeoLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};
