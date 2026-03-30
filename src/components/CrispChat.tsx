'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? '';

export default function CrispChat({
  userEmail,
  userName,
  hideWidget = false,
}: {
  userEmail?: string;
  userName?: string;
  hideWidget?: boolean;
} = {}) {
  useEffect(() => {
    if (!CRISP_WEBSITE_ID || typeof window === 'undefined') return;
    if (document.getElementById('crisp-script')) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const script = document.createElement('script');
    script.id = 'crisp-script';
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Hide or show the widget bubble based on the page context
  useEffect(() => {
    if (!CRISP_WEBSITE_ID || typeof window === 'undefined') return;
    if (!window.$crisp) return;
    window.$crisp.push(['do', hideWidget ? 'chat:hide' : 'chat:show']);
  }, [hideWidget]);

  // Identify logged-in user — $crisp acts as a command queue, safe to push before script loads
  useEffect(() => {
    if (!CRISP_WEBSITE_ID || typeof window === 'undefined') return;
    if (!userEmail && !userName) return;
    if (!window.$crisp) return;

    if (userEmail) window.$crisp.push(['set', 'user:email', [userEmail]]);
    if (userName) window.$crisp.push(['set', 'user:nickname', [userName]]);
  }, [userEmail, userName]);

  return null;
}
