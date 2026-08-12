/**
 * Regenerates the Seafood category with nano-banana.
 *
 * Same approach as regen-side-orders.mjs, for the reason recorded there: Kontext
 * inherits whatever sits on the reference plate and refuses to change a base
 * ingredient's colour, so it is not usable for a catalogue where the dishes
 * genuinely differ. nano-banana composes from the text; consistency comes from
 * the shared prompt body, not from a reference image.
 *
 * Two hazards specific to this category, both learned the hard way in Side Orders:
 *   - flat dishes invite an overhead camera, which breaks the 35-degree line the
 *     rest of the menu holds. Every entry that could read flat restates the angle.
 *   - "served with soup or salad, potato and vegetable" appears in most of these
 *     descriptions. That is an ordering choice, not a plate: photographing it
 *     literally would put a cup of soup in twenty photos. The prompts show the
 *     seafood with potato and vegetable and never the soup.
 *
 * Usage: node scripts/regen-seafood.mjs [key ...]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const OUT_DIR = 'scripts/.product-output';

const key = (() => {
  const m = readFileSync('.env.local', 'utf8').match(/^FAL_API_KEY\s*=\s*(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '') : null;
})();
if (!key) {
  console.error('FAL_API_KEY no encontrada en .env.local.');
  process.exit(1);
}
fal.config({ credentials: key });

const HARD = `Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture. A black negative fill card on the right deepens shadows for maximum tonal contrast.`;
const SOFT = `Large octabox key light positioned left at 45 degrees, diffused and soft. A silver reflector card on the right at 2 stops below key provides gentle fill.`;

/** Restated per-dish because a flat subject pulls the camera overhead. */
const ANGLE = `The camera is at a 35-degree THREE-QUARTER angle looking ACROSS the plate — NOT overhead, NOT top-down, NOT a flat lay. The far rim of the plate and the dark surface behind it are visible.`;

const build = ({ subject, plate, styling, lighting, aperture }) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish or side. NO coleslaw, NO pickles, NO soup, NO cup, NO bowl, NO extra dish, NO ramekin unless explicitly named above.

SERVED IN/ON: one single large plain white ceramic plate. Nothing else in frame.
PLATING IDENTITY: Classic American diner presentation. Generous, honest, unpretentious portions — no fine-dining tweezer plating, no microgreens, no smears or dots of sauce. NO cilantro, NO Talavera pottery, NO rustic clay or terracotta.
CAMERA: 50mm or 85mm prime lens, ${aperture}, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: 35-degree hero angle — the universal professional food photography standard.
COMPOSITION: Square 1:1 frame. The plate is CENTERED and fills 75-80% of the frame. SAFE ZONE: all food within the central 80%. DO NOT shift the plate left or right.

SURFACE & SETTING: the food is served on a CLEAN PLAIN WHITE ceramic plate — NEVER a cup, mug, clay pot or patterned dish. The plate sits on a dark matte slate stone surface, one CONTINUOUS unbroken tabletop running past every edge of the frame — NOT a board, NOT a tray, NOT a slab with visible edges under the plate. The background is a COMPLETELY PLAIN, EMPTY, PURE BLACK backdrop, heavily out of focus — NO furniture, NO chairs, NO tables, NO windows, NO wall, NO wood, NO objects of any kind. Every corner and every edge of the frame is DARK — no brown, no amber, no warm glow, no lit surface in the background. NO studio softbox, NO reflector panel, NO light stand, NO white or silver rectangle at any edge of the image.

LIGHTING: ${lighting}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones. Highlights slightly golden, never blown out. High micro-contrast revealing every texture detail. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling}`;

/** The dinner plates share a garnish: potato and vegetable, never the soup. */
const DINNER = (main) =>
  `${main} placed centre-front of the plate, a portion of roasted potato behind it on the left and a portion of green beans behind it on the right. Nothing else on the plate — NO soup, NO cup, NO bowl, NO salad, NO bread. ${ANGLE}`;

const FRIED = (main, sauce) =>
  `${main} piled centre-front of the plate, one lemon wedge and a small white ramekin of ${sauce} beside them on the same plate. Nothing else. ${ANGLE}`;

const ITEMS = {
  'lobster-tails': {
    subject: `"Twin 5 oz. Rock Lobster Tails" — two broiled rock lobster tails with drawn butter and lemon.`,
    plate: DINNER(`two broiled lobster tails, shells split open and the white meat lifted out over the shell, with a small white ramekin of drawn butter and one lemon wedge`),
    styling: `Lobster shells bright red-orange, the meat white with pink edges and a glossy butter sheen. Butter in the ramekin clear and golden.`,
    lighting: HARD, aperture: 'f/4.5 — both tails in sharp focus' },
  'jumbo-shrimp-broiled': {
    subject: `"Jumbo Shrimp (6) Broiled" — six jumbo shrimp broiled in wine butter sauce.`,
    plate: DINNER(`six large broiled shrimp arranged in a row, glossy with wine butter sauce`),
    styling: `Shrimp plump, pink-orange with lightly charred edges, glistening with butter sauce. Tails on.`,
    lighting: HARD, aperture: 'f/4.5 — every shrimp in sharp focus' },
  'shrimp-scampi': {
    subject: `"Shrimp Scampi (6)" — six shrimp in roasted garlic wine butter sauce.`,
    plate: DINNER(`six shrimp in a shallow pool of garlic butter sauce with visible sliced garlic and chopped parsley`),
    styling: `Shrimp pink and plump, sauce glossy and golden with browned garlic slices scattered through it.`,
    lighting: HARD, aperture: 'f/4.5 — every shrimp in sharp focus' },
  'deep-sea-scallops': {
    subject: `"Deep Sea Scallops" — broiled sea scallops with herb olive oil and roasted garlic.`,
    plate: DINNER(`eight large broiled sea scallops arranged in the centre, glistening with herb oil`),
    styling: `Scallops thick and cylindrical, ivory-white with deep golden seared tops, flecked with herbs.`,
    lighting: HARD, aperture: 'f/4.5 — the scallops in sharp focus' },
  'filet-sole-broiled': {
    subject: `"Filet of Sole Broiled" — a broiled filet of sole with butter sauce.`,
    plate: DINNER(`one long broiled filet of sole, pale and flaking, with a lemon wedge`),
    styling: `Sole fillet white and delicate with lightly browned edges and visible flakes, glossy with butter.`,
    lighting: SOFT, aperture: 'f/4.5 — the fillet in sharp focus' },
  'atlantic-salmon': {
    subject: `"Atlantic Salmon Filet" — a broiled salmon filet with lemon wine sauce.`,
    plate: DINNER(`one thick broiled salmon filet, skin side down, with a lemon wedge`),
    styling: `Salmon deep coral-pink with visible white fat lines between the flakes and a caramelised top, moist and just cooked.`,
    lighting: HARD, aperture: 'f/4.5 — the filet in sharp focus' },
  'tilapia-broiled': {
    subject: `"Tilapia Filet Broiled" — a broiled tilapia filet with lemon olive oil sauce.`,
    plate: DINNER(`one broiled tilapia filet, white and flaking, with a lemon wedge`),
    styling: `Tilapia white and firm with lightly golden edges, glossy with olive oil and flecked with herbs.`,
    lighting: SOFT, aperture: 'f/4.5 — the filet in sharp focus' },
  'tilapia-francaise': {
    subject: `"Tilapia Francaise" — tilapia sauteed in creamy wine sauce with lemon.`,
    plate: DINNER(`one tilapia filet in a pale creamy lemon sauce, with two thin lemon slices on top`),
    styling: `Tilapia in a light egg-battered golden coating, napped with a pale glossy cream sauce, lemon slices translucent.`,
    lighting: SOFT, aperture: 'f/4.5 — the filet in sharp focus' },
  'stuffed-sole': {
    subject: `"Stuffed Filet of Sole" — filet of sole with crabmeat stuffing.`,
    plate: DINNER(`one rolled filet of sole with crabmeat stuffing visible at the open end, lightly browned on top`),
    styling: `Sole pale and delicate wrapped around a coarse golden crab stuffing, the stuffing clearly visible in cross-section.`,
    lighting: SOFT, aperture: 'f/4.5 — the stuffing in sharp focus' },
  'stuffed-tilapia': {
    subject: `"Stuffed Tilapia Filet" — tilapia filet with crabmeat stuffing.`,
    plate: DINNER(`one tilapia filet topped with a mound of golden crabmeat stuffing`),
    styling: `Tilapia white beneath a coarse, golden-browned crab stuffing with visible lumps of crab.`,
    lighting: SOFT, aperture: 'f/4.5 — the stuffing in sharp focus' },
  'stuffed-shrimp': {
    subject: `"Stuffed Shrimp" — jumbo shrimp with crabmeat stuffing.`,
    plate: DINNER(`five butterflied jumbo shrimp, each topped with golden crabmeat stuffing`),
    styling: `Shrimp butterflied open, pink at the edges, each carrying a mound of coarse golden crab stuffing browned on top.`,
    lighting: HARD, aperture: 'f/4.5 — every shrimp in sharp focus' },
  'stuffed-salmon-florentine': {
    subject: `"Stuffed Salmon Florentine" — salmon with spinach, mushrooms, grilled tomato and feta.`,
    plate: DINNER(`one thick salmon filet cut open and filled with wilted spinach, sliced mushrooms and crumbled feta, with a grilled tomato half beside it`),
    styling: `Salmon coral-pink, the filling dark green spinach with white feta crumbles clearly visible in the split. Tomato half charred at the edges.`,
    lighting: HARD, aperture: 'f/4.5 — the filling in sharp focus' },
  'stuffed-clams': {
    subject: `"Stuffed Clams" — clams with crabmeat stuffing, baked in the shell.`,
    plate: `six clam shells in a ring on the plate, each filled with golden browned crabmeat stuffing, with one lemon wedge in the centre. Nothing else. ${ANGLE}`,
    styling: `Shells grey-brown and ridged, stuffing golden and crusty on top with visible crab and breadcrumb texture.`,
    lighting: HARD, aperture: 'f/4.0 — the stuffing texture in sharp focus' },
  'shrimp-francaise': {
    subject: `"Shrimp Francaise" — six jumbo shrimp in creamy wine sauce over rice.`,
    plate: `a bed of white rice covering the centre of the plate with six shrimp arranged on top in a pale creamy lemon sauce, and two thin lemon slices. Nothing else on the plate — NO potato, NO vegetable, NO soup. ${ANGLE}`,
    styling: `Shrimp in a light golden egg coating over fluffy white rice, napped with a pale glossy sauce.`,
    lighting: SOFT, aperture: 'f/4.5 — the shrimp in sharp focus' },

  'fried-calamari-dinner': {
    subject: `"Fried Calamari Dinner" — fried calamari with marinara sauce.`,
    plate: FRIED(`a generous pile of golden fried calamari rings and tentacles`, 'red marinara sauce'),
    styling: `Calamari in a light craggy golden batter, rings and tentacles mixed, crisp and irregular.`,
    lighting: HARD, aperture: 'f/4.0 — the pile in sharp focus' },
  'fried-filet-sole': {
    subject: `"Fried Filet of Sole" — golden fried filet of sole with tartar sauce.`,
    plate: FRIED(`two long golden fried fillets of sole`, 'white tartar sauce'),
    styling: `Fillets in a crisp golden breadcrumb coating, one broken open to show flaking white fish inside.`,
    lighting: HARD, aperture: 'f/4.0 — the coating texture in sharp focus' },
  'fried-scallops': {
    subject: `"Fried Scallops" — crispy fried scallops with tartar sauce.`,
    plate: FRIED(`a pile of golden fried scallops`, 'white tartar sauce'),
    styling: `Scallops in a crisp golden breadcrumb coating, plump and round, one broken open showing white scallop inside.`,
    lighting: HARD, aperture: 'f/4.0 — the pile in sharp focus' },
  'fried-jumbo-shrimp': {
    subject: `"Fried Jumbo Shrimp (6)" — six golden breaded jumbo shrimp with tartar sauce.`,
    plate: FRIED(`six large breaded fried shrimp with their tails on, arranged in a fan`, 'white tartar sauce'),
    styling: `Breading golden and craggy, shrimp plump with bright tails showing at the ends.`,
    lighting: HARD, aperture: 'f/4.0 — every shrimp in sharp focus' },
  'fried-tilapia': {
    subject: `"Fried Tilapia" — fried tilapia with tartar sauce.`,
    plate: FRIED(`two golden fried tilapia fillets`, 'white tartar sauce'),
    styling: `Fillets in a crisp golden coating, one broken open to show moist white fish flaking inside.`,
    lighting: HARD, aperture: 'f/4.0 — the coating texture in sharp focus' },
  'seafood-combination': {
    subject: `"Seafood Combination" — fried shrimp, scallops and filet of sole with tartar sauce.`,
    plate: `three golden fried shrimp, four fried scallops and one fried filet of sole grouped together on the plate, each type clearly distinguishable, with one lemon wedge and a small white ramekin of white tartar sauce. Nothing else. ${ANGLE}`,
    styling: `All three in crisp golden breading but visibly different: shrimp curved with tails, scallops round and plump, sole long and flat.`,
    lighting: HARD, aperture: 'f/4.0 — all three types in sharp focus' },
};

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const picked = process.argv.slice(2).filter((a) => ITEMS[a]);
const keys = picked.length ? picked : Object.keys(ITEMS);

let ok = 0;
for (const [i, k] of keys.entries()) {
  process.stdout.write(`[${i + 1}/${keys.length}] ${k}… `);
  try {
    const res = await fal.subscribe('fal-ai/nano-banana-2', {
      input: { prompt: build(ITEMS[k]), aspect_ratio: '1:1', output_resolution: '2K', num_images: 1 },
    });
    const url = res?.data?.images?.[0]?.url ?? res?.images?.[0]?.url;
    if (!url) { console.log('sin imagen'); continue; }
    writeFileSync(`${OUT_DIR}/${k}.jpg`, Buffer.from(await (await fetch(url)).arrayBuffer()));
    ok++;
    console.log('ok');
  } catch (err) {
    console.log('ERROR:', err?.message ?? String(err));
  }
}
console.log(`\n${ok}/${keys.length} generados en ${OUT_DIR}.`);
