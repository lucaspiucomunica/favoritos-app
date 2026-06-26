'use client';

import { useEffect, useRef, useState } from 'react';
import type { Category, Link } from '@/lib/types';

interface EditLinkDialogProps {
  link: Link;
  categories: Category[];
  onClose: () => void;
  onSave: (updated: Link) => void;
}

export default function EditLinkDialog({ link, categories, onClose, onSave }: EditLinkDialogProps) {
  const [cats, setCats] = useState<Category[]>(categories);
  const [categoryId, setCategoryId] = useState<string>(link.category_id ?? '');
  const [tags, setTags] = useState<string[]>(link.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstFocusRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    el.showModal();
    firstFocusRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      el.close();
    };
  }, [onClose]);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!t || tags.includes(t)) { setTagInput(''); return; }
    setTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  async function createCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setCreatingCat(true);
    setError('');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok && res.status !== 409) {
        setError('Não foi possível criar a categoria.');
        return;
      }
      const data = await res.json();
      const newCat: Category = data.category;
      setCats((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(newCat.id);
      setNewCatName('');
      setShowNewCat(false);
    } catch {
      setError('Erro de conexão.');
    } finally {
      setCreatingCat(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { tags };
      // Always include category_id (even null) so PATCH uses setCategory path
      body.category_id = categoryId === '' ? null : categoryId;

      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Erro ao salvar.');
        return;
      }
      const data = await res.json();
      onSave(data.link);
      onClose();
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
      className="m-auto max-w-md w-full rounded-2xl p-0 shadow-2xl backdrop:bg-[var(--ink)]/40 backdrop:backdrop-blur-sm"
      style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2
            className="text-lg font-semibold leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', letterSpacing: '-0.01em' }}
          >
            Editar link
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors p-0.5 -mt-0.5 -mr-0.5"
            aria-label="Fechar"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* URL read-only */}
        <p
          className="text-xs mb-5 truncate"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', letterSpacing: '0.02em' }}
          title={link.url}
        >
          {link.url}
        </p>

        {/* Category */}
        <div className="mb-4">
          <label
            className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
          >
            Categoria
          </label>
          <select
            ref={firstFocusRef}
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setShowNewCat(false); }}
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
              'border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]',
              'focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/20',
            ].join(' ')}
          >
            <option value="">Sem categoria</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewCat(!showNewCat)}
            className="mt-1.5 text-xs transition-colors"
            style={{ color: 'var(--indigo)' }}
          >
            {showNewCat ? '× Cancelar nova categoria' : '+ Criar nova categoria'}
          </button>
          {showNewCat && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory(); } }}
                placeholder="Nome da categoria"
                className={[
                  'flex-1 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  'border-[var(--line)] bg-[var(--surface)]',
                  'focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/20',
                ].join(' ')}
                autoFocus
              />
              <button
                type="button"
                onClick={createCategory}
                disabled={creatingCat || !newCatName.trim()}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-white transition-colors bg-[var(--indigo)] hover:bg-[#4429d4] disabled:opacity-40"
              >
                {creatingCat ? '…' : 'Criar'}
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mb-5">
          <label
            className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
          >
            Tags
          </label>
          <div
            className={[
              'flex flex-wrap gap-1.5 p-2 rounded-lg border min-h-[42px] transition-colors cursor-text',
              'border-[var(--line)] bg-[var(--surface)]',
              'focus-within:border-[var(--indigo)] focus-within:ring-2 focus-within:ring-[var(--indigo)]/20',
            ].join(' ')}
            onClick={() => document.getElementById('tag-input')?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--paper)',
                  color: 'var(--muted)',
                  border: '1px solid var(--line)',
                }}
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-[var(--muted)] hover:text-[var(--coral)] transition-colors leading-none"
                  aria-label={`Remover tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder={tags.length === 0 ? 'Adicionar tag…' : ''}
              className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Enter ou vírgula para adicionar. Backspace para remover.
          </p>
        </div>

        {error && (
          <p className="mb-4 text-xs text-[var(--coral)]" role="alert">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className={[
              'px-4 py-2 text-sm rounded-lg border transition-colors',
              'border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]',
            ].join(' ')}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg text-white transition-colors bg-[var(--indigo)] hover:bg-[#4429d4] disabled:opacity-40"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
