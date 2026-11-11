import type { Metadata } from 'next';
import { Besley } from 'next/font/google';
import { SITE_URL } from './data';
import './buccaneer-v2.css';

/**
 * Buccaneer Diner landing v2 — client preview, not MENIUS.
 * Besley (serif de rótulo, AD 5.1) loads only on this route; Bricolage comes
 * from the root layout as --font-display. No blackletter is ever loaded (AD 5.3).
 */
const besley = Besley({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-besley',
  display: 'swap',
});

const TITLE = 'Buccaneer Diner — Open 24 Hours on Astoria Blvd, East Elmhurst, Queens';
const DESCRIPTION =
  'Open 24/7 at 9301 Astoria Boulevard, East Elmhurst, NY. Breakfast all day. Dine in, pickup or delivery. Order online or call (718) 429-5188.';

/**
 * Everything the root layout sets for MENIUS is overridden here: the "| MENIUS"
 * title template, the canonical (root points at menius.app, which would tell
 * Google this page is a copy of the MENIUS home) and the share card (WhatsApp,
 * iMessage, social) — that one comes from ./opengraph-image.tsx.
 */
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Buccaneer Diner',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  // Preview the owner has not seen yet.
  robots: { index: false, follow: false },
};

export default function BuccaneerV2Layout({ children }: { children: React.ReactNode }) {
  return <div className={besley.variable}>{children}</div>;
}
