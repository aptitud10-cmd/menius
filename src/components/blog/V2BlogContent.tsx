'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import type { Element, ElementContent } from 'hast';

/**
 * Cuerpo del artículo en la plantilla de la fase 2 (columna de 680 px).
 *
 * "Recibo": una lista de montos ("- **App commission**: $7.50 (25%)") cuyo
 * último renglón es la ganancia neta se dibuja como el ticket de la landing.
 * No hace falta marcar nada en el markdown: si la lista no tiene exactamente
 * esa forma, se ve como una lista común.
 */

function text(n: ElementContent): string {
  if (n.type === 'text') return n.value;
  if (n.type === 'element') return n.children.map(text).join('');
  return '';
}

function receiptRows(ul: Element | undefined): { label: string; value: string }[] | null {
  if (!ul) return null;
  const items = ul.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
  if (!items.length) return null;
  const rows: { label: string; value: string }[] = [];
  for (const li of items) {
    const kids = li.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
    const first = kids[0];
    if (!first || first.type !== 'element' || first.tagName !== 'strong') return null;
    const rest = kids.slice(1).map(text).join('').trim();
    if (!/^:\s*\$/.test(rest)) return null;
    rows.push({ label: text(first).trim(), value: rest.replace(/^:\s*/, '') });
  }
  const last = rows[rows.length - 1].label;
  if (!/net profit|ganancia neta/i.test(last)) return null;
  return rows;
}

const components: Components = {
  ul({ node, children, ...rest }) {
    const rows = receiptRows(node);
    if (!rows) return <ul {...rest}>{children}</ul>;
    return (
      <div className="receipt" role="table">
        {rows.map((r, i) => (
          <div key={r.label + i} className={i === rows.length - 1 ? 'r tot' : 'r'} role="row">
            <span role="cell">{r.label}</span>
            <b role="cell">{r.value}</b>
          </div>
        ))}
      </div>
    );
  },
};

export function V2BlogContent({ content }: { content: string }) {
  return (
    <div className="doc-prose">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
