'use client';

import { useState, useEffect } from 'react';
import { Bike, CheckCircle, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'menius-driver-identity';

export default function DriverSetupPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [existingIdentity, setExistingIdentity] = useState<{ name: string; phone: string } | null>(null);

  // Detect language from browser
  const en = typeof navigator !== 'undefined' && navigator.language?.startsWith('en');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.name) {
          setExistingIdentity(parsed);
          setName(parsed.name);
          setPhone(parsed.phone ?? '');
        }
      }
    } catch { /* ignore */ }
  }, []);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const identity = { name: trimmedName, phone: phone.trim() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    setExistingIdentity(identity);
    setSaved(true);
    if (navigator.vibrate) navigator.vibrate(60);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setExistingIdentity(null);
    setName('');
    setPhone('');
    setSaved(false);
  };

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
            <Bike className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black">
            {en ? 'Driver Setup' : 'Registro de Repartidor'}
          </h1>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            {en
              ? 'Register once so the system recognizes you when you scan a delivery QR code.'
              : 'Regístrate una vez para que el sistema te reconozca al escanear un código QR de entrega.'}
          </p>
        </div>

        {/* Success state */}
        {saved ? (
          <div className="space-y-4">
            <div className="bg-emerald-950/50 border border-emerald-800 rounded-2xl p-5 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-lg font-bold text-emerald-400">
                {en ? 'You\'re registered!' : '¡Estás registrado!'}
              </p>
              <p className="text-sm text-gray-400">
                {en
                  ? 'Now scan a delivery QR code to start tracking.'
                  : 'Ahora escanea un código QR de entrega para comenzar.'}
              </p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold text-sm">
                {existingIdentity?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{existingIdentity?.name}</p>
                {existingIdentity?.phone && (
                  <p className="text-xs text-gray-500">{existingIdentity.phone}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              {en ? 'Change identity' : 'Cambiar identidad'}
            </button>
          </div>
        ) : (
          /* Registration form */
          <div className="space-y-4">
            {existingIdentity && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold text-sm">
                  {existingIdentity.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {en ? 'Current identity' : 'Identidad actual'}
                  </p>
                  <p className="text-sm font-semibold text-white truncate">{existingIdentity.name}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {en ? 'Your name' : 'Tu nombre'} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={en ? 'e.g. Juan' : 'ej. Juan'}
                  autoComplete="name"
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {en ? 'Phone number' : 'Teléfono'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder={en ? '+1 555 123 4567' : '+52 55 1234 5678'}
                  autoComplete="tel"
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-black text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-emerald-900/40"
            >
              {en ? 'Save & Continue' : 'Guardar y continuar'}
              <ChevronRight className="w-5 h-5" />
            </button>

            <p className="text-center text-[11px] text-gray-600">
              {en
                ? 'This is saved locally on your device only.'
                : 'Esto se guarda solo en tu dispositivo.'}
            </p>
          </div>
        )}

        <p className="text-center text-gray-800 text-[10px]">Powered by MENIUS</p>
      </div>
    </div>
  );
}
