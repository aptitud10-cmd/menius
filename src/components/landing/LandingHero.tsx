import Link from 'next/link';

const mockMenu = [
  { name: 'Tacos al Pastor', desc: 'Piña, cilantro, cebolla', price: '$12.99', popular: true },
  { name: 'Guacamole Fresco', desc: 'Aguacate, tomate, limón', price: '$8.50', popular: false },
  { name: 'Enchiladas Suizas', desc: 'Pollo, salsa verde, queso', price: '$14.99', popular: false },
  { name: 'Horchata', desc: 'Arroz, canela, vainilla', price: '$4.00', popular: false },
];

export function LandingHero() {
  return (
    <section className="relative min-h-[100vh] min-h-[100dvh] flex items-center overflow-clip">
      <div className="hero-gradient" />
      <div className="orb orb-purple w-[500px] h-[500px] top-[-10%] left-[10%] hidden md:block" />
      <div className="orb orb-teal w-[400px] h-[400px] bottom-[10%] right-[5%] hidden md:block" />
      <div className="orb orb-blue w-[350px] h-[350px] top-[40%] left-[50%] hidden md:block" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-6 w-full py-20 md:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">

          <div className="text-center lg:text-left">
            <div className="d-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] mb-6 md:mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-gray-300 tracking-wide">
                Plataforma #1 para restaurantes
              </span>
            </div>

            <h1 className="d-fade-up d-delay-1 text-[2.75rem] sm:text-[3.5rem] lg:text-[4.5rem] font-semibold leading-[0.92] tracking-[-0.04em] text-white">
              Menú digital y{' '}
              <span className="text-gradient-premium">pedidos directos</span>
            </h1>

            <p className="d-fade-up d-delay-2 mt-6 md:mt-7 text-lg sm:text-xl text-gray-300 max-w-[480px] mx-auto lg:mx-0 leading-relaxed font-light">
              QR por mesa, pedidos online, cocina KDS y asistente IA.
              Sin comisiones. Configura en 2 minutos.
            </p>

            <div className="d-fade-up d-delay-3 mt-8 md:mt-9 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3.5">
              <Link
                href="/signup"
                className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-black font-semibold text-base hover:bg-gray-100 transition-all text-center"
              >
                Crea tu menú en 2 min
                <span className="inline-block ml-1.5 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </Link>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/10 text-gray-200 font-semibold text-base hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition-all text-center"
              >
                Ver demo en vivo
              </Link>
            </div>

            <div className="d-fade-up d-delay-4 mt-12 md:mt-14 flex items-center justify-center lg:justify-start gap-10 sm:gap-12">
              {[
                { value: '0%', label: 'Comisiones' },
                { value: '14 días', label: 'Prueba gratis' },
                { value: '2 min', label: 'Configuración' },
              ].map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <p className="text-3xl sm:text-3xl font-semibold text-white tracking-tight">{s.value}</p>
                  <p className="text-sm text-gray-400 mt-1.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex justify-center d-scale-in d-delay-3" style={{ perspective: '1200px' }}>
            <div className="d-float" style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-6deg) rotateX(2deg)' }}>
              <div className="relative w-[280px] h-[580px] rounded-[2.5rem] border-[3px] border-white/[0.12] bg-gray-950 shadow-[0_0_80px_rgba(16,185,129,0.15),0_25px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-[28px] bg-black rounded-full z-20" />

                <div className="relative z-10 pt-10 px-5 pb-2 flex items-center justify-between">
                  <span className="text-[10px] text-white/50 font-medium">9:41</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.24 4.24 0 00-6 0zm-4-4l2 2a7.07 7.07 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
                    </svg>
                    <div className="w-4 h-2 border border-white/40 rounded-sm">
                      <div className="w-3 h-1.5 bg-emerald-400/70 rounded-[1px] m-[0.5px]" />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 px-4 pb-4">
                  <div className="text-center mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/80 to-blue-500/80 mx-auto mb-1.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <span className="text-white text-sm font-bold">M</span>
                    </div>
                    <p className="text-white text-[11px] font-semibold">La Taquería</p>
                    <p className="text-gray-500 text-[9px]">Mesa 5 · Menú digital</p>
                  </div>

                  <div className="flex gap-1.5 mb-3 overflow-hidden">
                    {['Popular', 'Tacos', 'Bebidas', 'Postres'].map((cat, i) => (
                      <span key={cat} className={`px-2.5 py-1 rounded-full text-[9px] font-medium flex-shrink-0 ${i === 0 ? 'bg-white text-black' : 'bg-white/[0.06] text-gray-400'}`}>
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {mockMenu.map((item) => (
                      <div key={item.name} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-white text-[10px] font-medium truncate">{item.name}</p>
                            {item.popular && <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[7px] font-bold flex-shrink-0">★</span>}
                          </div>
                          <p className="text-gray-500 text-[8px] truncate">{item.desc}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white text-[10px] font-semibold">{item.price}</p>
                          <span className="mt-0.5 inline-block px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[7px] font-semibold">+</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 py-2.5 rounded-xl bg-white text-center">
                    <span className="text-black text-[10px] font-semibold">🛒 Ver carrito · $40.48</span>
                  </div>

                  <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                    <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-emerald-400 text-[9px] font-medium">¡Pedido enviado a cocina!</p>
                  </div>
                </div>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-[4px] bg-white/15 rounded-full" />
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] to-transparent z-20" />
    </section>
  );
}
