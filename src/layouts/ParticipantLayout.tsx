import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppIcon } from '../components/ui/AppIcon';
import { announcementAssetUrl, fetchAnnouncements } from '../services/adminService';
import type { AnnouncementRow } from '../types';
import { formatDateTime } from '../utils/constants';

const ANNOUNCEMENT_DISMISS_KEY = 'portal-announcement-dismissed';
const ANNOUNCEMENT_RESHOW_MS = 30 * 60 * 1000;

function readAnnouncementDismissState() {
  if (typeof window === 'undefined') return {} as Record<string, number>;

  try {
    const raw = window.sessionStorage.getItem(ANNOUNCEMENT_DISMISS_KEY);
    const value = raw ? JSON.parse(raw) : {};
    return typeof value === 'object' && value !== null ? (value as Record<string, number>) : {};
  } catch {
    return {} as Record<string, number>;
  }
}

function writeAnnouncementDismissState(value: Record<string, number>) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, JSON.stringify(value));
}

function AnnouncementPopup() {
  const [items, setItems] = useState<AnnouncementRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (typeof window === 'undefined') return;

      const dismissed = readAnnouncementDismissState();
      const now = Date.now();
      const activeDismissals: Record<string, number> = {};
      const announcements = await fetchAnnouncements(true);
      if (cancelled) return;

      const visible = announcements.filter((item) => {
        const dismissedAt = dismissed[item.id];
        if (dismissedAt === undefined) return true;

        if (now - dismissedAt > ANNOUNCEMENT_RESHOW_MS) {
          return true;
        }

        activeDismissals[item.id] = dismissedAt;
        return false;
      });

      if (Object.keys(activeDismissals).length !== Object.keys(dismissed).length) {
        writeAnnouncementDismissState(activeDismissals);
      }

      setItems(visible.slice(0, 1));
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!items.length) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [items.length]);

  if (!items.length) return null;

  const item = items[0];

  const dismiss = () => {
    if (typeof window === 'undefined') return;

    const dismissed = readAnnouncementDismissState();
    dismissed[item.id] = Date.now();
    writeAnnouncementDismissState(dismissed);
    setItems([]);
  };

  return (
    <div className="announcement-modal-overlay" onClick={dismiss}>
      <div className="announcement-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="announcement-close" onClick={dismiss} aria-label="Tutup pengumuman">
          <AppIcon name="clear" size={16} />
        </button>

        <div className="announcement-modal-header">
          <span className="announcement-badge">Pengumuman</span>
          <p>{formatDateTime(item.created_at)}</p>
        </div>

        <h3>{item.title}</h3>
        {item.content && <p className="announcement-modal-content">{item.content}</p>}

        {item.image_file_id && (
          <img
            src={announcementAssetUrl(item.id, 'image')}
            alt={item.image_filename ?? item.title}
            className="announcement-modal-image"
          />
        )}

        {item.attachment_file_id && (
          <a className="btn btn-accent announcement-download" href={announcementAssetUrl(item.id, 'file', true)} target="_blank" rel="noopener noreferrer">
            <AppIcon name="download" size={16} />
            {item.attachment_filename ?? 'Download Lampiran'}
          </a>
        )}
      </div>
    </div>
  );
}

export function ParticipantLayout() {
  const navigate = useNavigate();
  return (
    <>
      <AnnouncementPopup />
      <header
        className="app-header"
        onClick={() => navigate('/')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') navigate('/');
        }}
      >
        <div style={{ position: 'relative' }}>
          <div className="header-badge">Portal Resmi Magang</div>
          <h1 className="header-title">Aplikasi Magang BPJS Ketenagakerjaan</h1>
          <p className="header-subtitle">Portal Kehadiran & Pengumpulan Tugas Magang</p>
        </div>
        <Link
          to="/login"
          className="header-admin-link"
          onClick={(e) => e.stopPropagation()}
          title="Masuk sebagai Admin"
        >
          <AppIcon name="admin" size={14} />
          Admin
        </Link>
      </header>
      <Outlet />
    </>
  );
}
