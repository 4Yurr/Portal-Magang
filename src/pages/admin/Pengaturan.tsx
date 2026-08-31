import { useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { fetchAttendanceSettings, upsertAttendanceSetting, fetchAuditLogs } from '../../services/adminService';

type SettingForm = {
  PAGI: { start_time: string; end_time: string; active_date_start: string; active_date_end: string; is_active: boolean };
  SORE: { start_time: string; end_time: string; active_date_start: string; active_date_end: string; is_active: boolean };
};

const defaultForm: SettingForm = {
  PAGI: { start_time: '08:00', end_time: '09:30', active_date_start: '', active_date_end: '', is_active: true },
  SORE: { start_time: '15:30', end_time: '17:00', active_date_start: '', active_date_end: '', is_active: true },
};

export default function Pengaturan() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<SettingForm>(defaultForm);
  const [logs, setLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [settings, audit] = await Promise.all([fetchAttendanceSettings(), fetchAuditLogs(10)]);
      const next: SettingForm = { ...defaultForm };
      settings.forEach((setting) => {
        const key = setting.session as 'PAGI' | 'SORE';
        next[key] = {
          start_time: setting.start_time.slice(0, 5),
          end_time: setting.end_time.slice(0, 5),
          active_date_start: setting.active_date_start ?? '',
          active_date_end: setting.active_date_end ?? '',
          is_active: setting.is_active,
        };
      });
      setForm(next);
      setLogs(audit);
      setLoading(false);
    })();
  }, []);

  const save = async (session: 'PAGI' | 'SORE') => {
    setSaving(true);
    const payload = form[session];
    const { error } = await upsertAttendanceSetting({
      session,
      start_time: payload.start_time + ':00',
      end_time: payload.end_time + ':00',
      active_date_start: payload.active_date_start || null,
      active_date_end: payload.active_date_end || null,
      is_active: payload.is_active,
    });
    setSaving(false);
    if (error) {
      console.error('upsertAttendanceSetting error:', error);
      showToast(`Gagal menyimpan pengaturan jadwal absensi: ${error.message}`, 'error');
      return;
    }
    showToast(`Jadwal ${session} berhasil diperbarui`, 'success');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="admin-title">Pengaturan Absensi</h2>

      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-toolbar">
          <strong>Jadwal Absensi Server</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {(['PAGI', 'SORE'] as const).map((session) => (
            <div key={session} className="panel" style={{ padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>{session === 'PAGI' ? 'Sesi Pagi' : 'Sesi Sore'}</h3>
              <label>Jam Buka</label>
              <input
                type="time"
                value={form[session].start_time}
                onChange={(e) => setForm((prev) => ({ ...prev, [session]: { ...prev[session], start_time: e.target.value } }))}
              />

              <label>Jam Tutup</label>
              <input
                type="time"
                value={form[session].end_time}
                onChange={(e) => setForm((prev) => ({ ...prev, [session]: { ...prev[session], end_time: e.target.value } }))}
              />

              <label>Tanggal Mulai</label>
              <input
                type="date"
                value={form[session].active_date_start}
                onChange={(e) => setForm((prev) => ({ ...prev, [session]: { ...prev[session], active_date_start: e.target.value } }))}
              />

              <label>Tanggal Akhir</label>
              <input
                type="date"
                value={form[session].active_date_end}
                onChange={(e) => setForm((prev) => ({ ...prev, [session]: { ...prev[session], active_date_end: e.target.value } }))}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form[session].is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, [session]: { ...prev[session], is_active: e.target.checked } }))}
                />
                Aktif
              </label>

              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => save(session)} disabled={saving}>
                {saving ? <Spinner size={14} /> : 'Simpan Jadwal'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-toolbar">
          <strong>Audit Log Terbaru</strong>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Admin</th>
                <th>Table</th>
                <th>Action</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Belum ada audit log.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                    <td>{log.actor_email ?? '-'}</td>
                    <td>{log.table_name}</td>
                    <td>{log.action}</td>
                    <td>{log.record_id ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
