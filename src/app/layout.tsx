import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MENIUS — Menús digitales para restaurantes',
  description: 'Plataforma SaaS de menús digitales. Registra tu restaurante, crea tu menú, genera QRs y recibe pedidos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,300..800&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
