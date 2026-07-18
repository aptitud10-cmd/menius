import { StoreScrollFix } from '@/components/public/StoreScrollFix';

interface Props {
  children: React.ReactNode;
  params: { slug: string };
}

export default function SlugMenuLayout({ children }: Props) {
  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">
      <StoreScrollFix />
      {children}
    </div>
  );
}
