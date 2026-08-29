// Debounced participant search hook.

import { useEffect, useState } from 'react';
import { searchParticipants } from '../services/participantService';

export type ParticipantOption = {
  nim: string;
  nama: string;
  fakultas: string;
  prodi: string;
  kelompok: string;
};

export function useParticipantSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ParticipantOption[]>([]);
  const [selected, setSelected] = useState<ParticipantOption | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounce queries to the database
  useEffect(() => {
    if (!query.trim() || query.trim().length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      const res = await searchParticipants(query);
      setResults(res);
      setLoading(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const select = (p: ParticipantOption) => {
    setSelected(p);
    setQuery(`${p.nim} - ${p.nama}`);
    setResults([]);
  };

  const clear = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
  };

  return { query, setQuery, results, selected, select, clear, loading };
}
