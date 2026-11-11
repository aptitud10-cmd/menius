import { preconnect } from 'react-dom';
import { StoreScrollFix } from '@/components/public/StoreScrollFix';

interface Props {
  children: React.ReactNode;
  params: { slug: string };
}

export default function SlugMenuLayout({ children }: Props) {
  // Product photos above the fold come from Supabase Storage: open DNS + TLS to
  // it while the HTML is still parsing instead of when the first <img> asks.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // No crossOrigin: next/image requests are non-CORS, and a preconnect opened
  // in a different credentials mode would not be reused for them.
  if (supabaseUrl) preconnect(supabaseUrl);

  // overflow-x-clip, not -hidden: `hidden` turns this wrapper into a scroll
  // container that never scrolls, which silently disables `sticky` in every
  // descendant (tracker header, the thumb-reach action dock).
  return (
    <div className="bg-white text-gray-900 overflow-x-clip">
      <StoreScrollFix />
      {children}
    </div>
  );
}
