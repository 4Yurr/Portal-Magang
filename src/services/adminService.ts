// Services for the admin portal (authenticated side).

import { supabase } from '../lib/supabaseClient';
import type {
  AttendanceWindow,
  AttendanceRow,
  SeminarRow,
  ReportRow,
  InstagramRow,
  AkuisisiRow,
  Participant,
  MaterialRow,
  AnnouncementRow,
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

  const [participants, attendanceToday, seminarCount, reportCount, tiktokCount] =
    await Promise.all([
      supabase.from('participants').select('nim', { count: 'exact', head: true }),
      supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('tanggal', today),
      supabase.from('seminar_attendance').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('tiktok_submissions').select('id', { count: 'exact', head: true }),
    ]);

  return {
    totalParticipants: participants.count ?? 0,
    totalHadirHariIni: attendanceToday.count ?? 0,
    totalSeminar: seminarCount.count ?? 0,
    totalLaporan: reportCount.count ?? 0,
    totalTikTok: tiktokCount.count ?? 0,
  };
}

export async function fetchRecentActivities() {
  const [attendance, reports] = await Promise.all([
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
  ]);
  return {
    attendance: attendance.data ?? [],
    reports: reports.data ?? [],
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
    const { data, count, error } = await q;
    if (error) return { data: [], total: 0 };
    return { data: (data as Participant[]) ?? [], total: count ?? 0 };
  }

  const data: Participant[] = [];
  const pageSize = 1000;
  let total = 0;
  for (let offset = 0; ; offset += pageSize) {
    const { data: pageData, count, error } = await q.range(offset, offset + pageSize - 1);
    if (error) return { data: [], total: 0 };
    data.push(...((pageData ?? []) as Participant[]));
    total = count ?? total;
    if (!pageData || pageData.length < pageSize) break;
  }
  return { data, total };
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
  startDate?: string;
  endDateExclusive?: string;
  search?: string;
  kelompok?: string;
}): Promise<AttendanceRow[]> {
  let q = supabase.from('v_attendance').select('*');
  if (opts?.date) q = q.eq('tanggal', opts.date);
  if (opts?.startDate) q = q.gte('tanggal', opts.startDate);
  if (opts?.endDateExclusive) q = q.lt('tanggal', opts.endDateExclusive);
  if (opts?.kelompok) q = q.eq('kelompok', opts.kelompok);
  if (opts?.search) {
    const s = opts.search.trim();
    q = q.or(`nim.ilike.%${s}%,nama.ilike.%${s}%`);
  }
  q = q.order('created_at', { ascending: false });
  const rows: AttendanceRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await q.range(offset, offset + pageSize - 1);
    if (error) {
      console.error('fetchAttendance error:', error);
      return [];
    }
    rows.push(...((data ?? []) as AttendanceRow[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
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

export async function fetchInstagram(opts?: {
  search?: string;
  kelompok?: string;
}): Promise<InstagramRow[]> {
  let q = supabase.from('tiktok_submissions').select('*');
  if (opts?.search) {
    const s = opts.search.trim();
    q = q.or(`pengirim.ilike.%${s}%,url.ilike.%${s}%`);
  }
  if (opts?.kelompok) q = q.eq('kelompok', opts.kelompok);
  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as InstagramRow[];
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


export async function fetchAnnouncements(publishedOnly = false): Promise<AnnouncementRow[]> {
  let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (publishedOnly) query = query.eq('is_published', true);
  const { data, error } = await query;
  if (error) {
    console.error('fetchAnnouncements error:', error);
    return [];
  }
  return (data ?? []) as AnnouncementRow[];
}

export async function createAnnouncement(payload: {
  title: string;
  content: string;
  image_file_id: string | null;
  image_filename: string | null;
  attachment_file_id: string | null;
  attachment_filename: string | null;
  attachment_mime_type: string | null;
  is_published: boolean;
}) {
  return supabase.from('announcements').insert(payload).select().single();
}

export async function updateAnnouncement(id: string, payload: {
  title: string;
  content: string;
  image_file_id: string | null;
  image_filename: string | null;
  attachment_file_id: string | null;
  attachment_filename: string | null;
  attachment_mime_type: string | null;
  is_published: boolean;
}) {
  return supabase.from('announcements').update(payload).eq('id', id);
}

export async function deleteAnnouncement(id: string) {
  return supabase.from('announcements').delete().eq('id', id);
}

export async function uploadAnnouncementAsset(file: File, asset: 'image' | 'file'): Promise<{ fileId: string | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!session?.access_token || !supabaseUrl || !anonKey) {
    return { fileId: null, error: 'Sesi admin atau konfigurasi Supabase tidak tersedia.' };
  }

  try {
    const query = new URLSearchParams({
      jenis: 'announcement-asset',
      asset,
      filename: file.name,
      type: file.type || 'application/octet-stream',
    });
    const response = await fetch(`${supabaseUrl}/functions/v1/upload-attendance?${query}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.fileId !== 'string') {
      return { fileId: null, error: String(data.error || `HTTP ${response.status}`) };
    }
    return { fileId: data.fileId, error: null };
  } catch (error) {
    return { fileId: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export function announcementAssetUrl(announcementId: string, asset: 'image' | 'file', download = false): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const query = new URLSearchParams({ announcementId, asset, apikey: anonKey || '' });
  if (download) query.set('download', '1');
  return `${supabaseUrl}/functions/v1/upload-attendance?${query}`;
}
export async function fetchAttendanceSettings(): Promise<AttendanceWindow | null> {
  const { data, error } = await supabase
    .from('daily_attendance_window')
    .select('*')
    .eq('id', true)
    .maybeSingle();
  if (error) {
    console.error('fetchAttendanceSettings error:', error);
    return null;
  }
  return data as AttendanceWindow | null;
}

export async function upsertAttendanceSetting(payload: {
  open_time: string;
  close_time: string;
}) {
  return supabase.from('daily_attendance_window').update(payload).eq('id', true);
}

export async function fetchAuditLogs(limit = 20): Promise<any[]> {
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) {
    console.error('fetchAuditLogs error:', error);
    return [];
  }
  return data ?? [];
}

async function writeAuditLog(tableName: string, recordId: string, action: 'CREATE' | 'UPDATE' | 'DELETE', beforeValue: any, afterValue: any) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const actor_email = session?.user?.email || 'unknown_admin';
    await supabase.from('audit_logs').insert({
      actor_email,
      table_name: tableName,
      record_id: recordId,
      action,
      before_value: beforeValue,
      after_value: afterValue
    });
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}

export async function updateAttendanceStatus(id: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Ditolak') {
  const { data: beforeData } = await supabase.from('attendance').select('*').eq('id', id).single();
  const res = await supabase.from('attendance').update({ status }).eq('id', id).select().single();
  if (!res.error && beforeData) {
    await writeAuditLog('attendance', id, 'UPDATE', beforeData, res.data);
  }
  return res;
}

export async function deleteAttendance(id: string) {
  const { data: beforeData } = await supabase.from('attendance').select('*').eq('id', id).single();
  const res = await supabase.from('attendance').delete().eq('id', id);
  if (!res.error && beforeData) {
    await writeAuditLog('attendance', id, 'DELETE', beforeData, null);
  }
  return res;
}

export async function updateSeminarStatus(id: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Ditolak') {
  const { data: beforeData } = await supabase.from('seminar_attendance').select('*').eq('id', id).single();
  const res = await supabase.from('seminar_attendance').update({ status }).eq('id', id).select().single();
  if (!res.error && beforeData) {
    await writeAuditLog('seminar_attendance', id, 'UPDATE', beforeData, res.data);
  }
  return res;
}

export async function updateSeminar(id: string, updates: { kegiatan?: string; tanggal?: string; jam?: string; status?: 'Hadir' | 'Izin' | 'Sakit' | 'Ditolak' }) {
  const { data: beforeData } = await supabase.from('seminar_attendance').select('*').eq('id', id).single();
  const res = await supabase.from('seminar_attendance').update(updates).eq('id', id).select().single();
  if (!res.error && beforeData) {
    await writeAuditLog('seminar_attendance', id, 'UPDATE', beforeData, res.data);
  }
  return res;
}

export async function deleteSeminar(id: string) {
  const { data: beforeData } = await supabase.from('seminar_attendance').select('*').eq('id', id).single();
  if (beforeData) {
    await writeAuditLog('seminar_attendance', id, 'DELETE', beforeData, null);
  }
  return supabase.from('seminar_attendance').delete().eq('id', id);
}

export async function deleteAkuisisi(table: 'akuisisi_bpu' | 'akuisisi_pu', id: string) {
  const { data: beforeData } = await supabase.from(table).select('*').eq('id', id).single();
  if (beforeData) {
    await writeAuditLog(table, id, 'DELETE', beforeData, null);
    if (beforeData.storage_path && !/^https?:\/\//i.test(beforeData.storage_path)) {
      const idx = beforeData.storage_path.indexOf('/');
      const bucket = beforeData.storage_path.slice(0, idx);
      const path = beforeData.storage_path.slice(idx + 1);
      await supabase.storage.from(bucket).remove([path]);
    }
  }
  return supabase.from(table).delete().eq('id', id);
}

export async function updateAkuisisi(
  table: 'akuisisi_bpu' | 'akuisisi_pu',
  id: string,
  updates: { kelompok: string; nama_ktp: string; nik: string; jenis_kelamin: 'Laki-laki' | 'Perempuan' }
) {
  const { data: beforeData } = await supabase.from(table).select('*').eq('id', id).single();
  const res = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (!res.error && beforeData) {
    await writeAuditLog(table, id, 'UPDATE', beforeData, res.data);
  }
  return res;
}

export async function deleteReport(id: string) {
  const { data: beforeData } = await supabase.from('reports').select('*').eq('id', id).single();
  if (beforeData) {
    await writeAuditLog('reports', id, 'DELETE', beforeData, null);
    if (beforeData.storage_path && !/^https?:\/\//i.test(beforeData.storage_path)) {
      const idx = beforeData.storage_path.indexOf('/');
      const bucket = beforeData.storage_path.slice(0, idx);
      const path = beforeData.storage_path.slice(idx + 1);
      await supabase.storage.from(bucket).remove([path]);
    }
  }
  return supabase.from('reports').delete().eq('id', id);
}

export async function deleteInstagram(id: string) {
  const { data: beforeData } = await supabase.from('tiktok_submissions').select('*').eq('id', id).single();
  if (beforeData) {
    await writeAuditLog('tiktok_submissions', id, 'DELETE', beforeData, null);
  }
  return supabase.from('tiktok_submissions').delete().eq('id', id);
}

export async function updateInstagram(id: string, updates: { kelompok?: string; pengirim?: string; url?: string; note?: string }) {
  const { data: beforeData } = await supabase.from('tiktok_submissions').select('*').eq('id', id).single();
  const res = await supabase.from('tiktok_submissions').update(updates).eq('id', id).select().single();
  if (!res.error && beforeData) {
    await writeAuditLog('tiktok_submissions', id, 'UPDATE', beforeData, res.data);
  }
  return res;
}

export async function deleteMaterial(id: string) {
  const { data: beforeData } = await supabase.from('materials').select('*').eq('id', id).single();
  if (beforeData) {
    await writeAuditLog('materials', id, 'DELETE', beforeData, null);
    if (beforeData.storage_path) {
      const idx = beforeData.storage_path.indexOf('/');
      const bucket = beforeData.storage_path.slice(0, idx);
      const path = beforeData.storage_path.slice(idx + 1);
      await supabase.storage.from(bucket).remove([path]);
    }
  }
  return supabase.from('materials').delete().eq('id', id);
}

export async function updateMaterial(id: string, updates: { title?: string; description?: string; is_active?: boolean; storage_path?: string; filename?: string }) {
  const { data: beforeData } = await supabase.from('materials').select('*').eq('id', id).single();
  const res = await supabase.from('materials').update(updates).eq('id', id).select().single();
  if (!res.error && beforeData) {
    await writeAuditLog('materials', id, 'UPDATE', beforeData, res.data);
  }
  return res;
}

export async function insertMaterial(payload: { slug: string; title: string; description: string; storage_path: string; filename: string }) {
  const res = await supabase.from('materials').insert(payload).select().single();
  if (!res.error && res.data) {
    await writeAuditLog('materials', res.data.id, 'CREATE', null, res.data);
  }
  return res;
}

// ============================================================================
// FILE DOWNLOAD (signed URL untuk file privat)
// ============================================================================
export async function getSignedDownloadUrl(storagePath: string, filename: string): Promise<string | null> {
  if (!storagePath) return null;
  if (/^https?:\/\//i.test(storagePath)) {
    return storagePath;
  }
  const idx = storagePath.indexOf('/');
  if (idx <= 0) {
    console.error('Invalid storage path:', storagePath);
    return null;
  }
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
