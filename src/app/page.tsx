import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            <span className="text-brand-600">MEN</span>IUS
          </span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="text-sm font-semibold px-5 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors">
              Registrarse gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center pt-16">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-brand-50 text-brand-700 text-sm font-medium border border-brand-200">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Plataforma SaaS para restaurantes
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.06] mb-6" style={{ fontFamily: "'Sora', sans-serif" }}>
            Tu menú digital,{' '}
            <span className="bg-gradient-to-r from-brand-500 to-teal-400 bg-clip-text text-transparent">
              pedidos al instante
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Registra tu restaurante, crea tu menú, genera QRs para tus mesas y recibe pedidos desde el teléfono de tus clientes. Sin comisiones.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-base shadow-lg shadow-brand-600/25 hover:shadow-xl hover:bg-brand-700 hover:-translate-y-0.5 transition-all">
              Crear cuenta gratis
            </Link>
            <Link href="/r/demo" className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-base hover:bg-gray-50 transition-all">
              Ver menú demo
            </Link>
          </div>

          {/* Features */}
          <div className="mt-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-left">
            {[
              { icon: '🏪', title: 'Multi-restaurante', desc: 'Cada restaurante tiene su propio espacio, menú y dashboard.' },
              { icon: '📱', title: 'QR por mesa', desc: 'Genera códigos QR únicos para cada mesa de tu restaurante.' },
              { icon: '🛒', title: 'Pedidos en vivo', desc: 'Tus clientes ordenan desde su teléfono. Tú ves los pedidos al instante.' },
              { icon: '🎛️', title: 'Dashboard completo', desc: 'Gestiona categorías, productos, variantes, extras y órdenes.' },
            ].map((f) => (
              <div key={f.title} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-2xl mb-2 block">{f.icon}</span>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} MENIUS. Todos los derechos reservados.
      </footer>
    </div>
  );
}
