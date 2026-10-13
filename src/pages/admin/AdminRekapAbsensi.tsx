import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { fetchAttendance, fetchParticipants, updateAttendanceStatus, createManualAttendance } from '../../services/adminService';
import type { AttendanceRow, AttendanceStatus, Participant } from '../../types';
import { exportToExcel } from '../../utils/excel';
import { wibDateString } from '../../utils/constants';

function currentMonth(): string {
  return wibDateString().slice(0, 7);
}

function monthBounds(month: string): { startDate: string; endDateExclusive: string } {
  const selectedMonth = /^\d{4}-\d{2}$/.test(month) ? month : currentMonth();
  const [year, monthNumber] = selectedMonth.split('-').map(Number);
  return {
    startDate: `${selectedMonth}-01`,
    endDateExclusive: new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10),
  };
}

export default function AdminRekapAbsensi() {
  const { showToast } = useToast();
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [kelompok, setKelompok] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualParticipantId, setManualParticipantId] = useState('');
  const [manualParticipantSearch, setManualParticipantSearch] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('08:00');
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('Hadir');
  const [manualReason, setManualReason] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const bounds = monthBounds(month);
    setLoading(true);
    Promise.all([fetchAttendance(bounds), fetchParticipants({})])
      .then(([rows, participantResult]) => {
        if (!cancelled) {
          setAttendance(rows);
          setParticipants(participantResult.data);
        }
      })
      .catch(() => {
        if (!cancelled) showToast('Gagal memuat absensi bulan ini.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, showToast]);

  const monthDates = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
  }, [month]);

  const attendanceByParticipantDate = useMemo(() => new Map(
    attendance.map((row) => [`${row.nim ?? ''}|${row.tanggal}`, row]),
  ), [attendance]);
  const today = wibDateString();

  const filteredParticipants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return participants.filter((participant) =>
      (!kelompok || participant.kelompok === kelompok)
      && (!query || participant.nim.toLowerCase().includes(query) || participant.nama.toLowerCase().includes(query)),
    );
  }, [participants, kelompok, search]);

  const saveStatus = async (row: AttendanceRow, status: AttendanceStatus) => {
    setSavingId(row.id);
    try {
      const { error } = await updateAttendanceStatus(row.id, status);
      if (error) {
        showToast('Gagal mengubah status kehadiran.', 'error');
        return;
      }
      setAttendance((rows) => rows.map((item) => item.id === row.id ? { ...item, status } : item));
      showToast('Status kehadiran berhasil diperbarui.', 'success');
    } catch {
      showToast('Gagal mengubah status kehadiran.', 'error');
    } finally {
      setSavingId(null);
      setEditingCell(null);
    }
  };

  const openManualAttendance = (participantId = '', date?: string) => {
    setManualParticipantId(participantId);
    setManualParticipantSearch('');
    setManualDate(date ?? (month >= currentMonth() ? today : `${month}-01`));
    setManualTime('08:00');
    setManualStatus('Hadir');
    setManualReason('');
    setManualModalOpen(true);
  };

  const saveManualAttendance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualParticipantId) {
      showToast('Pilih peserta yang akan dicatat kehadirannya.', 'error');
      return;
    }
    if (!manualDate || manualDate > wibDateString()) {
      showToast('Tanggal kehadiran harus hari ini atau tanggal yang sudah lewat.', 'error');
      return;
    }
    if (!manualTime || !manualReason.trim()) {
      showToast('Jam dan alasan pencatatan wajib diisi.', 'error');
      return;
    }

    setSavingManual(true);
    try {
      const { error } = await createManualAttendance({
        participant_id: manualParticipantId,
        tanggal: manualDate,
        jam: `${manualTime}:00`,
        status: manualStatus,
        admin_note: manualReason.trim(),
      });
      if (error) {
        if (error.code === '23505') {
          showToast('Kehadiran peserta pada tanggal tersebut sudah tercatat.', 'error');
        } else if (error.message.includes('ADMIN_ATTENDANCE_REASON_REQUIRED')) {
          showToast('Alasan pencatatan wajib diisi.', 'error');
        } else {
          console.error('createManualAttendance error:', error);
          showToast('Gagal menambahkan kehadiran. Silakan coba lagi.', 'error');
        }
        return;
      }

      showToast('Kehadiran manual berhasil dicatat dan masuk ke audit admin.', 'success');
      setManualModalOpen(false);
      const createdMonth = manualDate.slice(0, 7);
      if (createdMonth !== month) setMonth(createdMonth);
      else {
        try {
          setAttendance(await fetchAttendance(monthBounds(month)));
        } catch (refreshError) {
          console.error('Manual attendance saved but recap refresh failed:', refreshError);
          showToast('Kehadiran tersimpan, tetapi rekap belum diperbarui. Muat ulang halaman.', 'error');
        }
      }
    } catch (error) {
      console.error('createManualAttendance error:', error);
      showToast('Gagal menambahkan kehadiran. Silakan coba lagi.', 'error');
    } finally {
      setSavingManual(false);
    }
  };

  const exportMonth = async () => {
    const columns = [
      { header: 'No', key: 'no' },
      { header: 'Nama', key: 'nama' },
      { header: 'NIM', key: 'nim' },
      ...monthDates.map((date) => ({ header: date.slice(8, 10) + '/' + date.slice(5, 7), key: date })),
    ];
    const result = await exportToExcel(
      columns,
      filteredParticipants.map((participant, index) => {
        const row: Record<string, string | number> = {
          no: index + 1,
          nama: participant.nama,
          nim: participant.nim,
        };
        monthDates.forEach((date) => {
          const entry = attendanceByParticipantDate.get(`${participant.nim}|${date}`);
          row[date] = entry ? statusCode(entry.status) : '-';
        });
        return row;
      }),
      `Absen_Biasa_${month}.xlsx`,
    );
    showToast(result.message, result.success ? 'success' : 'error');
  };

  return (
    <div>
      <h2 className="admin-title">Rekap Absensi Biasa</h2>
      <div className="panel">
        <div className="panel-toolbar">
          <div className="toolbar-field">
            <label>Bulan</label>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <div className="toolbar-field">
            <label>Kelompok</label>
            <select value={kelompok} onChange={(event) => setKelompok(event.target.value)}>
              <option value="">Semua</option>
              {Array.from({ length: 10 }, (_, index) => (
                <option key={index + 1} value={String(index + 1)}>Kelompok {index + 1}</option>
              ))}
            </select>
          </div>
          <div className="toolbar-field">
            <label>Cari peserta</label>
            <input type="text" placeholder="Cari NIM / Nama" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button className="btn btn-accent" onClick={exportMonth} disabled={loading || filteredParticipants.length === 0}>
            Download Excel
          </button>
          <button className="btn btn-primary" type="button" onClick={() => openManualAttendance()}>
            + Tambah Kehadiran
          </button>
          <span className="attendance-recap-count">{filteredParticipants.length} peserta</span>
        </div>

        <div className="table-wrap attendance-recap-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div>
          ) : (
            <table className="data-table attendance-recap-table">
              <thead>
                <tr>
                  <th className="freeze-col freeze-no">No</th>
                  <th className="freeze-col freeze-name">Nama</th>
                  <th className="freeze-col freeze-nim">NIM</th>
                  {monthDates.map((date) => (
                    <th key={date}>{date.slice(8, 10)}/{date.slice(5, 7)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((participant, index) => (
                  <tr key={participant.nim}>
                    <td className="freeze-col freeze-no">{index + 1}</td>
                    <td className="freeze-col freeze-name"><strong>{participant.nama}</strong></td>
                    <td className="freeze-col freeze-nim">{participant.nim}</td>
                    {monthDates.map((date) => {
                      const row = attendanceByParticipantDate.get(`${participant.nim}|${date}`);
                      const cellKey = `${participant.nim}|${date}`;
                      return (
                        <td key={date}>
                          {row ? (
                            <div className="attendance-cell-actions">
                              {editingCell === cellKey ? (
                                <select
                                  aria-label={`Ubah status ${participant.nama} tanggal ${date}`}
                                  autoFocus
                                  value={row.status}
                                  disabled={savingId === row.id}
                                  onBlur={() => setEditingCell(null)}
                                  onChange={(event) => saveStatus(row, event.target.value as AttendanceStatus)}
                                >
                                  <option value="Hadir">Hadir</option>
                                  <option value="Izin">Izin</option>
                                  <option value="Sakit">Sakit</option>
                                  <option value="Ditolak">Ditolak</option>
                                </select>
                              ) : (
                                <button
                                  className={`attendance-status-button status-${statusCode(row.status).toLowerCase()}`}
                                  type="button"
                                  title={`${row.status} - klik untuk mengubah`}
                                  aria-label={`${row.status}, ${participant.nama}, ${date}. Klik untuk mengubah.`}
                                  onClick={() => setEditingCell(cellKey)}
                                  disabled={savingId === row.id}
                                >
                                  {statusCode(row.status)}
                                </button>
                              )}
                            </div>
                          ) : (
                            date <= today ? (
                              <button
                                className="attendance-add-button"
                                type="button"
                                title={`Tambahkan kehadiran ${participant.nama} tanggal ${date}`}
                                aria-label={`Tambahkan kehadiran ${participant.nama} tanggal ${date}`}
                                onClick={() => openManualAttendance(participant.nim, date)}
                              >
                                +
                              </button>
                            ) : (
                              <span className="attendance-empty">-</span>
                            )
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredParticipants.length === 0 && (
                  <tr><td colSpan={3 + monthDates.length} className="attendance-recap-empty">Tidak ada peserta yang cocok dengan filter.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {manualModalOpen && (
        <div className="modal-overlay" onClick={() => !savingManual && setManualModalOpen(false)}>
          <form className="modal manual-attendance-modal" onSubmit={saveManualAttendance} onClick={(event) => event.stopPropagation()}>
            <h3>Tambah Kehadiran Manual</h3>
            <p className="helper-text">
              Gunakan untuk mencatat peserta yang lupa absen. Entri ini akan ditandai sebagai pencatatan admin dan masuk ke audit.
            </p>

            <label htmlFor="manual-attendance-search">Cari peserta</label>
            <input
              id="manual-attendance-search"
              type="text"
              value={manualParticipantSearch}
              onChange={(event) => setManualParticipantSearch(event.target.value)}
              placeholder="Cari berdasarkan NIM atau nama"
              autoComplete="off"
            />
            <label htmlFor="manual-attendance-participant">Peserta *</label>
            <select
              id="manual-attendance-participant"
              required
              value={manualParticipantId}
              onChange={(event) => setManualParticipantId(event.target.value)}
            >
              <option value="">Pilih peserta</option>
              {participants
                .filter((participant) => {
                  const query = manualParticipantSearch.trim().toLowerCase();
                  return !query || participant.nim.toLowerCase().includes(query) || participant.nama.toLowerCase().includes(query);
                })
                .map((participant) => (
                  <option key={participant.nim} value={participant.nim}>
                    {participant.nim} — {participant.nama}
                  </option>
                ))}
            </select>

            <div className="manual-attendance-fields">
              <div>
                <label htmlFor="manual-attendance-date">Tanggal *</label>
                <input
                  id="manual-attendance-date"
                  type="date"
                  required
                  max={wibDateString()}
                  value={manualDate}
                  onChange={(event) => setManualDate(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="manual-attendance-time">Jam kehadiran *</label>
                <input
                  id="manual-attendance-time"
                  type="time"
                  required
                  value={manualTime}
                  onChange={(event) => setManualTime(event.target.value)}
                />
              </div>
            </div>

            <label htmlFor="manual-attendance-status">Status *</label>
            <select
              id="manual-attendance-status"
              value={manualStatus}
              onChange={(event) => setManualStatus(event.target.value as AttendanceStatus)}
            >
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Ditolak">Ditolak</option>
            </select>

            <label htmlFor="manual-attendance-reason">Alasan pencatatan *</label>
            <textarea
              id="manual-attendance-reason"
              required
              rows={3}
              minLength={5}
              value={manualReason}
              onChange={(event) => setManualReason(event.target.value)}
              placeholder="Contoh: Peserta hadir, tetapi lupa melakukan absensi di portal."
            />

            <div className="manual-attendance-actions">
              <button className="btn btn-primary" type="submit" disabled={savingManual}>
                {savingManual ? <><Spinner size={14} /> Menyimpan...</> : 'Simpan Kehadiran'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setManualModalOpen(false)} disabled={savingManual}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

function statusCode(status: AttendanceStatus): string {
  if (status === 'Hadir') return 'H';
  if (status === 'Izin') return 'I';
  if (status === 'Sakit') return 'S';
  return 'D';
}