// @ts-nocheck
import { useState } from 'react';
import React from 'react';

// ─── Code block with copy button ─────────────────────────────────────────────
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative my-2 group/code">
      <pre className="bg-gray-950 rounded p-3 overflow-x-auto text-xs text-green-300 border border-gray-700 pr-16">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }).catch(() => {});
        }}
        className="absolute top-1.5 right-1.5 text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-500 hover:text-white hover:bg-gray-700 transition-colors opacity-0 group-hover/code:opacity-100"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ─── Minimal markdown renderer ────────────────────────────────────────────────
export function MarkdownText({ text }: { text: string }) {
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let key = 0;

  for (const line of text.split('\n')) {
    if (line.startsWith('```')) {
      if (!inCode) { inCode = true; codeLines = []; }
      else {
        const codeStr = codeLines.join('\n');
        elements.push(<CodeBlock key={key++} code={codeStr} />);
        inCode = false;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith('### ')) elements.push(<h3 key={key++} className="font-bold text-sm mt-2 mb-0.5">{line.slice(4)}</h3>);
    else if (line.startsWith('## ')) elements.push(<h2 key={key++} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</h2>);
    else if (line.startsWith('# ')) elements.push(<h1 key={key++} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h1>);
    else if (line.startsWith('- ') || line.startsWith('* ')) elements.push(<li key={key++} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>);
    else if (line.trim() === '') elements.push(<br key={key++} />);
    else elements.push(<span key={key++} className="block">{renderInline(line)}</span>);
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-gray-700 text-green-300 px-1 rounded text-xs">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}
