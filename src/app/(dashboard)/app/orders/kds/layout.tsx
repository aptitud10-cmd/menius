export default function KDSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-gray-950 text-white flex flex-col">
      {children}
    </div>
  );
}
