'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** CTA del nav en auth: en /signup el formulario ya es el CTA, así que el nav ofrece "Sign in". */
export function V2AuthNavCta({ tryLabel, signInLabel }: { tryLabel: string; signInLabel: string }) {
  const pathname = usePathname();
  if (pathname === '/signup') {
    return <Link className="btn btn-quiet btn-sm" href="/login">{signInLabel}</Link>;
  }
  return <Link className="btn btn-primary btn-sm" href="/signup">{tryLabel}</Link>;
}
