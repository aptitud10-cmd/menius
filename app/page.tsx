import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-6">
              🎉 13 días gratis · Sin tarjeta requerida
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Gestiona tu restaurante<br />
              <span className="text-yellow-300">sin comisiones</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              MENIUS elimina las comisiones de 15-30% que te cobran Uber Eats y DoorDash.<br />
              Paga solo <span className="font-bold text-yellow-300">$49/mes</span> y quédate con el 100% de tus ventas.
            </p>

            {/* Comparación Rápida */}
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
              <div className="bg-red-500/20 backdrop-blur-sm p-6 rounded-lg border border-red-400/30">
                <div className="text-sm text-red-200 mb-2">Con Uber Eats:</div>
                <div className="text-3xl font-bold">-$450<span className="text-lg">/mes</span></div>
                <div className="text-2xl mt-2">❌</div>
              </div>
              
              <div className="bg-green-500/20 backdrop-blur-sm p-6 rounded-lg border border-green-400/30">
                <div className="text-sm text-green-200 mb-2">Con MENIUS:</div>
                <div className="text-3xl font-bold">-$49<span className="text-lg">/mes</span></div>
                <div className="text-2xl mt-2">✅</div>
              </div>
              
              <div className="bg-yellow-500/20 backdrop-blur-sm p-6 rounded-lg border border-yellow-400/30">
                <div className="text-sm text-yellow-200 mb-2">TU AHORRO:</div>
                <div className="text-3xl font-bold">$401<span className="text-lg">/mes</span></div>
                <div className="text-2xl mt-2">💰</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <input
                type="email"
                placeholder="tu@email.com"
                className="px-6 py-4 rounded-lg text-gray-900 text-lg w-full sm:w-auto"
              />
              <Button size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg px-8 py-4">
                Prueba 13 días gratis
              </Button>
            </div>

            <p className="text-sm text-blue-200">
              Sin tarjeta de crédito · Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">⭐ 4.9/5</div>
              <div className="text-gray-600">Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">2,847</div>
              <div className="text-gray-600">Restaurantes activos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">$2.3M</div>
              <div className="text-gray-600">Ahorrados</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">18 min</div>
              <div className="text-gray-600">Setup promedio</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para gestionar tu restaurante
            </h2>
            <p className="text-xl text-gray-600">
              Herramientas profesionales sin la complejidad
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="p-6 border rounded-lg">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">Gestión en Tiempo Real</h3>
              <p className="text-gray-600">
                Ve cada orden al instante, actualiza estados, y optimiza tu cocina desde cualquier dispositivo.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-2">IA para Descripciones</h3>
              <p className="text-gray-600">
                Genera descripciones atractivas de menú en segundos con inteligencia artificial.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold mb-2">Análisis Inteligente</h3>
              <p className="text-gray-600">
                Identifica tus platos más rentables y optimiza tu menú basado en datos reales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ¿Listo para empezar a ahorrar?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Únete a 2,847 restaurantes que ya ahorraron $2.3M en comisiones
          </p>
          <Button size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg px-8 py-4">
            Prueba 13 días gratis
          </Button>
          <p className="mt-4 text-sm text-blue-200">
            Sin tarjeta · Setup en minutos · Cancela fácil
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4 text-center">
          <p>© 2026 MENIUS. Todos los derechos reservados.</p>
        </div>
      </footer>
    </main>
  )
}
