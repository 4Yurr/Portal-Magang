import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import {
  fetchParticipants,
  upsertParticipant,
  updateParticipant,
  softDeleteParticipant,
  hardDeleteParticipant,
} from '../../services/adminService';
import type { Participant } from '../../types';
import { exportToExcel } from '../../utils/excel';

type FormState = {
  nim: string;
  nama: string;
  fakultas: string;
  prodi: string;
  kelompok: string;
};

const EMPTY_FORM: FormState = { nim: '', nama: '', fakultas: '', prodi: '', kelompok: '' };

export default function Peserta() {
  const { showToast } = useToast();

  const [data, setData] = useState<Participant[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [kelompok, setKelompok] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingNim, setEditingNim] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Participant | null>(null);
  const [hardDelete, setHardDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchParticipants({
      search,
      kelompok: kelompok || undefined,
      page,
      pageSize,
    });
    setData(res.data);
    setTotal(res.total);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kelompok, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingNim(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Participant) => {
    setEditingNim(p.nim);
    setForm({ nim: p.nim, nama: p.nama, fakultas: p.fakultas, prodi: p.prodi, kelompok: p.kelompok });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nim.trim() || !form.nama.trim()) {
      showToast('NIM dan Nama wajib diisi', 'error');
      return;
    }
    setSaving(true);
    if (editingNim) {
      const { error } = await updateParticipant(editingNim, {
        nama: form.nama.trim(),
        fakultas: form.fakultas.trim(),
        prodi: form.prodi.trim(),
        kelompok: form.kelompok.trim(),
      });
      setSaving(false);
      if (error) {
        console.error(error);
        showToast('Gagal menyimpan peserta', 'error');
        return;
      }
      showToast('Peserta diperbarui', 'success');
    } else {
      const { error } = await upsertParticipant({
        nim: form.nim.trim(),
        nama: form.nama.trim(),
        fakultas: form.fakultas.trim(),
        prodi: form.prodi.trim(),
        kelompok: form.kelompok.trim(),
      });
      setSaving(false);
      if (error) {
        console.error(error);
        showToast('Gagal menambah peserta', 'error');
        return;
      }
      showToast('Peserta ditambahkan', 'success');
    }
    setModalOpen(false);
    setPage(1);
    load();
  };

  const confirmDelete = (p: Participant, force = false) => {
    setConfirmTarget(p);
    setHardDelete(force);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!confirmTarget) return;
    if (hardDelete) {
      const { error } = await hardDeleteParticipant(confirmTarget.nim);
      if (error) {
        console.error(error);
        showToast('Gagal menghapus permanen (mungkin karena ada data terkait)', 'error');
      } else {
        showToast('Peserta dihapus permanen', 'success');
      }
    } else {
      const { error } = await softDeleteParticipant(confirmTarget.nim);
      if (error) {
        console.error(error);
        showToast('Gagal menonaktifkan peserta', 'error');
      } else {
        showToast('Peserta dinonaktifkan', 'success');
      }
    }
    setConfirmOpen(false);
    setConfirmTarget(null);
    load();
  };

  const handleExport = () => {
    exportToExcel(
      [
        { header: 'NIM', key: 'nim', width: 18 },
        { header: 'Nama', key: 'nama', width: 28 },
        { header: 'Fakultas', key: 'fakultas', width: 22 },
        { header: 'Prodi', key: 'prodi', width: 24 },
        { header: 'Kelompok', key: 'kelompok', width: 12 },
        { header: 'Aktif', key: 'is_active', width: 10 },
      ],
      data.map((d) => ({
        nim: d.nim,
        nama: d.nama,
        fakultas: d.fakultas,
        prodi: d.prodi,
        kelompok: d.kelompok,
        is_active: d.is_active ? 'Ya' : 'Tidak',
      })),
      `Data_Peserta.xlsx`,
    ).then((r) => showToast(r.message, r.success ? 'success' : 'error'));
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h2 className="admin-title">Master Peserta</h2>

      <div className="panel">
        <div className="panel-toolbar">
          <div className="toolbar-field">
            <label>Search</label>
            <input
              type="text"
              placeholder="Cari NIM / Nama"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="toolbar-field">
            <label>Kelompok</label>
            <select value={kelompok} onChange={(e) => { setKelompok(e.target.value); setPage(1); }}>
              <option value="">Semua</option>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={String(i + 1)}>
                  Kelompok {i + 1}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={openCreate} style={{ marginLeft: 'auto' }}>
            + Tambah Peserta
          </button>
          <button className="btn btn-outline" onClick={handleExport}>
            Download Excel
          </button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Spinner size={28} />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>NIM</th>
                  <th>Nama</th>
                  <th>Fakultas</th>
                  <th>Prodi</th>
                  <th>Kelompok</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.nim}>
                    <td>{p.nim}</td>
                    <td><strong>{p.nama}</strong></td>
                    <td>{p.fakultas}</td>
                    <td>{p.prodi}</td>
                    <td>{p.kelompok}</td>
                    <td>
                      <span className={`badge ${p.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => openEdit(p)}>
                        Edit
                      </button>{' '}
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => confirmDelete(p)}
                      >
                        Nonaktifkan
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>
                      Tidak ada data peserta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" style={{ padding: '6px 12px' }} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
              {page} / {totalPages}
            </span>
            <button className="btn btn-outline" style={{ padding: '6px 12px' }} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingNim ? 'Edit Peserta' : 'Tambah Peserta'}</h3>
            <label>NIM *</label>
            <input
              type="text"
              value={form.nim}
              disabled={!!editingNim}
              onChange={(e) => setForm({ ...form, nim: e.target.value })}
              placeholder="Nomor Induk Mahasiswa"
            />
            <label>Nama *</label>
            <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" />
            <label>Fakultas</label>
            <input type="text" value={form.fakultas} onChange={(e) => setForm({ ...form, fakultas: e.target.value })} />
            <label>Prodi</label>
            <input type="text" value={form.prodi} onChange={(e) => setForm({ ...form, prodi: e.target.value })} />
            <label>Kelompok</label>
            <input type="text" value={form.kelompok} onChange={(e) => setForm({ ...form, kelompok: e.target.value })} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size={16} /> : 'Simpan'}
              </button>
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && confirmTarget && (
        <div className="modal-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Konfirmasi {hardDelete ? 'Hapus Permanen' : 'Nonaktifkan'} Peserta</h3>
            <p>
              Yakin {hardDelete ? 'menghapus permanen' : 'menonaktifkan'} <strong>{confirmTarget.nama}</strong> (
              {confirmTarget.nim})?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {hardDelete
                ? 'Data ini akan dihapus permanen dan tidak dapat dikembalikan.'
                : 'Peserta tidak akan muncul di pencarian portal peserta, namun histori tetap tersimpan.'}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-danger" onClick={doDelete}>
                {hardDelete ? 'Hapus Permanen' : 'Nonaktifkan'}
              </button>
              <button className="btn btn-outline" onClick={() => setConfirmOpen(false)}>
                Batal
              </button>
              {!hardDelete && (
                <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => confirmDelete(confirmTarget, true)}>
                  Hapus Permanen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
