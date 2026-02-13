export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
          MENIUS
        </h1>
        <p className="text-2xl text-gray-700 mb-8">
          Menús Digitales para Restaurantes
        </p>
        <div className="max-w-2xl mx-auto">
          <p className="text-lg text-gray-600 mb-6">
            Plataforma SaaS para que restaurantes gestionen menús digitales y reciban pedidos online.
          </p>
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              🎉 ¡Deployment Exitoso!
            </h2>
            <p className="text-gray-600 mb-4">
              Tu aplicación está corriendo en Vercel.
            </p>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <p className="text-sm text-teal-800">
                ✅ Next.js 14<br/>
                ✅ TypeScript<br/>
                ✅ Tailwind CSS<br/>
                ✅ Supabase conectado<br/>
                ✅ Deploy automático
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
