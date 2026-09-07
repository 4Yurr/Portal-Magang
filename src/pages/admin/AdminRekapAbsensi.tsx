import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { fetchAttendance, fetchParticipants } from '../../services/adminService';
import type { AttendanceRow, Participant } from '../../types';
import { exportToExcel, type ExcelColumn } from '../../utils/excel';

const SESSION_ORDER = ['PAGI', 'SORE'] as const;

type AttendanceKey = `${string}|${(typeof SESSION_ORDER)[number]}`;

type RecapColumn = {
  key: AttendanceKey;
  label: string;
};

function formatColumnDate(date: string): string {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}` : date;
}

function statusShort(status: AttendanceRow['status']): string {
  if (status === 'Hadir') return 'H';
  if (status === 'Izin') return 'I';
  if (status === 'Sakit') return 'S';
  return 'D';
}

export default function AdminRekapAbsensi() {
  const { showToast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [kelompok, setKelompok] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchParticipants({ pageSize: 100000 }), fetchAttendance()])
      .then(([participantResult, attendanceRows]) => {
        if (cancelled) return;
        setParticipants(participantResult.data);
        setAttendance(attendanceRows);
      })
      .catch(() => {
        if (!cancelled) showToast('Gagal memuat rekap absensi.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const filteredAttendance = useMemo(
    () => attendance.filter((row) => (!startDate || row.tanggal >= startDate) && (!endDate || row.tanggal <= endDate)),
    [attendance, endDate, startDate],
  );

  const columns = useMemo<RecapColumn[]>(() => {
    const dates = new Set(filteredAttendance.map((row) => row.tanggal));
    return Array.from(dates)
      .sort()
      .flatMap((date) =>
        SESSION_ORDER.map((session) => ({
          key: `${date}|${session}` as AttendanceKey,
          label: `${formatColumnDate(date)} ${session === 'PAGI' ? 'Pagi' : 'Sore'}`,
        })),
      );
  }, [filteredAttendance]);

  const filteredParticipants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return participants
      .filter((participant) => !kelompok || participant.kelompok === kelompok)
      .filter((participant) => !query || participant.nim.toLowerCase().includes(query) || participant.nama.toLowerCase().includes(query))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [kelompok, participants, search]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, string>();
    filteredAttendance.forEach((row) => {
      if (row.nim && row.tanggal && row.session) {
        map.set(`${row.nim}|${row.tanggal}|${row.session}`, statusShort(row.status));
      }
    });
    return map;
  }, [filteredAttendance]);

  const handleExport = async () => {
    const exportColumns: ExcelColumn[] = [
      { header: 'NO', key: 'no', width: 8 },
      { header: 'NAMA', key: 'nama', width: 30 },
      { header: 'NIM', key: 'nim', width: 18 },
      ...columns.map((column) => ({ header: column.label, key: column.key, width: 14 })),
    ];
    const exportRows = filteredParticipants.map((participant, index) => {
      const row: Record<string, string | number> = {
        no: index + 1,
        nama: participant.nama,
        nim: participant.nim,
      };
      columns.forEach((column) => {
        const [date, session] = column.key.split('|');
        row[column.key] = attendanceMap.get(`${participant.nim}|${date}|${session}`) ?? '-';
      });
      return row;
    });
    const result = await exportToExcel(exportColumns, exportRows, 'Rekap_Absen_Biasa.xlsx');
    showToast(result.message, result.success ? 'success' : 'error');
  };

  return (
    <div>
      <h2 className="admin-title">Absen Biasa</h2>
      <div className="panel">
        <div className="panel-toolbar">
          <div className="toolbar-field">
            <label>Dari Tanggal</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="toolbar-field">
            <label>Sampai Tanggal</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <div className="toolbar-field">
            <label>Kelompok</label>
            <select value={kelompok} onChange={(event) => setKelompok(event.target.value)}>
              <option value="">Semua</option>
              {Array.from({ length: 10 }, (_, index) => (
                <option key={index + 1} value={String(index + 1)}>
                  Kelompok {index + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="toolbar-field">
            <label>Search</label>
            <input type="text" placeholder="Cari NIM / Nama" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button className="btn btn-accent" onClick={handleExport} disabled={loading || filteredParticipants.length === 0}>
            Download Rekap Excel
          </button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div>
          ) : (
            <table className="data-table recap-table">
              <thead>
                <tr>
                  <th>NO</th>
                  <th>NAMA</th>
                  <th>NIM</th>
                  {columns.map((column) => <th key={column.key}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((participant, index) => (
                  <tr key={participant.nim}>
                    <td>{index + 1}</td>
                    <td><strong>{participant.nama}</strong></td>
                    <td>{participant.nim}</td>
                    {columns.map((column) => {
                      const [date, session] = column.key.split('|');
                      return <td key={column.key}>{attendanceMap.get(`${participant.nim}|${date}|${session}`) ?? '-'}</td>;
                    })}
                  </tr>
                ))}
                {filteredParticipants.length === 0 && (
                  <tr><td colSpan={columns.length + 3} style={{ textAlign: 'center', padding: 30 }}>Tidak ada data peserta.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
