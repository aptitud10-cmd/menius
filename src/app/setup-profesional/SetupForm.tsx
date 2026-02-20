'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, Send } from 'lucide-react';
import { PhoneField } from '@/components/ui/PhoneField';

interface PackageOption {
  id: string;
  name: string;
  price: number;
}

export function SetupForm({ packages }: { packages: PackageOption[] }) {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    restaurant_name: '',
    package_id: '',
    current_menu: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam) {
      const match = packages.find((p) => p.id === planParam);
      if (match) setForm((prev) => ({ ...prev, package_id: match.id }));
    }
  }, [searchParams, packages]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.restaurant_name || !form.package_id) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const selectedPkg = packages.find((p) => p.id === form.package_id);

      const res = await fetch('/api/setup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          package_name: selectedPkg?.name,
          package_price: selectedPkg?.price,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error enviando solicitud');
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Error enviando la solicitud. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">¡Solicitud enviada!</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Recibimos tu solicitud. Te contactaremos en menos de <strong className="text-white">24 horas</strong> al email{' '}
          <strong className="text-white">{form.email}</strong> para confirmar los detalles y comenzar.
        </p>
      </div>
    );
  }

  const inputClasses = 'w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/30 transition-all';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Package selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Servicio *</label>
        <div className="grid grid-cols-2 gap-2">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => handleChange('package_id', pkg.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                form.package_id === pkg.id
                  ? 'border-purple-500/40 bg-purple-500/10'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
              }`}
            >
              <p className={`text-sm font-semibold ${form.package_id === pkg.id ? 'text-white' : 'text-gray-300'}`}>{pkg.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                ${pkg.price} {pkg.id === 'soporte-mensual' ? '/mes' : 'único'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Tu nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Juan Pérez"
            className={inputClasses}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="juan@mirestaurante.com"
            className={inputClasses}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre del restaurante *</label>
          <input
            type="text"
            value={form.restaurant_name}
            onChange={(e) => handleChange('restaurant_name', e.target.value)}
            placeholder="Mi Restaurante"
            className={inputClasses}
            required
          />
        </div>
        <div>
          <PhoneField
            label="Teléfono (opcional)"
            value={form.phone}
            onChange={(v) => handleChange('phone', v)}
            dark={true}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">¿Cómo tienes tu menú actualmente?</label>
        <select
          value={form.current_menu}
          onChange={(e) => handleChange('current_menu', e.target.value)}
          className={`${inputClasses} bg-[#0a0a0a]`}
        >
          <option value="">Selecciona una opción</option>
          <option value="printed">Menú impreso / físico</option>
          <option value="pdf">PDF o documento digital</option>
          <option value="photos">Fotos del menú</option>
          <option value="other_platform">En otra plataforma digital</option>
          <option value="none">No tengo menú aún</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Mensaje adicional (opcional)</label>
        <textarea
          value={form.message}
          onChange={(e) => handleChange('message', e.target.value)}
          placeholder="Cuéntanos sobre tu restaurante, cuántos productos tienes, necesidades especiales..."
          rows={4}
          className={`${inputClasses} resize-none`}
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full py-4 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-100 transition-all btn-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Enviar solicitud
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-600">
        Te contactaremos en menos de 24 horas. Sin compromiso.
      </p>
    </form>
  );
}
