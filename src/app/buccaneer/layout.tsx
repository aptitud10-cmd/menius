import type { Metadata } from 'next';
import { Anton, JetBrains_Mono } from 'next/font/google';

/**
 * Buccaneer Diner's landing page — a client site, not MENIUS.
 *
 * It gets its own layout because the root <body> is white and this site is dark
 * end to end: the concept ("there is always a light on") makes the dark ground
 * the night itself, and every dish photo a lamp inside it. Painting the ground
 * here rather than fighting the root keeps MENIUS's own pages untouched.
 *
 * Anton and JetBrains Mono load only on this route. Bricolage comes from the root
 * layout, which already loads it as --font-display for MENIUS.
 */
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--bd-display',
  display: 'swap',
});

// Not a stylistic choice: the hero clock re-renders every minute, and tabular
// figures stop the line from reflowing as the digits change width.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--bd-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Buccaneer Diner — Open 24 Hours in East Elmhurst, Queens',
  description:
    'Breakfast at 4am, burgers at midnight. Astoria Boulevard’s diner, open 24 hours a day. Order online or stop by — 9301 Astoria Blvd, Queens NY.',
  openGraph: {
    title: 'Buccaneer Diner — Open 24 Hours',
    description:
      'Breakfast at 4am, burgers at midnight. Astoria Boulevard’s diner, open 24 hours a day.',
    type: 'website',
  },
};

export default function BuccaneerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${anton.variable} ${mono.variable} bd-root`}>{children}</div>
  );
}
