// Constants & validation helpers shared across the app.

// Absensi window (Asia/Jakarta)
export const TIMEZONE = 'Asia/Jakarta';

export const SESSION_CONFIG = {
  PAGI: { start: '08:00:00', end: '09:30:00', label: 'Pagi', short: 'PAGI' },
  SORE: { start: '15:30:00', end: '17:00:00', label: 'Sore', short: 'SORE' },
} as const;

export type SessionKey = keyof typeof SESSION_CONFIG;

export function evalSessionWindowByConfig(nowWib: Date, start: string, end: string) {
  const time = nowWib.getHours() * 3600 + nowWib.getMinutes() * 60 + nowWib.getSeconds();
  const [sh, sm, ss] = start.split(':').map(Number);
  const [eh, em, es] = end.split(':').map(Number);
  const startSec = sh * 3600 + sm * 60 + ss;
  const endSec = eh * 3600 + em * 60 + es;
  return {
    isOpen: time >= startSec && time <= endSec,
    start,
    end,
  };
}

export function evalSessionWindow(nowWib: Date, sessionKey: SessionKey) {
  const cfg = SESSION_CONFIG[sessionKey];
  return evalSessionWindowByConfig(nowWib, cfg.start, cfg.end);
}

// Waktu server (dari Supabase) dalam zona Asia/Jakarta sebagai Date
export function serverWib(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

export function isSessionOpen(sessionKey: SessionKey): boolean {
  return evalSessionWindow(serverWib(), sessionKey).isOpen;
}

// Format tanggal WIB -> YYYY-MM-DD
export function wibDateString(date = serverWib()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Format jam WIB -> HH:mm:ss
export function wibTimeString(date = serverWib()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ---- TikTok URL validation ----
const ALLOWED_TIKTOK_HOSTS = [
  'tiktok.com',
  'www.tiktok.com',
  'vt.tiktok.com',
  'vm.tiktok.com',
  'm.tiktok.com',
];

export function isValidTikTokUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  let trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const hostOk =
      ALLOWED_TIKTOK_HOSTS.includes(host) || host.endsWith('.tiktok.com');
    const hasPath = parsed.pathname.length > 1;
    return hostOk && hasPath;
  } catch {
    return /^(https?:\/\/)?([a-zA-Z0-9_-]+\.)?tiktok\.com\/[^\s]+$/i.test(trimmed);
  }
}

// NIK must be exactly 16 digits
export function isValidNIK(nik: string): boolean {
  return /^\d{16}$/.test(String(nik).trim());
}

export type attendance_session = 'PAGI' | 'SORE';

// Formatting helpers
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString('id-ID', { timeZone: TIMEZONE });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('id-ID', { timeZone: TIMEZONE });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '-';
  return value.slice(0, 5);
}

export function maskNik(nik: string): string {
  if (!nik || nik.length !== 16) return '••••••••••';
  return `${nik.slice(0, 4)}••••••••${nik.slice(12)}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

export const MAX_REPORT_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_REPORT_TYPES = ['application/pdf'];
export const PDF_EXTENSIONS = ['.pdf'];

export function isValidPdf(file: File): boolean {
  const nameOk = file.name.toLowerCase().endsWith('.pdf');
  const typeOk = ALLOWED_REPORT_TYPES.includes(file.type);
  return nameOk || typeOk;
}

export function isValidPhoto(file: File): boolean {
  return file.type.startsWith('image/');
}
