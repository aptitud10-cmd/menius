import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MENIUS - Gestiona tu restaurante sin comisiones",
  description: "Elimina las comisiones de 15-30% que te cobran Uber Eats y DoorDash. Paga solo $49/mes y quédate con el 100% de tus ventas.",
  keywords: ["restaurante", "comida", "pedidos online", "sin comisiones", "delivery", "pickup"],
  authors: [{ name: "MENIUS" }],
  openGraph: {
    title: "MENIUS - Sistema de pedidos sin comisiones",
    description: "Gestiona tu restaurante sin comisiones de Uber Eats o DoorDash",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
