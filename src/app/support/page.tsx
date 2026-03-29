import type { Metadata } from 'next';
import PublicSupportPage from './PublicSupportPage';

export const metadata: Metadata = {
  title: 'Soporte — MENIUS',
  description: 'Centro de ayuda y soporte para usuarios de MENIUS. Resuelve dudas, contacta a nuestro equipo y encuentra recursos.',
};

export default function SupportPage() {
  return <PublicSupportPage />;
}
