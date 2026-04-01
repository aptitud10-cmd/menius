'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Monitor, Smartphone, ExternalLink, Download, Tablet, Printer, Wifi, CheckCircle2 } from 'lucide-react';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { renderStyledQR } from '@/lib/styled-qr';

const APK_URL = 'https://expo.dev/artifacts/eas/dxPgSHGFe4YJUPDoFFrVfF.apk';

export default function CounterHubPage() {
  const { t } = useDashboardLocale();

  const installSteps = [
    t.counter_hub_installStep1,
    t.counter_hub_installStep2,
    t.counter_hub_installStep3,
    t.counter_hub_installStep4,
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="dash-heading">{t.nav_counter}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.counter_hub_subtitle}</p>
      </div>

      {/* Two options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Option A — Browser */}
        <div className="dash-card p-6 flex flex-col gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Monitor className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">{t.counter_hub_browserTitle}</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{t.counter_hub_browserDesc}</p>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <Spec text={t.counter_hub_browserSpec1} />
            <Spec text={t.counter_hub_browserSpec2} />
            <Spec text={t.counter_hub_browserSpec3} />
          </ul>
          <div className="mt-auto flex flex-col gap-2">
            <Link
              href="/counter"
              target="_blank"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {t.counter_hub_openCounter}
            </Link>
            <Link
              href="/app/counter/tablet"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Tablet className="w-4 h-4" />
              {t.counter_hub_tabletMode}
            </Link>
          </div>
        </div>

        {/* Option B — Native App */}
        <div className="dash-card p-6 flex flex-col gap-4 ring-2 ring-orange-500/20 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
              {t.counter_hub_recommended}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">{t.counter_hub_nativeTitle}</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{t.counter_hub_nativeDesc}</p>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <Spec text={t.counter_hub_nativeSpec1} />
            <Spec text={t.counter_hub_nativeSpec2} />
            <Spec text={t.counter_hub_nativeSpec3} />
          </ul>

          {/* QR code for tablet download */}
          <div className="flex flex-col items-center gap-2 py-2">
            <ApkQRCode url={APK_URL} />
            <p className="text-xs font-semibold text-gray-700">{t.counter_hub_scanQr}</p>
            <p className="text-[11px] text-gray-400 text-center leading-relaxed">{t.counter_hub_scanQrDesc}</p>
          </div>

          <div className="mt-auto">
            <a
              href={APK_URL}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t.counter_hub_downloadApk}
            </a>
          </div>
        </div>
      </div>

      {/* Install guide */}
      <div className="dash-card p-6">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-orange-500" />
          {t.counter_hub_installTitle}
        </h2>
        <ol className="space-y-4">
          {installSteps.map((text, i) => (
            <li key={i} className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-gray-600 leading-relaxed pt-0.5">{text}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Hardware specs */}
      <div className="dash-card p-6">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Tablet className="w-4 h-4 text-gray-400" />
          {t.counter_hub_hardwareTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Tablet specs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tablet className="w-4 h-4 text-blue-500" />
              <p className="font-semibold text-sm text-gray-800">{t.counter_hub_tabletLabel}</p>
            </div>
            <ul className="space-y-2">
              <HardwareSpec label={t.counter_hub_specOS} value={t.counter_hub_specOSValue} />
              <HardwareSpec label={t.counter_hub_specScreen} value={t.counter_hub_specScreenValue} />
              <HardwareSpec label={t.counter_hub_specRAM} value={t.counter_hub_specRAMValue} />
            </ul>
          </div>

          {/* Printer specs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Printer className="w-4 h-4 text-purple-500" />
              <p className="font-semibold text-sm text-gray-800">{t.counter_hub_printerLabel}</p>
            </div>
            <ul className="space-y-2">
              <HardwareSpec label={t.counter_hub_specType} value={t.counter_hub_specTypeValue} />
              <HardwareSpec label={t.counter_hub_specPaper} value={t.counter_hub_specPaperValue} />
              <HardwareSpec label={t.counter_hub_specConn} value={t.counter_hub_specConnValue} />
            </ul>
          </div>
        </div>

        {/* WiFi note */}
        <div className="mt-6 flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
          <Wifi className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            <span className="font-semibold">{t.counter_hub_wifiLabel}</span>{' '}
            {t.counter_hub_wifiNote}
          </p>
        </div>
      </div>
    </div>
  );
}

function ApkQRCode({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    renderStyledQR(el, {
      data: url,
      size: 160,
      dotColor: '#111827',
      cornerColor: '#f97316',
      bgColor: '#fff7ed',
    });
  }, [url]);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden border border-orange-100 bg-orange-50 p-2"
      style={{ width: 176, height: 176 }}
    />
  );
}

function Spec({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function HardwareSpec({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-2 text-sm">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-gray-700 text-right">{value}</span>
    </li>
  );
}
