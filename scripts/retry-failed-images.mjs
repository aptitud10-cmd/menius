/**
 * retry-failed-images.mjs
 * Regenerates the 3 images that failed due to Imagen 4 daily quota.
 * Uses gemini-2.5-flash-preview-05-20 as fallback.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY');
  process.exit(1);
}

const FAILED_IMAGES = [
  {
    file: 'seed/en/creme-brulee.webp',
    name: 'Crème Brûlée',
    description: 'Classic French vanilla custard with a caramelized sugar crust, perfectly torched',
    category: 'Desserts',
    cuisine: 'French',
  },
  {
    file: 'seed/en/ice-cream.webp',
    name: 'Artisan Ice Cream',
    description: 'Two scoops of house-made ice cream: vanilla, chocolate, strawberry, or mango',
    category: 'Desserts',
    cuisine: 'American',
  },
  {
    file: 'seed/en/apple-pie.webp',
    name: 'Apple Pie à la Mode',
    description: 'Warm spiced apple pie served with a scoop of vanilla ice cream and caramel drizzle',
    category: 'Desserts',
    cuisine: 'American',
  },
];

function buildPrompt(item) {
  const { name, description } = item;
  return `Commercial food advertising photograph — award-winning food photographer, Hasselblad H6D-400C, 120mm macro lens, three-point studio lighting.

SUBJECT: "${name}" — ${description}.

LIGHTING: Key octabox at 45° left, silver fill reflector at 30° right, rim backlight strip behind dish. Food glows from within.

CAMERA & COMPOSITION:
- f/3.2, ISO 100, 45-degree overhead angle for desserts
- SQUARE 1:1 composition — subject perfectly centered, filling 70% of frame
- White marble surface with subtle veining, soft gray background

FOOD STYLING: Dessert beautifully plated. Sauce or glaze dripping naturally. If ice cream: scoops perfectly rounded, glistening, micro condensation on cold bowl. If pie: warm steam rising, golden-brown crust visible. If crème brûlée: caramelized sugar crust glistening, torch marks visible.

COLOR: 5800K warm tones, lifted blacks, teal-orange split.

QUALITY: 4K photorealistic. NO text, watermarks, or AI artifacts.`;
}

async function generateWithFlash(prompt) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image',
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  });

  const result = await model.generateContent(prompt);
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }
  throw new Error('No image in response');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('🔄 Retrying 3 failed images with Gemini Flash...\n');

  for (let i = 0; i < FAILED_IMAGES.length; i++) {
    const item = FAILED_IMAGES[i];
    const outPath = join(ROOT, 'public', item.file);
    process.stdout.write(`[${i + 1}/3] Generating: ${item.name}...`);

    try {
      const prompt = buildPrompt(item);
      const buf = await generateWithFlash(prompt);
      writeFileSync(outPath, buf);
      console.log(' ✅');
    } catch (err) {
      console.log(` ❌ ${err.message}`);
    }

    if (i < FAILED_IMAGES.length - 1) await sleep(3000);
  }

  console.log('\n🎉 Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
