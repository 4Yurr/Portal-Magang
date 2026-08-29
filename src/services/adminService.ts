// Services for the admin portal (authenticated side).

import { supabase } from '../lib/supabaseClient';
import type {
  AttendanceRow,
  SeminarRow,
  ReportRow,
  TikTokRow,
  AkuisisiRow,
  Participant,
  MaterialRow,
} from '../types';

// ============================================================================
// AUTH
// ============================================================================
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================
export async function fetchDashboardStats() {
  const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const today = `${nowWib.getFullYear()}-${String(nowWib.getMonth() + 1).padStart(2, '0')}-${String(
    nowWib.getDate(),
  ).padStart(2, '0')}`;

  const [participants, attendanceToday, seminarCount, reportCount, tiktokCount, bpuCount, puCount] =
    await Promise.all([
      supabase.from('participants').select('nim', { count: 'exact', head: true }),
      supabase.from('attendance').select('id, session', { count: 'exact' }).eq('tanggal', today),
      supabase.from('seminar_attendance').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('tiktok_submissions').select('id', { count: 'exact', head: true }),
      supabase.from('akuisisi_bpu').select('id', { count: 'exact', head: true }),
      supabase.from('akuisisi_pu').select('id', { count: 'exact', head: true }),
    ]);

  const attendanceRows = attendanceToday.data ?? [];
  const pagi = attendanceRows.filter((r) => r.session === 'PAGI').length;
  const sore = attendanceRows.filter((r) => r.session === 'SORE').length;

  return {
    totalParticipants: participants.count ?? 0,
    totalHadirHariIni: attendanceRows.length,
    absensiPagi: pagi,
    absensiSore: sore,
    totalSeminar: seminarCount.count ?? 0,
    totalLaporan: reportCount.count ?? 0,
    totalTikTok: tiktokCount.count ?? 0,
    totalBPU: bpuCount.count ?? 0,
    totalPU: puCount.count ?? 0,
  };
}

export async function fetchRecentActivities() {
  const [attendance, reports, bpu, pu] = await Promise.all([
    supabase
      .from('v_attendance')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('v_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('akuisisi_bpu').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('akuisisi_pu').select('*').order('created_at', { ascending: false }).limit(5),
  ]);
  return {
    attendance: attendance.data ?? [],
    reports: reports.data ?? [],
    bpu: bpu.data ?? [],
    pu: pu.data ?? [],
  };
}

// ============================================================================
// PARTICIPANTS (CRUD admin)
// ============================================================================
export async function fetchParticipants(opts: {
  search?: string;
  kelompok?: string;
  fakultas?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: Participant[]; total: number }> {
  let q = supabase.from('participants').select('*', { count: 'exact' });
  if (opts.search) {
    const s = opts.search.trim();
    q = q.or(`nim.ilike.%${s}%,nama.ilike.%${s}%`);
  }
  if (opts.kelompok) {
    q = q.eq('kelompok', opts.kelompok);
  }
  if (opts.fakultas) {
    q = q.ilike('fakultas', `%${opts.fakultas}%`);
  }
  q = q.order('nim', { ascending: true });
  if (opts.page && opts.pageSize) {
    q = q.range((opts.page - 1) * opts.pageSize, opts.page * opts.pageSize - 1);
  }
  const { data, count, error } = await q;
  if (error) return { data: [], total: 0 };
  return { data: (data as Participant[]) ?? [], total: count ?? 0 };
}

export async function upsertParticipant(p: {
  nim: string;
  nama: string;
  fakultas: string;
  prodi: string;
  kelompok: string;
  is_active?: boolean;
}) {
  return supabase.from('participants').upsert(p);
}

export async function updateParticipant(
  nim: string,
  updates: { nama: string; fakultas: string; prodi: string; kelompok: string; is_active?: boolean },
) {
  return supabase.from('participants').update(updates).eq('nim', nim);
}

export async function softDeleteParticipant(nim: string) {
  return supabase.from('participants').update({ is_active: false }).eq('nim', nim);
}

export async function hardDeleteParticipant(nim: string) {
  return supabase.from('participants').delete().eq('nim', nim);
}

// ============================================================================
// ADMIN DATA TABLES
// ============================================================================
export async function fetchAttendance(opts?: {
  date?: string;
  session?: string;
  search?: string;
  kelompok?: string;
}): Promise<AttendanceRow[]> {
  let q = supabase.from('v_attendance').select('*');
  if (opts?.date) q = q.eq('tanggal', opts.date);
  if (opts?.session) q = q.eq('session', opts.session);
  if (opts?.kelompok) q = q.eq('kelompok', opts.kelompok);
  if (opts?.search) {
    const s = opts.search.trim();
    q = q.or(`nim.ilike.%${s}%,nama.ilike.%${s}%`);
  }
  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) {
    console.error('fetchAttendance error:', error);
    return [];
  }
  return (data ?? []) as AttendanceRow[];
}

export async function fetchSeminar(opts?: {
  search?: string;
  tanggal?: string;
  kegiatan?: string;
}): Promise<SeminarRow[]> {
  let q = supabase.from('v_seminar').select('*');
  if (opts?.search) {
    const s = opts.search.trim();
    q = q.or(`nim.ilike.%${s}%,nama.ilike.%${s}%,kegiatan.ilike.%${s}%`);
  }
  if (opts?.tanggal) q = q.eq('tanggal', opts.tanggal);
  if (opts?.kegiatan) q = q.ilike('kegiatan', `%${opts.kegiatan}%`);
  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as SeminarRow[];
}

export async function fetchTikTok(opts?: {
  search?: string;
  kelompok?: string;
}): Promise<TikTokRow[]> {
  let q = supabase.from('tiktok_submissions').select('*');
  if (opts?.search) {
    const s = opts.search.trim();
    q = q.or(`pengirim.ilike.%${s}%,url.ilike.%${s}%`);
  }
  if (opts?.kelompok) q = q.eq('kelompok', opts.kelompok);
  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as TikTokRow[];
}

export async function fetchReports(opts?: {
  search?: string;
  tanggal?: string;
}): Promise<ReportRow[]> {
  let q = supabase.from('v_reports').select('*');
  if (opts?.search) {
    const s = opts.search.trim();
    q = q.or(`nim.ilike.%${s}%,nama.ilike.%${s}%,judul.ilike.%${s}%`);
  }
  if (opts?.tanggal) q = q.eq('created_at::date', opts.tanggal);
  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as ReportRow[];
}

export async function fetchAkuisisi(
  table: 'akuisisi_bpu' | 'akuisisi_pu',
  opts?: { search?: string; kelompok?: string },
): Promise<AkuisisiRow[]> {
  let q = supabase.from(table).select('*');
  if (opts?.search) {
    const s = opts.search.trim();
    q = q.or(`nama_ktp.ilike.%${s}%,nik.ilike.%${s}%`);
  }
  if (opts?.kelompok) q = q.eq('kelompok', opts.kelompok);
  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as AkuisisiRow[];
}

export async function fetchMaterials(): Promise<MaterialRow[]> {
  const { data, error } = await supabase.from('materials').select('*').order('slug');
  if (error) return [];
  return (data ?? []) as MaterialRow[];
}

// ============================================================================
// FILE DOWNLOAD (signed URL untuk file privat)
// ============================================================================
export async function getSignedDownloadUrl(storagePath: string, filename: string): Promise<string | null> {
  if (!storagePath) return null;
  const idx = storagePath.indexOf('/');
  const bucket = storagePath.slice(0, idx);
  const path = storagePath.slice(idx + 1);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600, { download: filename });
  if (error) {
    console.error('getSignedDownloadUrl error:', error);
    return null;
  }
  return data.signedUrl;
}

export function getPublicMaterialUrl(storagePath: string): string {
  const idx = storagePath.indexOf('/');
  const bucket = storagePath.slice(0, idx);
  const path = storagePath.slice(idx + 1);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
