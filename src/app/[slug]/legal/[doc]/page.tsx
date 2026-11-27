import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { demoRestaurant } from '@/lib/demo-data';
import { grillHouseRestaurant } from '@/lib/demo-data-en';
import { PrivacyPolicyContent } from '@/components/legal/PrivacyPolicyContent';
import { RefundPolicyContent, REFUND_POLICY_UPDATED } from '@/components/legal/RefundPolicyContent';
import { usablePaymentMethods } from '@/lib/payments/online-ready';
import type { PaymentMethod } from '@/types';
import { LegalBackButton, LegalSeeAlsoLink } from './LegalBackButton';

// Páginas legales DENTRO de la tienda (claras, con el nombre del restaurante),
// para que el link del checkout no saque al comensal al sitio de MENIUS.
// refunds = política de reembolsos del restaurante · privacy = la de MENIUS,
// que es quien procesa los datos del pedido (como hacen Toast o ChowNow).

export const revalidate = 3600;

type Doc = 'refunds' | 'privacy';
const DOCS: Doc[] = ['refunds', 'privacy'];

interface StoreInfo {
  name: string;
  slug: string;
  locale: 'es' | 'en';
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  /** Sin tarjeta habilitada: la política omite las secciones de tarjeta. */
  cashOnly: boolean;
}

const DEMOS: Record<string, StoreInfo> = {
  'la-casa-del-sabor': { name: demoRestaurant.name, slug: 'la-casa-del-sabor', locale: 'es', logo_url: null, phone: null, address: null, cashOnly: true },
  'the-grill-house': { name: grillHouseRestaurant.name, slug: 'the-grill-house', locale: 'en', logo_url: null, phone: null, address: null, cashOnly: true },
};

async function getStore(slug: string): Promise<StoreInfo | null> {
  if (DEMOS[slug]) return DEMOS[slug];
  const { data } = await createAdminClient({ isr: true })
    .from('restaurants')
    .select('name, slug, locale, logo_url, phone, address, payment_methods_enabled, stripe_account_id, stripe_onboarding_complete, currency, wompi_connected')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  return {
    name: data.name,
    slug: data.slug,
    locale: data.locale === 'en' ? 'en' : 'es',
    logo_url: data.logo_url,
    phone: data.phone,
    address: data.address,
    cashOnly: !usablePaymentMethods({ ...data, payment_methods_enabled: data.payment_methods_enabled as PaymentMethod[] | null }).includes('online'),
  };
}

const COPY = {
  es: {
    refunds: 'Política de reembolsos',
    privacy: 'Política de privacidad',
    updated: 'Última actualización',
    back: 'Volver al menú',
    backCheckout: 'Volver al pedido',
    privacyIntro: (r: string) => `${r} usa MENIUS para recibir pedidos en línea. Esta es la política de privacidad de MENIUS y cubre los datos que das al hacer tu pedido. Para dudas sobre el pedido en sí, habla con ${r}.`,
    seeAlso: 'Ver también',
    poweredBy: 'Pedidos en línea con MENIUS',
  },
  en: {
    refunds: 'Refund policy',
    privacy: 'Privacy policy',
    updated: 'Last updated',
    back: 'Back to menu',
    backCheckout: 'Back to checkout',
    privacyIntro: (r: string) => `${r} uses MENIUS to take orders online. This is the MENIUS privacy policy, and it covers the details you give when you order. For questions about the order itself, talk to ${r}.`,
    seeAlso: 'See also',
    poweredBy: 'Online ordering by MENIUS',
  },
};

const PRIVACY_UPDATED = { es: '25 de noviembre de 2026', en: 'November 25, 2026' };

interface PageProps {
  params: Promise<{ slug: string; doc: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const store = DOCS.includes(params.doc as Doc) ? await getStore(params.slug) : null;
  if (!store) return { robots: { index: false } };
  const c = COPY[store.locale];
  return {
    // absolute: sin el "| MENIUS" del template del sitio; es una página de la tienda.
    title: { absolute: `${params.doc === 'refunds' ? c.refunds : c.privacy} · ${store.name}` },
    robots: { index: false },
  };
}

export default async function StoreLegalPage(props: PageProps) {
  const params = await props.params;
  if (!DOCS.includes(params.doc as Doc)) notFound();
  const doc = params.doc as Doc;
  const store = await getStore(params.slug);
  if (!store) notFound();

  const { locale } = store;
  const c = COPY[locale];
  const other: Doc = doc === 'refunds' ? 'privacy' : 'refunds';

  return (
    <div className="min-h-dvh bg-white text-[#111114]">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-black/[0.07]">
        <div className="max-w-[680px] mx-auto px-4 h-14 flex items-center gap-3">
          <LegalBackButton slug={store.slug} menuLabel={c.back} checkoutLabel={c.backCheckout} />
          <span className="ml-auto flex items-center gap-2 min-w-0">
            {store.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logo_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
            )}
            <span className="truncate text-[14px] font-semibold">{store.name}</span>
          </span>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-4 pt-8 pb-12 sm:pt-12">
        <h1 className="text-[28px] sm:text-[34px] leading-tight font-semibold tracking-tight m-0">
          {doc === 'refunds' ? c.refunds : c.privacy}
        </h1>
        <p className="text-[13px] text-[#6b6b74] mt-2 mb-0">
          {c.updated}: {doc === 'refunds' ? REFUND_POLICY_UPDATED[locale] : PRIVACY_UPDATED[locale]}
        </p>

        {doc === 'privacy' && (
          <p className="mt-6 mb-0 rounded-2xl bg-[#f5f5f8] p-4 text-[14.5px] leading-relaxed text-[#4f4f57]">
            {c.privacyIntro(store.name)}
          </p>
        )}

        <div className="mt-4">
          {doc === 'refunds'
            ? <RefundPolicyContent locale={locale} name={store.name} phone={store.phone} address={store.address} cashOnly={store.cashOnly} />
            : <PrivacyPolicyContent locale={locale} tone="light" />}
        </div>

        <p className="mt-10 pt-5 border-t border-black/[0.07] text-[14px] text-[#4f4f57]">
          {c.seeAlso}:{' '}
          <LegalSeeAlsoLink href={`/${store.slug}/legal/${other}`} className="font-medium text-[#047a65] underline underline-offset-2">
            {other === 'refunds' ? c.refunds : c.privacy}
          </LegalSeeAlsoLink>
        </p>
        <p className="mt-6 text-[12.5px] text-[#6b6b74]">{c.poweredBy}</p>
      </main>
    </div>
  );
}
