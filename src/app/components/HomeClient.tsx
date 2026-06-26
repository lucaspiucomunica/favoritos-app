'use client';

import { useCallback, useState } from 'react';
import type { Category, Link } from '@/lib/types';
import AddLinkForm from './AddLinkForm';
import FilterBar, { type Filters } from './FilterBar';
import LinkCard from './LinkCard';

interface HomeClientProps {
  initialLinks: Link[];
  initialCategories: Category[];
  initialTags: string[];
  loadError: boolean;
}

export default function HomeClient({
  initialLinks,
  initialCategories,
  // initialTags available for future tag suggestions; tag filtering is driven by card clicks
  loadError,
}: HomeClientProps) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [filters, setFilters] = useState<Filters>({
    q: '',
    categoryId: '',
    favorite: false,
    unread: false,
    tag: undefined,
  });
  const [fetching, setFetching] = useState(false);

  const fetchLinks = useCallback(async (f: Filters) => {
    setFetching(true);
    try {
      const sp = new URLSearchParams();
      if (f.q) sp.set('q', f.q);
      if (f.categoryId) sp.set('category', f.categoryId);
      if (f.favorite) sp.set('favorite', '1');
      if (f.unread) sp.set('unread', '1');
      if (f.tag) sp.set('tag', f.tag);

      const res = await fetch(`/api/links?${sp.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links);
      }
    } finally {
      setFetching(false);
    }
  }, []);

  /**
   * Called for every filter change. For non-search changes, triggers fetch immediately.
   * For search (q), only updates local state — onSearchCommit triggers the fetch.
   */
  function handleFilterChange(f: Filters) {
    const searchChanged = f.q !== filters.q;
    setFilters(f);
    if (!searchChanged) {
      void fetchLinks(f);
    }
  }

  /** Called after debounce when search input settles */
  function handleSearchCommit(q: string) {
    const current = { ...filters, q };
    setFilters(current);
    void fetchLinks(current);
  }

  // Refresh categories when a new one is created inside EditLinkDialog
  async function refreshCategories() {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
      }
    } catch {
      // best-effort
    }
  }

  function handleAdd(link: Link) {
    setLinks((prev) => [link, ...prev]);
  }

  function handleUpdate(updated: Link) {
    setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    // If the link gained a new category not yet in our list, refresh
    if (updated.category_id && !categories.find((c) => c.id === updated.category_id)) {
      void refreshCategories();
    }
  }

  function handleDelete(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function handleTagClick(tag: string) {
    const next = { ...filters, tag };
    setFilters(next);
    void fetchLinks(next);
  }

  const isEmpty = !loadError && !fetching && links.length === 0;
  const noFiltersActive = !filters.q && !filters.categoryId && !filters.favorite && !filters.unread && !filters.tag;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--paper)' }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10"
        style={{
          background: 'rgba(242,241,246,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <span
            className="text-xl font-semibold tracking-tight select-none"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            Favoritos
          </span>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/auth', { method: 'DELETE' }).catch(() => {});
              window.location.href = '/login';
            }}
            className="text-xs transition-colors"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}
          >
            sair
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* ── Load error banner ── */}
        {loadError && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              background: 'rgba(255,92,73,0.08)',
              border: '1px solid rgba(255,92,73,0.2)',
              color: 'var(--coral)',
              fontFamily: 'var(--font-body)',
            }}
            role="alert"
          >
            Não foi possível carregar seus links. Verifique a conexão com o banco.
          </div>
        )}

        {/* ── Capture bar (hero) ── */}
        <section
          className="rounded-2xl p-5 sm:p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <AddLinkForm onAdd={handleAdd} />
        </section>

        {/* ── Filters ── */}
        {!loadError && (
          <FilterBar
            categories={categories}
            filters={filters}
            onChange={handleFilterChange}
            onSearchCommit={handleSearchCommit}
          />
        )}

        {/* ── Link grid ── */}
        {!loadError && (
          <>
            {fetching && links.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="rounded-2xl overflow-hidden shimmer"
                    style={{ height: '280px', border: '1px solid var(--line)' }}
                  />
                ))}
              </div>
            )}

            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                {noFiltersActive ? (
                  <>
                    <span
                      className="text-4xl select-none"
                      style={{ opacity: 0.25 }}
                      aria-hidden="true"
                    >
                      ⌗
                    </span>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
                    >
                      Nada salvo ainda. Cole seu primeiro link acima.
                    </p>
                  </>
                ) : (
                  <p
                    className="text-sm"
                    style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
                  >
                    Nenhum link encontrado com esses filtros.
                  </p>
                )}
              </div>
            )}

            {links.length > 0 && (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  opacity: fetching ? 0.6 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {links.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    categories={categories}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onTagClick={handleTagClick}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
