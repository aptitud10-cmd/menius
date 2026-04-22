interface Props {
  children: React.ReactNode;
  params: { slug: string };
}

export default function SlugMenuLayout({ children }: Props) {
  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">
      {children}
    </div>
  );
}
