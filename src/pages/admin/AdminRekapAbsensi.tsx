import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { fetchAttendance, fetchParticipants, updateAttendanceStatus } from '../../services/adminService';
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
                            <span className="attendance-empty">-</span>
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

    </div>
  );
}

function statusCode(status: AttendanceStatus): string {
  if (status === 'Hadir') return 'H';
  if (status === 'Izin') return 'I';
  if (status === 'Sakit') return 'S';
  return 'D';
}