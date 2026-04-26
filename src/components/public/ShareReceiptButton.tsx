'use client';

import { Share2 } from 'lucide-react';
import { getTranslations } from '@/lib/translations';

interface Props {
  orderNumber: string;
  restaurantName: string;
  restaurantSlug: string;
  total: number;
  currency: string;
  items: { name: string; qty: number }[];
  locale: 'es' | 'en';
}

export default function ShareReceiptButton({
  orderNumber, restaurantName, restaurantSlug,
  total, currency, items, locale,
}: Props) {
  const t = getTranslations(locale);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const menuUrl = `${appUrl}/${restaurantSlug}`;

  const itemsList = items
    .slice(0, 5)
    .map((i) => `• ${i.qty}x ${i.name}`)
    .join('\n');

  const moreItems = items.length > 5 ? t.shareMoreItems(items.length - 5) : '';

  const message = t.shareMessage(
    restaurantName, itemsList, moreItems, currency, total.toFixed(2), orderNumber, menuUrl
  );

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.shareTitle(restaurantName),
          text: message,
          url: menuUrl,
        });
        return;
      } catch {
        // User cancelled or not supported — fall through to WhatsApp
      }
    }
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      data-testid="share-receipt-btn"
    >
      <Share2 className="w-4 h-4" />
      <span className="text-sm font-medium">
        {t.shareWithFriends}
      </span>
    </button>
  );
}
