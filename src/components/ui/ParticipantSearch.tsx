// Searchable participant selector (NIM). Debounced DB search, no long dropdown.

import { useRef, useState } from 'react';
import { useParticipantSearch } from '../../hooks/useParticipantSearch';
import { Spinner } from './Spinner';

type Props = {
  onSelect: (p: { nim: string; nama: string; fakultas: string; prodi: string; kelompok: string }) => void;
  placeholder?: string;
  clearKey?: unknown;
};

export function ParticipantSearch({ onSelect, placeholder, clearKey }: Props) {
  const { query, setQuery, results, selected, select, clear, loading } = useParticipantSearch();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset external "form reset" — when parent passes a new clearKey
  const prevKey = useRef<unknown>(null);
  if (prevKey.current !== clearKey) {
    prevKey.current = clearKey;
    clear();
  }

  const handleSelect = (p: (typeof results)[number]) => {
    select(p);
    onSelect(p);
    setOpen(false);
  };

  const handleClear = () => {
    clear();
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div className="searchable-select">
      <div className="search-input-box">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder ?? 'Ketik NIM atau nama peserta'}
          autoComplete="off"
          spellCheck={false}
          onFocus={() => {
            if (query && !selected) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {loading && <Spinner size={16} />}
        {selected && (
          <button type="button" className="btn-clear-search" onClick={handleClear} title="Hapus">
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="search-dropdown">
          {results.map((p) => (
            <div
              key={p.nim}
              className="search-item"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(p);
              }}
            >
              <span className="item-nim">{p.nim}</span>
              <span className="item-name">{p.nama}</span>
            </div>
          ))}
        </div>
      )}

      {open && !loading && query.trim() && results.length === 0 && !selected && (
        <div className="search-dropdown">
          <div className="search-empty">Peserta tidak ditemukan</div>
        </div>
      )}
    </div>
  );
}
