import Link from 'next/link';
import { cookies } from 'next/headers';

export default function NotFound() {
  const locale = cookies().get('menius_locale')?.value ?? 'es';
  const en = locale === 'en';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-extrabold text-gray-200 mb-2 font-heading">
          404
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {en ? 'Page not found' : 'Página no encontrada'}
        </h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          {en
            ? 'The page you are looking for does not exist or has been moved. Check the URL or go back to the home page.'
            : 'La página que buscas no existe o fue movida. Verifica la URL o regresa al inicio.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            {en ? 'Go home' : 'Ir al inicio'}
          </Link>
          <Link
            href="/demo"
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {en ? 'View demo' : 'Ver demo'}
          </Link>
        </div>
      </div>
    </div>
  );
}
