import Link from 'next/link';
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { LandingV2Locale } from '@/lib/landing-v2-copy';
import { V2Page } from './V2Page';
import { V2ScrollSpy } from './V2ScrollSpy';

/**
 * Plantilla "Documento" (Terms, Privacy, Cookies, Accessibility) de la fase 2.
 *
 * El texto legal NO se toca: cada página sigue escribiendo su contenido en JSX
 * como antes (un <div> con h2/p/ul/table). Acá solo se reparte en secciones por
 * cada <h2>, se arma el índice con esos títulos ("1. Acceptance of Terms" →
 * 01 · "Acceptance of Terms"), las tablas reciben las etiquetas de columna
 * para la vista en fichas del celular, y el bloque de contacto final (una
 * lista "Etiqueta: valor") se muestra como ficha <dl>.
 */

export type LegalDocId = 'terms' | 'privacy' | 'cookies' | 'accessibility';

const TABS: { id: LegalDocId; href: string; en: string; es: string }[] = [
  { id: 'terms', href: '/terms', en: 'Terms', es: 'Términos' },
  { id: 'privacy', href: '/privacy', en: 'Privacy', es: 'Privacidad' },
  { id: 'cookies', href: '/cookies', en: 'Cookies', es: 'Cookies' },
  { id: 'accessibility', href: '/accessibility', en: 'Accessibility', es: 'Accesibilidad' },
];

type El = ReactElement<{ children?: ReactNode; className?: string }>;

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node as El).props.children);
  return '';
}

/** <div className="overflow-x-auto…"><table>…</table></div> → <div className="tbl"> con data-l en cada celda. */
function withTables(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node;
  const el = node as El;
  const kids = Children.toArray(el.props.children);
  const table = kids.find((k) => isValidElement(k) && k.type === 'table') as El | undefined;
  if (el.type !== 'div' || !table) return node;

  const tKids = Children.toArray(table.props.children) as El[];
  const thead = tKids.find((k) => k.type === 'thead');
  const headRow = thead ? (Children.toArray(thead.props.children)[0] as El | undefined) : undefined;
  const labels = headRow ? Children.toArray(headRow.props.children).map((th) => textOf(th).trim()) : [];

  const body = tKids.map((section) => {
    if (section.type !== 'tbody') return section;
    return cloneElement(section, {
      children: Children.toArray(section.props.children).map((tr) => {
        const row = tr as El;
        return cloneElement(row, {
          children: Children.toArray(row.props.children).map((td, i) =>
            isValidElement(td) ? cloneElement(td as El, { 'data-l': labels[i] } as Record<string, string>) : td,
          ),
        });
      }),
    });
  });

  return (
    <div className="tbl" key={el.key ?? undefined}>
      {cloneElement(table, { children: body })}
    </div>
  );
}

/** Lista "<strong>Company:</strong> MENIUS LLC" → ficha <dl>. Solo si TODOS los ítems tienen esa forma. */
function contactCard(node: ReactNode): ReactNode {
  if (!isValidElement(node) || node.type !== 'ul') return node;
  const items = Children.toArray((node as El).props.children) as El[];
  const rows: { dt: string; dd: ReactNode[] }[] = [];
  for (const li of items) {
    const parts = Children.toArray(li.props.children);
    const first = parts[0];
    if (!isValidElement(first) || first.type !== 'strong') return node;
    const label = textOf(first).trim().replace(/:$/, '');
    const rest = parts.slice(1).map((p, i) => (i === 0 && typeof p === 'string' ? p.replace(/^\s+/, '') : p));
    rows.push({ dt: label, dd: rest });
  }
  return (
    <dl className="card-k" key={(node as El).key ?? undefined}>
      {rows.map((r) => [<dt key={`t-${r.dt}`}>{r.dt}</dt>, <dd key={`d-${r.dt}`}>{r.dd}</dd>])}
    </dl>
  );
}

function sectionize(content: ReactElement) {
  const kids = Children.toArray((content as El).props.children);
  const sections: { id: string; n: string; title: string; nodes: ReactNode[] }[] = [];
  for (const k of kids) {
    if (isValidElement(k) && k.type === 'h2') {
      const i = sections.length + 1;
      sections.push({
        id: `s${i}`,
        n: String(i).padStart(2, '0'),
        title: textOf(k).trim().replace(/^\d+\.\s*/, ''),
        nodes: [],
      });
      continue;
    }
    if (!sections.length) {
      sections.push({ id: 's0', n: '', title: '', nodes: [] });
    }
    sections[sections.length - 1].nodes.push(withTables(k));
  }
  const last = sections[sections.length - 1];
  if (last) last.nodes = last.nodes.map(contactCard);
  return sections;
}

export function V2LegalDoc({
  locale,
  doc,
  title,
  updated,
  content,
}: {
  locale: LandingV2Locale;
  doc: LegalDocId;
  title: string;
  updated: string;
  /** El elemento raíz del texto legal (un <div> con h2/p/ul/table como hijos directos). */
  content: ReactElement;
}) {
  const es = locale === 'es';
  const sections = sectionize(content);
  const titled = sections.filter((s) => s.title);
  const onThisPage = es ? 'En esta página' : 'On this page';
  const tocList = (
    <ol>
      {titled.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`}>
            <span>{s.n}</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <V2Page locale={locale}>
      <main id="main-content">
        <header className="ph rule">
          <div className="wrap">
            <span className="stamp label">Legal</span>
            <h1>{title}</h1>
            <p className="ph-meta">
              <span>{updated}</span>
              <span className="no-m">{es ? `${titled.length} secciones` : `${titled.length} sections`}</span>
            </p>
            <nav className="doc-tabs" aria-label={es ? 'Documentos legales' : 'Legal documents'}>
              {TABS.map((tab) => (
                <Link key={tab.id} href={tab.href} aria-current={tab.id === doc ? 'page' : undefined}>
                  {es ? tab.es : tab.en}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="doc">
          <div className="wrap doc-grid">
            <div className="toc-wrap">
              {/* Desktop: índice fijo. Tablet/celular: desplegable cerrado. Dos marcas para no mover nada al hidratar. */}
              <nav className="toc toc-d" aria-label={onThisPage} data-toc>
                <p className="toc-h">{onThisPage}</p>
                {tocList}
              </nav>
              <details className="toc toc-m">
                <summary>{onThisPage}</summary>
                {tocList}
              </details>
            </div>

            <article className="doc-prose">
              {sections.map((s) => (
                <section key={s.id} id={s.id}>
                  {s.title && (
                    <h2>
                      <span className="n" aria-hidden="true">{s.n}</span>
                      {s.title}
                    </h2>
                  )}
                  {s.nodes}
                </section>
              ))}
            </article>
          </div>
        </div>
      </main>
      <V2ScrollSpy ids={titled.map((s) => s.id)} />
    </V2Page>
  );
}
