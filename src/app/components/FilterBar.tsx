'use client';

import { useRef } from 'react';
import type { Category } from '@/lib/types';

export interface Filters {
  q: string;
  categoryId: string;
  favorite: boolean;
  unread: boolean;
  tag?: string;
}

interface FilterBarProps {
  categories: Category[];
  filters: Filters;
  /** Called immediately for non-search changes; debounced for search (q) */
  onChange: (f: Filters) => void;
  /** Called after debounce for search — triggers actual fetch */
  onSearchCommit: (q: string) => void;
}

export default function FilterBar({ categories, filters, onChange, onSearchCommit }: FilterBarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(val: string) {
    // Update the displayed value immediately (no local state needed — parent owns it)
    onChange({ ...filters, q: val });
    // Debounce the actual fetch
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchCommit(val);
    }, 350);
  }

  function setCategory(id: string) {
    onChange({ ...filters, categoryId: id });
  }

  function toggleFavorite() {
    onChange({ ...filters, favorite: !filters.favorite });
  }

  function toggleUnread() {
    onChange({ ...filters, unread: !filters.unread });
  }

  const tabClass = (active: boolean) =>
    [
      'shrink-0 px-3 py-1.5 text-[11px] font-mono tracking-[0.06em] uppercase transition-colors',
      'rounded-lg whitespace-nowrap',
      active
        ? 'bg-[var(--indigo)] text-white'
        : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]',
    ].join(' ');

  const toggleClass = (active: boolean) =>
    [
      'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors',
      'text-[11px] font-mono tracking-[0.06em] uppercase',
      active
        ? 'ring-1'
        : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]',
    ].join(' ');

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Search input */}
      <div className="relative sm:w-52 shrink-0">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
          style={{ color: 'var(--muted)' }}
          fill="none" stroke="currentColor" strokeWidth={2}
          viewBox="0 0 24 24" aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={filters.q}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar…"
          className={[
            'w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border transition-colors',
            'border-[var(--line)] bg-[var(--surface)]',
            'placeholder:text-[var(--muted)]',
            'focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/20',
          ].join(' ')}
        />
      </div>

      {/* Category tabs — scrollable */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setCategory('')}
            className={tabClass(filters.categoryId === '')}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={tabClass(filters.categoryId === c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={toggleFavorite}
          className={toggleClass(filters.favorite)}
          aria-pressed={filters.favorite}
          style={filters.favorite ? {
            background: 'rgba(255,92,73,0.1)',
            color: 'var(--coral)',
            outline: '1px solid rgba(255,92,73,0.3)',
          } : {}}
        >
          <span aria-hidden="true">♥</span>
          Favoritos
        </button>
        <button
          onClick={toggleUnread}
          className={toggleClass(filters.unread)}
          aria-pressed={filters.unread}
          style={filters.unread ? {
            background: 'rgba(85,56,238,0.1)',
            color: 'var(--indigo)',
            outline: '1px solid var(--indigo)',
            outlineOffset: '0px',
          } : {}}
        >
          <span aria-hidden="true">◷</span>
          Não lidos
        </button>
      </div>

      {/* Active tag pill */}
      {filters.tag && (
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
            style={{
              fontFamily: 'var(--font-mono)',
              background: 'rgba(85,56,238,0.1)',
              color: 'var(--indigo)',
              border: '1px solid rgba(85,56,238,0.3)',
            }}
          >
            #{filters.tag}
            <button
              type="button"
              onClick={() => onChange({ ...filters, tag: undefined })}
              className="leading-none hover:opacity-70 transition-opacity ml-0.5"
              aria-label="Remover filtro de tag"
            >
              ✕
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
