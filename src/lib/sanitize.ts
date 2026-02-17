/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 * Applied to all user-facing text inputs before storing in database.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const ENTITY_REGEX = /[&<>"'`/]/g;

/** Escape HTML special characters to prevent XSS */
export function escapeHtml(str: string): string {
  return str.replace(ENTITY_REGEX, (char) => HTML_ENTITIES[char] || char);
}

/** Remove all HTML tags from a string */
export function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/** Sanitize a text input: strip tags, trim, and limit length */
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return stripTags(input).trim().slice(0, maxLength);
}

/** Sanitize an email input */
export function sanitizeEmail(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().toLowerCase().slice(0, 254);
}

/** Sanitize a multiline text input (notes, descriptions, addresses) */
export function sanitizeMultiline(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return stripTags(input).trim().slice(0, maxLength);
}

/** Sanitize an object's string fields */
export function sanitizeFields(
  obj: Record<string, unknown>,
  fieldConfigs: Record<string, 'text' | 'email' | 'multiline'>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj };
  for (const [field, type] of Object.entries(fieldConfigs)) {
    if (field in result) {
      switch (type) {
        case 'text':
          result[field] = sanitizeText(result[field]);
          break;
        case 'email':
          result[field] = sanitizeEmail(result[field]);
          break;
        case 'multiline':
          result[field] = sanitizeMultiline(result[field]);
          break;
      }
    }
  }
  return result;
}
