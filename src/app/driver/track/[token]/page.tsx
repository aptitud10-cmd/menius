/**
 * Driver GPS tracking page — opened by the delivery driver on their phone.
 * Reads the token from the URL, broadcasts their location every 10 seconds.
 * No authentication required (uses a per-delivery token).
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation, CheckCircle, AlertCircle, Camera, Upload, Loader2 } from 'lucide-react';

interface PageProps {
  params: { token: string };
}

type Status = 'waiting' | 'sharing' | 'done' | 'error' | 'unsupported';

export default function DriverTrackPage({ params }: PageProps) {
  const { token } = params;
  const [status, setStatus] = useState<Status>('waiting');
  const [message, setMessage] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');

  const sendLocation = async (lat: number, lng: number) => {
    try {
      const res = await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lat, lng }),
      });
      if (!res.ok) {
        const d = await res.json();
        setMessage(d.error ?? 'Error sending location');
      }
    } catch {
      setMessage('Connection error — retrying…');
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('sharing');
    setMessage('');

    // Immediately get current position
    navigator.geolocation.getCurrentPosition(
      pos => sendLocation(pos.coords.latitude, pos.coords.longitude),
      err => { setStatus('error'); setMessage(err.message); }
    );

    // Then poll every 10 s
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => sendLocation(pos.coords.latitude, pos.coords.longitude),
        err => setMessage(err.message)
      );
    }, 10_000);
  };

  const stopTracking = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus('done');
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError('');
    try {
      const form = new FormData();
      form.append('token', token);
      form.append('photo', file);
      const res = await fetch('/api/driver/photo', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) setPhotoUrl(data.url);
      else setPhotoError(data.error ?? 'Upload failed');
    } catch {
      setPhotoError('Connection error');
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-xs text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
          <Navigation className="w-10 h-10 text-emerald-400" />
        </div>

        <div>
          <h1 className="text-2xl font-black">MENIUS Driver</h1>
          <p className="text-gray-400 text-sm mt-1">Delivery GPS tracking</p>
        </div>

        {status === 'waiting' && (
          <>
            <p className="text-gray-300 text-sm">
              Tap the button to start sharing your location with the restaurant and the customer.
            </p>
            <button
              onClick={startTracking}
              className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-lg hover:bg-emerald-400 active:scale-95 transition-all"
            >
              Start sharing location
            </button>
          </>
        )}

        {status === 'sharing' && (
          <>
            <div className="flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">Sharing location…</span>
            </div>
            {message && <p className="text-amber-400 text-xs">{message}</p>}
            <p className="text-gray-500 text-xs">Updated every 10 seconds. Keep this page open.</p>
            <button
              onClick={stopTracking}
              className="w-full py-3 rounded-2xl border border-gray-700 text-gray-400 font-semibold hover:border-gray-500 transition-all"
            >
              Stop sharing
            </button>
          </>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <p className="text-emerald-400 font-bold">Location sharing stopped</p>
            <p className="text-gray-500 text-sm">Thank you for your delivery!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-red-400 font-bold">Could not get your location</p>
            <p className="text-gray-400 text-sm">{message}</p>
            <button
              onClick={startTracking}
              className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-all"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'unsupported' && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12 text-amber-400" />
            <p className="text-amber-400 font-bold">GPS not available</p>
            <p className="text-gray-400 text-sm">Your browser or device does not support geolocation.</p>
          </div>
        )}

        {/* Proof of delivery photo upload */}
        {(status === 'sharing' || status === 'done') && (
          <div className="border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-gray-400" />
              <p className="text-sm font-semibold text-gray-300">Proof of delivery photo</p>
            </div>
            {photoUrl ? (
              <div className="space-y-2">
                <img src={photoUrl} alt="Delivery proof" className="w-full rounded-xl object-cover max-h-48" />
                <p className="text-xs text-emerald-400 text-center">✓ Photo uploaded successfully</p>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-700 rounded-xl p-5 cursor-pointer hover:border-gray-500 transition-colors ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {photoUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
                <span className="text-xs text-gray-400">{photoUploading ? 'Uploading…' : 'Tap to take or upload photo'}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
              </label>
            )}
            {photoError && <p className="text-red-400 text-xs">{photoError}</p>}
          </div>
        )}

        <p className="text-gray-600 text-xs">
          Powered by MENIUS · Token: {token.slice(0, 8)}…
        </p>
      </div>
    </div>
  );
}
