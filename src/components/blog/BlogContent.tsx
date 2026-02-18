'use client';

import ReactMarkdown from 'react-markdown';

export function BlogContent({ content }: { content: string }) {
  return (
    <article className="prose prose-invert prose-lg max-w-none prose-headings:font-sans prose-headings:text-white prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-400 prose-p:leading-relaxed prose-li:text-gray-400 prose-strong:text-white prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 prose-table:text-sm prose-th:text-left prose-th:py-3 prose-th:px-4 prose-th:bg-white/[0.04] prose-th:font-semibold prose-th:text-gray-300 prose-td:py-2.5 prose-td:px-4 prose-td:border-b prose-td:border-white/[0.06] prose-td:text-gray-400 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-500/[0.06] prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-code:text-purple-300 prose-code:bg-purple-500/[0.08] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </article>
  );
}
