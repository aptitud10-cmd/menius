import '@/app/globals.css';
import { DashboardLocaleProvider } from '@/hooks/use-dashboard-locale';

export const metadata = {
  title: 'KDS — MENIUS',
};

export default function KDSRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLocaleProvider>
      <div className="h-dvh w-screen overflow-hidden bg-gray-950 text-white flex flex-col">
        {children}
      </div>
    </DashboardLocaleProvider>
  );
}
