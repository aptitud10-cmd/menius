import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MENIUS - Menús Digitales para Restaurantes',
  description: 'Plataforma SaaS para restaurantes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
