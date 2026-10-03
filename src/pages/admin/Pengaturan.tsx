import { useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { AppIcon } from '../../components/ui/AppIcon';
import { fetchAttendanceSettings, upsertAttendanceSetting } from '../../services/adminService';

const defaultForm = { open_time: '08:00', close_time: '17:00' };
type SettingForm = typeof defaultForm;

export default function Pengaturan() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<SettingForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const setting = await fetchAttendanceSettings();
      if (setting) setForm({ open_time: setting.open_time.slice(0, 5), close_time: setting.close_time.slice(0, 5) });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await upsertAttendanceSetting({
      open_time: form.open_time + ':00',
      close_time: form.close_time + ':00',
    });
    setSaving(false);
    if (error) {
      console.error('upsertAttendanceSetting error:', error);
      showToast(`Gagal menyimpan pengaturan jadwal absensi: ${error.message}`, 'error');
      return;
    }
    showToast('Jam absensi berhasil diperbarui', 'success');
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <Spinner size={32} />
      </div>
    );
  }

  const invalidWindow = form.open_time >= form.close_time;

  return (
    <div className="settings-page">
      <div className="page-header settings-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2 className="admin-title">Pengaturan Absensi</h2>
        </div>
      </div>

      <div className="panel settings-panel">
        <div className="panel-toolbar settings-toolbar">
          <div className="settings-toolbar-title">
            <AppIcon name="settings" size={18} />
            <strong>Jadwal Absensi Server</strong>
          </div>
        </div>

        <div className="settings-form-wrap">
          <div className="settings-form-grid">
            <div className="field-group">
              <label>Jam Buka</label>
              <input
                type="time"
                value={form.open_time}
                onChange={(event) => setForm((prev) => ({ ...prev, open_time: event.target.value }))}
              />
            </div>

            <div className="field-group">
              <label>Jam Tutup</label>
              <input
                type="time"
                value={form.close_time}
                onChange={(event) => setForm((prev) => ({ ...prev, close_time: event.target.value }))}
              />
            </div>
          </div>

          <div className="settings-actions">
            {invalidWindow && (
              <p className="settings-warning">
                Jam tutup harus lebih besar dari jam buka agar sistem absensi berfungsi dengan benar.
              </p>
            )}

            <button className="btn btn-primary" onClick={save} disabled={saving || invalidWindow}>
              {saving ? <Spinner size={14} /> : 'Simpan Jam Absensi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
