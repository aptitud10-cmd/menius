'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Upload, Trash2, Link2, Download, Search, X, Loader2, ImageOff,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/dashboard/DashToast';

interface MediaFile {
  name: string;
  path: string;
  url: string;
  size: number;
  contentType: string;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] ?? 'B'}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function MediaGallery() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [images, setImages] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tenant/media');
      const data = await res.json();
      if (res.ok) {
        setImages(data.images ?? []);
      }
    } catch {
      toastError('Error cargando imágenes');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toastError('Solo imágenes'); return; }
    if (file.size > 10 * 1024 * 1024) { toastError('Máximo 10MB'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error subiendo');
      }
      toastSuccess('Imagen subida');
      await fetchImages();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error subiendo imagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`¿Eliminar "${file.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(file.path);
    try {
      const res = await fetch('/api/tenant/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path }),
      });
      if (!res.ok) throw new Error('Error eliminando');
      setImages(prev => prev.filter(f => f.path !== file.path));
      toastSuccess('Imagen eliminada');
    } catch {
      toastError('Error eliminando imagen');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess('URL copiada');
    } catch {
      toastError('No se pudo copiar');
    }
  };

  const filtered = search.trim()
    ? images.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : images;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Galería de imágenes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {images.length} {images.length === 1 ? 'imagen' : 'imágenes'} almacenadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="dash-input pl-9 pr-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="dash-btn-primary whitespace-nowrap"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
            ) : (
              <><Upload className="w-4 h-4" /> Subir imagen</>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ImageOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {search ? 'No se encontraron imágenes' : 'No hay imágenes aún'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Intenta con otro término' : 'Sube tu primera imagen o importa un menú con IA'}
          </p>
          {!search && (
            <button
              onClick={() => fileRef.current?.click()}
              className="dash-btn-primary mt-4"
            >
              <Upload className="w-4 h-4" /> Subir imagen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(file => (
            <div
              key={file.path}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <button
                onClick={() => setPreviewUrl(file.url)}
                className="relative w-full aspect-square bg-gray-50 cursor-pointer overflow-hidden"
              >
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized
                />
                {deleting === file.path && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  </div>
                )}
              </button>

              {/* Info */}
              <div className="p-3">
                <p className="text-xs font-medium text-gray-700 truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {formatBytes(file.size)} &middot; {formatDate(file.createdAt)}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => handleCopyUrl(file.url)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copiar URL"
                  >
                    <Link2 className="w-3 h-3" /> URL
                  </button>
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Descargar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deleting === file.path}
                    className="flex items-center justify-center p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 p-1.5 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <Image
              src={previewUrl}
              alt="Preview"
              width={1200}
              height={1200}
              className="rounded-xl object-contain max-h-[85vh] w-auto mx-auto"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
