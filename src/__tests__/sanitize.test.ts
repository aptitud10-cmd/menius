import { describe, it, expect } from 'vitest';
import { escapeHtml, stripTags, sanitizeText, sanitizeEmail, sanitizeMultiline, sanitizeFields } from '@/lib/sanitize';

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('escapes quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('passes through normal text', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('stripTags', () => {
  it('removes HTML tags', () => {
    expect(stripTags('<b>bold</b>')).toBe('bold');
  });

  it('removes script tags', () => {
    expect(stripTags('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('handles nested tags', () => {
    expect(stripTags('<div><p>text</p></div>')).toBe('text');
  });

  it('passes through text without tags', () => {
    expect(stripTags('just text')).toBe('just text');
  });
});

describe('sanitizeText', () => {
  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('strips HTML', () => {
    expect(sanitizeText('<b>bold</b>')).toBe('bold');
  });

  it('truncates to maxLength', () => {
    expect(sanitizeText('abcdefghij', 5)).toBe('abcde');
  });

  it('returns empty for non-string input', () => {
    expect(sanitizeText(123)).toBe('');
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('lowercases email', () => {
    expect(sanitizeEmail('USER@TEST.COM')).toBe('user@test.com');
  });

  it('trims whitespace', () => {
    expect(sanitizeEmail('  user@test.com  ')).toBe('user@test.com');
  });

  it('returns empty for non-string', () => {
    expect(sanitizeEmail(42)).toBe('');
    expect(sanitizeEmail(null)).toBe('');
  });

  it('truncates long emails', () => {
    const longEmail = 'a'.repeat(300) + '@test.com';
    const result = sanitizeEmail(longEmail);
    expect(result.length).toBeLessThanOrEqual(254);
  });
});

describe('sanitizeMultiline', () => {
  it('strips HTML but preserves newlines', () => {
    expect(sanitizeMultiline('Line 1\nLine 2')).toBe('Line 1\nLine 2');
  });

  it('truncates to maxLength', () => {
    const long = 'a'.repeat(2000);
    expect(sanitizeMultiline(long, 1000).length).toBe(1000);
  });

  it('returns empty for non-string', () => {
    expect(sanitizeMultiline(null)).toBe('');
  });
});

describe('sanitizeFields', () => {
  it('sanitizes multiple field types', () => {
    const input = {
      name: '<b>Test</b>',
      email: '  USER@TEST.COM  ',
      notes: '<p>Note</p>',
    };
    const result = sanitizeFields(input, {
      name: 'text',
      email: 'email',
      notes: 'multiline',
    });
    expect(result.name).toBe('Test');
    expect(result.email).toBe('user@test.com');
    expect(result.notes).toBe('Note');
  });

  it('preserves fields not in config', () => {
    const input = { name: 'Test', id: 123 };
    const result = sanitizeFields(input, { name: 'text' });
    expect(result.id).toBe(123);
  });
});
