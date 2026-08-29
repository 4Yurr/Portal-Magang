// Type definitions for the Supabase database (lightweight, hand-written).
// In production you can regenerate with `supabase gen types typescript`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      participants: {
        Row: {
          nim: string;
          nama: string;
          fakultas: string;
          prodi: string;
          kelompok: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          nim: string;
          nama: string;
          fakultas?: string;
          prodi?: string;
          kelompok?: string;
          is_active?: boolean;
        };
        Update: {
          nim?: string;
          nama?: string;
          fakultas?: string;
          prodi?: string;
          kelompok?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          participant_id: string;
          tanggal: string;
          session: 'PAGI' | 'SORE';
          jam: string;
          status: 'Hadir' | 'Ditolak';
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
          photo_path: string | null;
          photo_filename: string | null;
          created_at: string;
        };
        Insert: {
          participant_id: string;
          tanggal: string;
          session: 'PAGI' | 'SORE';
          jam: string;
          status?: 'Hadir' | 'Ditolak';
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          photo_path?: string | null;
          photo_filename?: string | null;
        };
        Update: {
          session?: 'PAGI' | 'SORE';
          status?: 'Hadir' | 'Ditolak';
          photo_path?: string | null;
          photo_filename?: string | null;
        };
        Relationships: [];
      };
      seminar_attendance: {
        Row: {
          id: string;
          participant_id: string;
          kegiatan: string;
          tanggal: string;
          jam: string;
          status: 'Hadir' | 'Ditolak';
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
          photo_path: string | null;
          photo_filename: string | null;
          created_at: string;
        };
        Insert: {
          participant_id: string;
          kegiatan: string;
          tanggal: string;
          jam: string;
          status?: 'Hadir' | 'Ditolak';
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          photo_path?: string | null;
          photo_filename?: string | null;
        };
        Update: {
          status?: 'Hadir' | 'Ditolak';
        };
        Relationships: [];
      };
      tiktok_submissions: {
        Row: {
          id: string;
          kelompok: string;
          pengirim: string;
          url: string;
          note: string;
          created_at: string;
        };
        Insert: {
          kelompok: string;
          pengirim: string;
          url: string;
          note?: string;
        };
        Update: {
          note?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          participant_id: string;
          judul: string;
          storage_path: string;
          filename: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          participant_id: string;
          judul: string;
          storage_path: string;
          filename: string;
          mime_type?: string;
          size_bytes?: number;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      akuisisi_bpu: {
        Row: {
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
        };
        Insert: {
          kelompok: string;
          nama_ktp: string;
          nik: string;
          jenis_kelamin: 'Laki-laki' | 'Perempuan';
          storage_path: string;
          filename: string;
          mime_type: string;
          size_bytes?: number;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      akuisisi_pu: {
        Row: {
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
        };
        Insert: {
          kelompok: string;
          nama_ktp: string;
          nik: string;
          jenis_kelamin: 'Laki-laki' | 'Perempuan';
          storage_path: string;
          filename: string;
          mime_type: string;
          size_bytes?: number;
        };
        Update: Record<string, never>;
      };
      materials: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          storage_path: string;
          filename: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          title: string;
          description?: string;
          storage_path: string;
          filename: string;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          description?: string;
          storage_path?: string;
          filename?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      v_attendance: {
        Row: {
          id: string;
          nim: string | null;
          nama: string | null;
          fakultas: string | null;
          prodi: string | null;
          kelompok: string | null;
          tanggal: string;
          jam: string;
          session: 'PAGI' | 'SORE';
          status: 'Hadir' | 'Ditolak';
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
          photo_path: string | null;
          photo_filename: string | null;
          created_at: string;
        };
      };
      v_seminar: {
        Row: {
          id: string;
          nim: string | null;
          nama: string | null;
          fakultas: string | null;
          prodi: string | null;
          kelompok: string | null;
          kegiatan: string;
          tanggal: string;
          jam: string;
          status: 'Hadir' | 'Ditolak';
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
          photo_path: string | null;
          photo_filename: string | null;
          created_at: string;
        };
      };
      v_reports: {
        Row: {
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
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      now_wib: { Args: Record<string, never>; Returns: string };
      attendance_open_info: {
        Args: Record<string, never>;
        Returns: { session: string; is_open: boolean; message: string }[];
      };
    };
  };
}
