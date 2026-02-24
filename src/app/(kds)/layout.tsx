import '@/app/globals.css';

export const metadata = {
  title: 'KDS — MENIUS',
};

export default function KDSRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950 text-white flex flex-col">
      {children}
    </div>
  );
}
