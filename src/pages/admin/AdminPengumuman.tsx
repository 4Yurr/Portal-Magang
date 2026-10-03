import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  uploadAnnouncementAsset,
  updateAnnouncement,
} from '../../services/adminService';
import type { AnnouncementRow } from '../../types';
import { formatDateTime } from '../../utils/constants';

type Draft = {
  id: string | null;
  title: string;
  content: string;
  image_file_id: string | null;
  image_filename: string | null;
  attachment_file_id: string | null;
  attachment_filename: string | null;
  attachment_mime_type: string | null;
  is_published: boolean;
};

const emptyDraft: Draft = {
  id: null,
  title: '',
  content: '',
  image_file_id: null,
  image_filename: null,
  attachment_file_id: null,
  attachment_filename: null,
  attachment_mime_type: null,
  is_published: true,
};

export default function AdminPengumuman() {
  const { showToast } = useToast();
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [image, setImage] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await fetchAnnouncements());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetDraft = () => {
    setDraft(emptyDraft);
    setImage(null);
    setAttachment(null);
  };

  const edit = (item: AnnouncementRow) => {
    setDraft({
      id: item.id,
      title: item.title,
      content: item.content,
      image_file_id: item.image_file_id,
      image_filename: item.image_filename,
      attachment_file_id: item.attachment_file_id,
      attachment_filename: item.attachment_filename,
      attachment_mime_type: item.attachment_mime_type,
      is_published: item.is_published,
    });
    setImage(null);
    setAttachment(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    if (!draft.title.trim()) {
      showToast('Judul pengumuman wajib diisi.', 'error');
      return;
    }
    if (!draft.content.trim() && !image && !attachment && !draft.image_file_id && !draft.attachment_file_id) {
      showToast('Isi teks, gambar, atau lampiran terlebih dahulu.', 'error');
      return;
    }

    setSaving(true);
    let imageFileId = draft.image_file_id;
    let imageFilename = draft.image_filename;
    let attachmentFileId = draft.attachment_file_id;
    let attachmentFilename = draft.attachment_filename;
    let attachmentMimeType = draft.attachment_mime_type;

    if (image) {
      const result = await uploadAnnouncementAsset(image, 'image');
      if (!result.fileId) {
        setSaving(false);
        showToast(`Gagal mengunggah gambar: ${result.error}`, 'error');
        return;
      }
      imageFileId = result.fileId;
      imageFilename = image.name;
    }

    if (attachment) {
      const result = await uploadAnnouncementAsset(attachment, 'file');
      if (!result.fileId) {
        setSaving(false);
        showToast(`Gagal mengunggah lampiran: ${result.error}`, 'error');
        return;
      }
      attachmentFileId = result.fileId;
      attachmentFilename = attachment.name;
      attachmentMimeType = attachment.type || 'application/octet-stream';
    }

    const payload = {
      title: draft.title.trim(),
      content: draft.content.trim(),
      image_file_id: imageFileId,
      image_filename: imageFilename,
      attachment_file_id: attachmentFileId,
      attachment_filename: attachmentFilename,
      attachment_mime_type: attachmentMimeType,
      is_published: draft.is_published,
    };
    const result = draft.id
      ? await updateAnnouncement(draft.id, payload)
      : await createAnnouncement(payload);
    setSaving(false);

    if (result.error) {
      showToast(`Gagal menyimpan pengumuman: ${result.error.message}`, 'error');
      return;
    }
    showToast('Pengumuman berhasil disimpan.', 'success');
    resetDraft();
    load();
  };

  const remove = async (item: AnnouncementRow) => {
    if (!window.confirm(`Hapus pengumuman "${item.title}"?`)) return;
    const { error } = await deleteAnnouncement(item.id);
    if (error) {
      showToast('Gagal menghapus pengumuman.', 'error');
      return;
    }
    showToast('Pengumuman berhasil dihapus.', 'success');
    if (draft.id === item.id) resetDraft();
    load();
  };

  return (
    <div>
      <h2 className="admin-title">Pengumuman</h2>
      <section className="panel" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>{draft.id ? 'Edit Pengumuman' : 'Pengumuman Baru'}</h3>
        <label>Judul</label>
        <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={180} />
        <label>Isi</label>
        <textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} rows={5} />
        <label>Gambar (opsional)</label>
        <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] ?? null)} />
        {draft.image_filename && <p className="helper-text">Gambar tersimpan: {draft.image_filename}</p>}
        <label>Lampiran (opsional, maks. 25 MB)</label>
        <input
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file && file.size > 25 * 1024 * 1024) {
              event.target.value = '';
              showToast('Ukuran lampiran maksimal 25 MB.', 'error');
              return;
            }
            setAttachment(file);
          }}
        />
        {draft.attachment_filename && <p className="helper-text">Lampiran tersimpan: {draft.attachment_filename}</p>}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft((current) => ({ ...current, is_published: event.target.checked }))} />
          Terbitkan
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Spinner size={14} /> : 'Simpan Pengumuman'}
          </button>
          {draft.id && <button className="btn btn-outline" onClick={resetDraft} disabled={saving}>Batal Edit</button>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-toolbar"><strong>Daftar Pengumuman</strong></div>
        <div className="table-wrap">
          {loading ? <div style={{ padding: 32, textAlign: 'center' }}><Spinner size={28} /></div> : (
            <table className="data-table">
              <thead><tr><th>Judul</th><th>Status</th><th>Gambar</th><th>Lampiran</th><th>Dibuat</th><th>Aksi</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.title}</strong></td>
                    <td><span className={`badge ${item.is_published ? 'badge-success' : 'badge-neutral'}`}>{item.is_published ? 'Terbit' : 'Draft'}</span></td>
                    <td>{item.image_filename ?? '-'}</td>
                    <td>{item.attachment_filename ?? '-'}</td>
                    <td>{formatDateTime(item.created_at)}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline" onClick={() => edit(item)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => remove(item)}>Hapus</button>
                    </td>
                  </tr>
                ))}
                {!items.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Belum ada pengumuman.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}