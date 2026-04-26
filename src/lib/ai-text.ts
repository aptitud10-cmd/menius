/**
 * ai-text.ts — Shared text generation with Gemini → OpenRouter fallback.
 *
 * Usage:
 *   const { text } = await callTextAI(prompt, { maxTokens: 2048, temperature: 1.0 });
 *
 * Providers tried in order:
 *   1. Google Gemini (gemini-2.5-flash) via REST — primary
 *   2. OpenRouter (gpt-4o-mini) via OpenAI-compatible API — fallback if Gemini fails
 *
 * Returns the raw text string. JSON parsing is the caller's responsibility.
 */

import { createLogger } from './logger';

export interface TextAIOptions {
  maxTokens?: number;
  temperature?: number;
  /** If true, both providers will request structured JSON output */
  jsonMode?: boolean;
}

export interface TextAIResult {
  text: string;
  provider: 'gemini' | 'openrouter';
}

export async function callTextAI(
  prompt: string,
  options: TextAIOptions = {},
): Promise<TextAIResult> {
  const logger = createLogger('ai-text');
  const { maxTokens = 2048, temperature = 1.0, jsonMode = true } = options;

  const geminiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  const openrouterKey = (process.env.OPENROUTER_API_KEY ?? '').trim();

  if (!geminiKey && !openrouterKey) {
    throw new Error('No AI provider configured (GEMINI_API_KEY or OPENROUTER_API_KEY required)');
  }

  // ── 1. Try Gemini ──────────────────────────────────────────────────────────
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const text = (data?.candidates?.[0]?.content?.parts ?? [])
          .filter((p: { thought?: boolean }) => !p.thought)
          .map((p: { text?: string }) => p.text ?? '')
          .join('');
        if (text) return { text, provider: 'gemini' };
      } else {
        logger.warn('Gemini API returned non-ok status', { status: res.status });
      }
    } catch (err) {
      logger.warn('Gemini API call failed, falling back to OpenRouter', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 2. Fallback: OpenRouter ────────────────────────────────────────────────
  if (!openrouterKey) {
    throw new Error('Gemini unavailable and OPENROUTER_API_KEY not configured');
  }

  const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openrouterKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app',
      'X-Title': 'Menius',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!orRes.ok) {
    const errText = await orRes.text();
    logger.error('OpenRouter API failed', { status: orRes.status, body: errText.slice(0, 200) });
    throw new Error(`OpenRouter error: ${errText.slice(0, 200)}`);
  }

  const orData = await orRes.json();
  const text = orData?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('OpenRouter returned empty response');

  return { text, provider: 'openrouter' };
}
