// Shared component for viewing/downloading files in admin tables.

import { useEffect, useState } from 'react';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { getSignedDownloadUrl } from '../../services/adminService';

export function DownloadButton({ storagePath, filename, label = 'Download' }: {
  storagePath: string;
  filename: string;
  label?: string;
}) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const url = await getSignedDownloadUrl(storagePath, filename);
    setLoading(false);
    if (!url) {
      showToast('Gagal membuat link download', 'error');
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={onClick} disabled={loading}>
      {loading ? <Spinner size={14} /> : label}
    </button>
  );
}

export function PhotoViewModal({ storagePath, filename, onClose }: {
  storagePath: string | null;
  filename: string | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!storagePath) {
        setLoading(false);
        return;
      }
      const u = await getSignedDownloadUrl(storagePath, filename ?? 'foto');
      setUrl(u);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePath]);

  if (!storagePath) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <h3>Foto Kegiatan</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Spinner size={28} />
          </div>
        ) : url ? (
          <img src={url} alt={filename ?? 'foto'} style={{ width: '100%', borderRadius: 8 }} />
        ) : (
          <p>Gagal memuat foto.</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn btn-outline" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export function FileModal({ storagePath, filename, mimeType, onClose }: {
  storagePath: string;
  filename: string;
  mimeType: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await getSignedDownloadUrl(storagePath, filename);
      setUrl(u);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePath]);

  const isPdf = mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
  const isImage = mimeType.startsWith('image/');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <h3>{filename}</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Spinner size={28} />
          </div>
        ) : url ? (
          isPdf ? (
            <iframe src={url} title={filename} style={{ width: '100%', height: 480, borderRadius: 8, border: '1px solid var(--border)' }} />
          ) : isImage ? (
            <img src={url} alt={filename} style={{ width: '100%', borderRadius: 8 }} />
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Buka File
            </a>
          )
        ) : (
          <p>Gagal memuat file.</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          {url && (
            <DownloadButton storagePath={storagePath} filename={filename} label="Download" />
          )}
          <button className="btn btn-outline" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
