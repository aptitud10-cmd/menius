import Link from 'next/link';

export function LandingNav() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-5 h-14 md:h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          MENIUS
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#funciones" className="text-sm text-gray-400 hover:text-white transition-colors">Funciones</Link>
          <Link href="/#precios" className="text-sm text-gray-400 hover:text-white transition-colors">Precios</Link>
          <Link href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</Link>
          <Link href="/faq" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</Link>
          <Link href="/r/demo" className="text-sm text-gray-400 hover:text-white transition-colors">Demo</Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Iniciar sesión
          </Link>
          <Link href="/signup" className="text-sm font-medium px-5 py-2.5 rounded-xl bg-white text-black hover:bg-gray-100 transition-all btn-glow">
            Empezar gratis
          </Link>
        </div>

        {/* Mobile: only login link */}
        <Link href="/login" className="md:hidden text-[13px] font-medium text-gray-400 hover:text-white transition-colors">
          Iniciar sesión
        </Link>
      </div>
    </header>
  );
}
