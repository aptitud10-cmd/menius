# Sistema de composición mobile — Landing MENIUS

> Verificado contra Awwwards SOTD junio 2026 (Hashgraph Ventures, REF Digital,
> Sakazuki), Linear, PostHog, Raycast. Research del 2026-06-16.
>
> **Propósito:** estas son reglas OBLIGATORIAS, no sugerencias. Toda sección de la
> landing mobile las cumple. Existen para garantizar COHERENCIA — que las 8
> secciones se sientan un sistema, no 8 piezas distintas. Si una sección no puede
> cumplir una regla, se documenta por qué; no se ignora en silencio.

---

## Las 7 reglas del sistema

### S1 — Índice numérico, no eyebrow centrado
Cada sección de contenido arranca con un índice numérico **mono, alineado a la
izquierda**, NO con el eyebrow verde uppercase centrado actual.

```jsx
// MAL (2021, lo que hay hoy):
<p className="text-sm text-[#05c8a7] uppercase tracking-[0.2em] text-center">FUNCIONES</p>

// BIEN (2026):
<span className="font-mono text-xs tracking-[0.2em] text-[#05c8a7]/70">02 / Funciones</span>
```
Numeración: `01` social proof · `02` pricing · `03` calculadora · `04` features ·
`05` comparación · `06` cómo funciona · `07` testimonios · `08` FAQ.

### S2 — Alineación IZQUIERDA en contenido
El título de sección y el cuerpo van a la **izquierda**, no centrados. El centrado
es la señal #1 de template. Excepción única: el CTA final (cierre emocional centrado).

### S3 — Escala tipográfica con clamp (Tailwind 3 → inline style)
Tres tamaños, no improvisados:
```
título sección (h2):  clamp(2.25rem, 9vw, 3rem)      // ~36px mobile
display (1-2 secc.):  clamp(2.75rem, 13vw, 4.5rem)   // solo calculadora + CTA
subtítulo (h3):       clamp(1.15rem, 4.5vw, 1.5rem)
índice / mono:        0.75rem fijo, tracking 0.2em
```
`display` se usa SOLO en la calculadora (el número de ahorro) y el CTA final.
El resto usa `título sección`. Nunca todas las secciones en display.

### S4 — Ritmo vertical variable (no todo el mismo padding)
Hoy todas las secciones usan `SECTION_PY = py-24 md:py-28 lg:py-40`. Eso es el scroll
plano. Densidad según función:
| Sección | Padding mobile | Razón |
|---|---|---|
| Social proof | `py-12` | credencial, no mensaje → compacta |
| Pricing | `py-20` | decisión → generosa |
| Calculadora | `py-28` | un dato grande → respira |
| Features | `py-16` | denso → orden |
| Comparación | `py-20` | normal |
| Cómo funciona | `py-20` | narrativa con ritmo interno |
| Testimonios | `py-14` | piezas chicas → compacta |
| FAQ | `py-16` | utilidad |
| CTA final | `py-28` | máxima intención |

### S5 — Variación intencional entre secciones (no el mismo molde × 8)
Prohibido: las 8 secciones con la misma estructura (índice→título→párrafo→card-borde).
Cada sección compone distinto PERO bajo las mismas reglas:
- Pricing → cards apiladas con el recomendado destacado por fondo, no por badge centrado
- Cómo funciona → pasos con número grande izquierda + línea conectora vertical
- Features → un panel activo, no grid de cards iguales
- Testimonios → stat grande como ancla, integrado
La coherencia viene de S1-S4 + paleta, no de clonar el layout.

### S6 — Cero scroll horizontal en mobile
Ninguna tabla/contenido obliga a deslizar lateral. Tablas → acordeón o cards apiladas.
(Ya aplicado a la tabla de pricing.)

### S7 — Motion: reveal simple, sin parpadeo
- Reveal de entrada: `opacity 0→1 + translateY(16px→0)`, `duration-500 ease-out`,
  vía IntersectionObserver (ya existe `.scroll-reveal` / `.d-fade-up` en el CSS).
- Stagger en listas: 60ms entre items.
- Contador animado SOLO en la calculadora (número que sube al cambiar el slider).
- PROHIBIDO en mobile: parallax, slide-in lateral, loops infinitos, autoplay.
- Animar solo `transform`/`opacity`. Nunca box-shadow/width/height.

---

## Checklist por sección (antes de declararla lista)
```
[ ] S1 — arranca con índice numérico mono izquierda (no eyebrow centrado)
[ ] S2 — título + cuerpo a la izquierda (salvo CTA final)
[ ] S3 — usa un tamaño de la escala, no un número arbitrario
[ ] S4 — su padding vertical corresponde a su función (tabla S4)
[ ] S5 — su composición NO es el molde genérico repetido
[ ] S6 — cero scroll horizontal
[ ] S7 — si anima, es reveal simple GPU, sin parpadeo
```

## Lo que se ELIMINA (señales 2021 en la landing actual)
1. Eyebrow verde uppercase centrado → reemplazado por índice S1
2. Párrafo gris centrado de relleno → izquierda, máx 2 líneas, o se elimina
3. Cards con borde idéntico en toda sección → variación S5
4. `SECTION_PY` uniforme → ritmo variable S4
5. Títulos `text-3xl` (30px) → escala S3 (~36px+)
6. Separadores `separator-gradient` visibles entre todas → variación de fondo sutil
