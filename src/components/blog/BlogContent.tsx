'use client';

import ReactMarkdown from 'react-markdown';

export function BlogContent({ content }: { content: string }) {
  return (
    <article className="prose prose-gray prose-lg max-w-none prose-headings:font-heading prose-headings:text-gray-900 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-strong:text-gray-900 prose-a:text-brand-600 prose-a:no-underline hover:prose-a:text-brand-700 prose-table:text-sm prose-th:text-left prose-th:py-3 prose-th:px-4 prose-th:bg-gray-50 prose-th:font-semibold prose-td:py-2.5 prose-td:px-4 prose-td:border-b prose-td:border-gray-100 prose-blockquote:border-brand-500 prose-blockquote:bg-brand-50/50 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-code:text-brand-700 prose-code:bg-brand-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </article>
  );
}
