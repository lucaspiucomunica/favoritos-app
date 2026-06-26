'use client';

import { useState, useRef } from 'react';
import type { Link } from '@/lib/types';

interface AddLinkFormProps {
  onAdd: (link: Link) => void;
}

export default function AddLinkForm({ onAdd }: AddLinkFormProps) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Erro ao salvar o link.');
        return;
      }

      const data = await res.json();
      onAdd(data.link);
      setUrl('');
      inputRef.current?.focus();
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="Cole um link para salvar…"
            disabled={busy}
            className={[
              'w-full rounded-xl border px-4 py-3 text-sm transition-colors',
              'placeholder:text-[var(--muted)]',
              'border-[var(--line)] bg-[var(--surface)]',
              'focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/20',
              busy ? 'shimmer border-[var(--indigo)]/30' : '',
            ].join(' ')}
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className={[
            'shrink-0 rounded-xl px-5 py-3 text-sm font-medium text-white transition-all',
            'bg-[var(--indigo)] hover:bg-[#4429d4] active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--indigo)] focus-visible:outline-offset-2',
          ].join(' ')}
        >
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </form>

      {busy && (
        <p className="mt-2 text-xs text-[var(--muted)]" aria-live="polite">
          Salvando e classificando…
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-[var(--coral)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
