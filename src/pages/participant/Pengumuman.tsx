import { useEffect, useState } from 'react';
import { Spinner } from '../../components/ui/Spinner';
import { announcementAssetUrl, fetchAnnouncements } from '../../services/adminService';
import type { AnnouncementRow } from '../../types';
import { formatDateTime } from '../../utils/constants';

export default function Pengumuman() {
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements(true)
      .then((announcements) => {
        if (!cancelled) setItems(announcements);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <h2 className="admin-title">Pengumuman</h2>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
      ) : items.length ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {items.map((item) => (
            <article key={item.id} className="panel" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 6px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{formatDateTime(item.created_at)}</p>
              <h3 style={{ margin: '0 0 12px' }}>{item.title}</h3>
              {item.content && <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>{item.content}</p>}
              {item.image_file_id && (
                <img
                  src={announcementAssetUrl(item.id, 'image')}
                  alt={item.image_filename ?? item.title}
                  loading="lazy"
                  style={{ display: 'block', width: '100%', maxHeight: 480, objectFit: 'contain', marginBottom: 14, borderRadius: 6 }}
                />
              )}
              {item.attachment_file_id && (
                <a className="btn btn-accent" href={announcementAssetUrl(item.id, 'file', true)}>
                  Download {item.attachment_filename ?? 'Lampiran'}
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="panel" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
          Belum ada pengumuman.
        </div>
      )}
    </div>
  );
}