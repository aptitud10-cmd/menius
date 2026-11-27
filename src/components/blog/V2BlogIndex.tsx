'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { BlogPost } from '@/lib/blog-data';

/**
 * Índice del blog (fase 2): sin fotos, un índice tipográfico. El primero de la
 * lista (el destacado) va en un panel de papel; el resto en grilla 3 / 2 / 1
 * con filetes. El filtro por categoría es el mismo que el de BlogGrid.
 */

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function uiText(locale: string) {
  if (locale === 'en') return {
    all: 'All',
    read: 'Read →',
    minRead: 'min read',
    noArticles: 'No articles in this category.',
    filterLabel: 'Filter by category',
  };
  return {
    all: 'Todos',
    read: 'Leer →',
    minRead: 'min de lectura',
    noArticles: 'No hay artículos en esta categoría.',
    filterLabel: 'Filtrar por categoría',
  };
}

export function V2BlogIndex({ posts, categories, locale }: { posts: BlogPost[]; categories: string[]; locale: 'es' | 'en' }) {
  const [active, setActive] = useState<string | null>(null);
  const ui = uiText(locale);
  const filtered = active ? posts.filter((p) => p.category === active) : posts;
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="blog">
      <div className="wrap">
        <div className="blog-filter" role="group" aria-label={ui.filterLabel}>
          <button type="button" aria-pressed={active === null} onClick={() => setActive(null)}>
            {ui.all} <span>{posts.length}</span>
          </button>
          {categories.map((cat) => (
            <button key={cat} type="button" aria-pressed={active === cat} onClick={() => setActive(cat)}>
              {cat} <span>{posts.filter((p) => p.category === cat).length}</span>
            </button>
          ))}
        </div>

        {featured && (
          <Link className="feat" href={`/blog/${featured.slug}`}>
            <div>
              <p className="kicker">
                <b>{featured.category}</b>
                <i aria-hidden="true" />
                {featured.readTime} {ui.minRead}
                <i className="dd" aria-hidden="true" />
                <span className="d">{formatDate(featured.date, locale)}</span>
              </p>
              <h2>{featured.title}</h2>
            </div>
            <div>
              <p>{featured.description}</p>
              <span className="tlink go">{ui.read}</span>
            </div>
          </Link>
        )}

        {rest.length > 0 && (
          <ul className="posts">
            {rest.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`}>
                  <p className="kicker"><b>{post.category}</b></p>
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                  <span className="meta">{post.readTime} min · {formatDate(post.date, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {filtered.length === 0 && <p className="empty">{ui.noArticles}</p>}
      </div>
    </div>
  );
}
