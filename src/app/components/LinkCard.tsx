'use client';

import { useState } from 'react';
import type { Category, Link } from '@/lib/types';
import EditLinkDialog from './EditLinkDialog';

interface LinkCardProps {
  link: Link;
  categories: Category[];
  onUpdate: (updated: Link) => void;
  onDelete: (id: string) => void;
}

function getDomainInitial(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname.charAt(0).toUpperCase();
  } catch {
    return '?';
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LinkCard({ link, categories, onUpdate, onDelete }: LinkCardProps) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // which action is busy

  const category = categories.find((c) => c.id === link.category_id);

  async function toggleFavorite() {
    if (busy) return;
    setBusy('favorite');
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_favorite: !link.is_favorite }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.link);
      }
    } finally {
      setBusy(null);
    }
  }

  async function toggleRead() {
    if (busy) return;
    setBusy('read');
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_read: !link.is_read }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.link);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm('Excluir este link?')) return;
    if (busy) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/links/${link.id}`, { method: 'DELETE' });
      if (res.ok) onDelete(link.id);
    } finally {
      setBusy(null);
    }
  }

  async function reclassify() {
    if (busy) return;
    setBusy('reclassify');
    try {
      const res = await fetch(`/api/links/${link.id}/reclassify`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.link);
      }
    } finally {
      setBusy(null);
    }
  }

  const domain = getDomain(link.url);
  const initial = getDomainInitial(link.url);
  const date = formatDate(link.created_at);

  return (
    <>
      <article
        className="relative bg-[var(--surface)] rounded-2xl overflow-hidden flex flex-col"
        style={{
          border: '1px solid var(--line)',
          boxShadow: '0 1px 3px rgba(36,27,46,0.06)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(36,27,46,0.1)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = '';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(36,27,46,0.06)';
        }}
      >
        {/* ── Bookmark Ribbon (signature) ── */}
        {link.is_favorite && (
          <div className="ribbon" aria-hidden="true" />
        )}

        {/* ── OG Image or Placeholder ── */}
        <div
          className="w-full overflow-hidden"
          style={{ aspectRatio: '16 / 10', flexShrink: 0, background: 'var(--paper)' }}
        >
          {link.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={link.image_url}
              alt={link.title ?? domain}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'var(--indigo)' }}
            >
              <span
                className="font-bold text-white select-none"
                style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', opacity: 0.9 }}
              >
                {initial}
              </span>
            </div>
          )}
        </div>

        {/* ── Card body ── */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          {/* Title */}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block leading-snug hover:underline decoration-[var(--indigo)]/40"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '15px',
              letterSpacing: '-0.015em',
              color: 'var(--ink)',
            }}
          >
            {link.title ?? domain}
          </a>

          {/* Description */}
          {link.description && (
            <p
              className="text-sm leading-relaxed line-clamp-2"
              style={{ color: 'var(--muted)', fontSize: '13px' }}
            >
              {link.description}
            </p>
          )}

          {/* Meta: domain · date */}
          <p
            className="text-[11px] uppercase tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
          >
            {domain} · {date}
          </p>

          {/* Category badge */}
          {category && (
            <span
              className="self-start text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-md"
              style={{
                fontFamily: 'var(--font-mono)',
                background: 'var(--paper)',
                color: 'var(--muted)',
                border: '1px solid var(--line)',
              }}
            >
              {category.name}
            </span>
          )}

          {/* Tags */}
          {link.tags && link.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {link.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(85,56,238,0.08)',
                    color: 'var(--indigo)',
                    border: '1px solid rgba(85,56,238,0.2)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* AI failed state */}
          {link.ai_status === 'failed' && (
            <div className="flex items-center gap-2 mt-1 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
              >
                Não classificado
              </span>
              <button
                onClick={reclassify}
                disabled={busy === 'reclassify'}
                className="text-[10px] px-2 py-0.5 rounded transition-colors font-mono uppercase tracking-wider"
                style={{ color: 'var(--indigo)', border: '1px solid var(--indigo)/30' }}
              >
                {busy === 'reclassify' ? '…' : 'Reclassificar'}
              </button>
            </div>
          )}

          {/* Spacer to push actions to bottom */}
          <div className="flex-1" />

          {/* ── Action bar ── */}
          <div
            className="flex items-center gap-1 pt-2 -mx-1"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            {/* Favorite */}
            <ActionButton
              onClick={toggleFavorite}
              busy={busy === 'favorite'}
              active={link.is_favorite}
              activeColor="var(--coral)"
              label={link.is_favorite ? 'Remover dos favoritos' : 'Favoritar'}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill={link.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              }
            />

            {/* Read */}
            <ActionButton
              onClick={toggleRead}
              busy={busy === 'read'}
              active={link.is_read}
              activeColor="var(--indigo)"
              label={link.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  {link.is_read ? (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="4" y1="4" x2="20" y2="20" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              }
            />

            {/* Edit */}
            <ActionButton
              onClick={() => setEditing(true)}
              busy={false}
              active={false}
              label="Editar"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              }
            />

            {/* Delete */}
            <ActionButton
              onClick={handleDelete}
              busy={busy === 'delete'}
              active={false}
              activeColor="var(--coral)"
              label="Excluir"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              }
            />

            <div className="flex-1" />

            {/* Read status indicator */}
            {!link.is_read && (
              <span
                className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--indigo)/10',
                  color: 'var(--indigo)',
                }}
              >
                Não lido
              </span>
            )}
          </div>
        </div>
      </article>

      {editing && (
        <EditLinkDialog
          link={link}
          categories={categories}
          onClose={() => setEditing(false)}
          onSave={(updated) => {
            onUpdate(updated);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  busy: boolean;
  active: boolean;
  activeColor?: string;
  label: string;
  icon: React.ReactNode;
}

function ActionButton({ onClick, busy, active, activeColor, label, icon }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className={[
        'p-1.5 rounded-lg transition-colors',
        active
          ? 'bg-transparent'
          : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]',
        busy ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
      style={active && activeColor ? { color: activeColor } : undefined}
    >
      {icon}
    </button>
  );
}
