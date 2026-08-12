import { readFileSync, writeFileSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const key = readFileSync('.env.local','utf8').match(/^FAL_API_KEY\s*=\s*(.+)$/m)[1].trim().replace(/\r$/,'');
fal.config({ credentials: key });

const HARD = `Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture. A black negative fill card on the right deepens shadows for maximum tonal contrast.`;
const SOFT = `Large octabox key light positioned left at 45 degrees, diffused and soft. A silver reflector card on the right at 2 stops below key provides gentle fill.`;

const build = ({subject,plate,styling,lighting,aperture}) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish or side. NO coleslaw, NO pickles, NO extra dish, NO ramekin unless explicitly named above.

SERVED IN/ON: one single large plain white ceramic plate. Nothing else in frame.
PLATING IDENTITY: Classic American diner presentation. Generous, honest, unpretentious portions — no fine-dining tweezer plating, no microgreens, no smears or dots of sauce. NO cilantro, NO lime wedges, NO Talavera pottery, NO rustic clay or terracotta.
CAMERA: 50mm or 85mm prime lens, ${aperture}, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: 35-degree hero angle — the universal professional food photography standard.
COMPOSITION: Square 1:1 frame. The plate is CENTERED and fills 75-80% of the frame. SAFE ZONE: all food within the central 80%. DO NOT shift the plate left or right.

SURFACE & SETTING: the food is served on a CLEAN PLAIN WHITE ceramic plate — NEVER a cup, mug, clay pot or patterned dish. The plate sits on a dark matte slate stone surface. The background is a COMPLETELY PLAIN, EMPTY, deep dark backdrop, heavily out of focus — NO furniture, NO chairs, NO tables, NO windows, NO objects of any kind behind the food. NO studio softbox, NO reflector, NO light stand, NO camera gear anywhere in frame. NO bright washed-out corners.

LIGHTING: ${lighting}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones — never pure black. Highlights slightly golden, never blown out. High micro-contrast revealing every texture detail. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling}`;

const ITEMS = {
  'waffle-fries': {
    subject: ,
    plate: ,
    styling: ,
    lighting: HARD, aperture: 'f/4.0 — the whole pile in sharp focus' },
  'sweet-potato-fries': {
    subject: `"Sweet Potato Fries" — a generous portion of crispy sweet potato fries.`,
    plate: `a tall natural pile of sweet potato fries filling the centre of the plate. NOTHING else on the plate — NO ramekin, NO sauce, NO dip, NO ketchup.`,
    styling: `The fries are cut from SWEET POTATO: deep vivid ORANGE flesh, clearly orange-amber throughout, never pale yellow like regular potato. Crisp darker caramelised edges, soft orange interior visible where a fry is broken. Visible salt crystals.`,
    lighting: HARD, aperture: 'f/4.0 — the whole pile in sharp focus' },
  'lettuce-tomato-salad': {
    subject: `"Lettuce & Tomato Salad" — a simple fresh side salad of lettuce and tomato.`,
    plate: `a mound of crisp green lettuce leaves in the centre of the plate with thick slices of ripe red tomato arranged over them. NOTHING else on the plate — NO ramekin, NO sauce, NO ketchup, NO dressing cup, NO fried food of any kind.`,
    styling: `Lettuce crisp and vividly green with water droplets, tomato slices thick, deep red and juicy with visible seeds.`,
    lighting: SOFT, aperture: 'f/5.6 — all ingredients in sharp focus' },
  'tossed-salad': {
    subject: `"Tossed Salad" — a fresh mixed green salad.`,
    plate: `a generous mound of mixed green leaves in the centre of the plate, tossed with sliced cucumber, wedges of red tomato and thin red onion rings. NOTHING else on the plate — NO ramekin, NO sauce, NO ketchup, NO dressing cup, NO fried food of any kind.`,
    styling: `Mixed greens crisp and glossy, cucumber slices fresh, tomato wedges deep red, red onion in thin translucent rings.`,
    lighting: SOFT, aperture: 'f/5.6 — all ingredients in sharp focus' },
};

for (const [k,v] of Object.entries(ITEMS)) {
  process.stdout.write(`${k}… `);
  try {
    const res = await fal.subscribe('fal-ai/nano-banana-2', {
      input: { prompt: build(v), aspect_ratio: '1:1', output_resolution: '2K', num_images: 1 } });
    const url = res?.data?.images?.[0]?.url ?? res?.images?.[0]?.url;
    if (!url) { console.log('sin imagen'); continue; }
    writeFileSync(`scripts/.product-output/${k}.jpg`, Buffer.from(await (await fetch(url)).arrayBuffer()));
    console.log('ok');
  } catch(e) { console.log('ERROR:', e?.message ?? String(e)); }
}
