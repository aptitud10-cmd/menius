'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2, AlertTriangle, Shield, FileJson } from 'lucide-react';
import { useToast } from '@/components/dashboard/DashToast';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

export default function DataPrivacyPage() {
  const { t, locale } = useDashboardLocale();
  const confirmWord = locale === 'en' ? 'DELETE' : 'ELIMINAR';
  const router = useRouter();
  const toast = useToast();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) throw new Error(t.data_errorExport);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menius-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t.data_errorExport);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmation !== confirmWord) {
      setDeleteError(t.data_typeConfirm);
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || t.data_errorDelete);
        setDeleting(false);
        return;
      }
      router.push('/login?deleted=1');
    } catch {
      setDeleteError(t.data_networkError);
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="dash-heading mb-1">{t.data_title}</h1>
        <p className="text-sm text-gray-500">
          {t.data_subtitle}
        </p>
      </div>

      {/* Export Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t.data_exportTitle}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t.data_exportDesc}
            </p>
          </div>
        </div>
        <ul className="space-y-1 text-xs text-gray-500 ml-13 pl-1">
          {[t.data_restaurantInfo, t.data_fullMenu, t.data_orderHistory, t.data_customerBase, t.data_subscriptionData].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <FileJson className="w-4 h-4" />
          {exporting ? t.data_downloading : t.data_downloadJson}
        </button>
      </div>

      {/* Delete Section */}
      <div className="bg-white border border-red-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t.data_deleteTitle}</h2>
            <p className="text-xs text-gray-500 mt-0.5" dangerouslySetInnerHTML={{ __html: t.data_deleteDesc }} />
          </div>
        </div>

        {!showDeleteModal ? (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t.data_deleteButton}
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-4">
            <p className="text-sm text-red-700 font-medium" dangerouslySetInnerHTML={{ __html: t.data_deleteConfirmText }} />
            <input
              type="text"
              value={confirmation}
              onChange={e => { setConfirmation(e.target.value); setDeleteError(''); }}
              placeholder={confirmWord}
              className="w-full bg-white border border-red-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/30 font-mono"
            />
            {deleteError && (
              <p className="text-xs text-red-600">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting || confirmation !== confirmWord}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? t.data_deleting : t.data_confirmDeletion}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setConfirmation(''); setDeleteError(''); }}
                className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {t.data_cancelButton}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {t.data_gdprNote}{' '}
        <a href="/privacy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">{t.data_privacyLink}</a>.
      </p>
    </div>
  );
}
