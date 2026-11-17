/** "+17184295188" → "(718) 429-5188" (US/Canada); any other format as is. */
export function prettyPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  const us = d.length === 11 && d.startsWith('1') ? d.slice(1) : d.length === 10 ? d : null;
  return us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : phone;
}

/** tel: link without spaces or punctuation. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
