'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

interface WidgetCodeProps {
  slug: string;
  isEn?: boolean;
}

export function WidgetCode({ slug, isEn = false }: WidgetCodeProps) {
  const [copied, setCopied] = useState(false);

  const scriptTag = `<script src="${APP_URL}/api/public/widget?slug=${slug}" defer></script>`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
      const el = document.querySelector('#widget-code-pre') as HTMLPreElement | null;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {isEn
          ? 'Paste this snippet in any page of your website to show a "View Menu" button that opens your MENIUS menu.'
          : 'Pega este código en cualquier página de tu sitio web para mostrar un botón "Ver Menú" que abre tu menú de MENIUS.'}
      </p>

      <div className="relative group">
        <pre
          id="widget-code-pre"
          className="overflow-x-auto rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-800 font-mono select-all whitespace-pre-wrap break-all"
        >
          {scriptTag}
        </pre>
        <button
          onClick={handleCopy}
          aria-label={isEn ? 'Copy code' : 'Copiar código'}
          className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              {isEn ? 'Copied!' : '¡Copiado!'}
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              {isEn ? 'Copy' : 'Copiar'}
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        {isEn
          ? 'The button will appear fixed at the bottom-right corner of your site.'
          : 'El botón aparecerá fijo en la esquina inferior derecha de tu sitio.'}
      </p>
    </div>
  );
}
