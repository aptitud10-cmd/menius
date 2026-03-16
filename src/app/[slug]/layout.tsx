interface Props {
  children: React.ReactNode;
  params: { slug: string };
}

export default function SlugMenuLayout({ children }: Props) {
  return (
    <div className="min-h-[100dvh] bg-white text-gray-900">
      {children}
    </div>
  );
}
