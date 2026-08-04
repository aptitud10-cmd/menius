# Plan de cambios de DATA — Buccaneer (NADA EJECUTADO AÚN)

Los dos problemas que ves NO son de código. El código ya hace lo correcto.
Son de cómo están cargados los modifiers en la base.

---

## LOTE A — "Add Cheese" en burgers que ya traen queso

### El problema
20 burgers tienen el grupo "Add Cheese" (single, opcional, 6 quesos a +$1.50).
Pero NO son todas iguales:

**12 YA TRAEN QUESO** (dice en la descripción) → "agregar queso +$1.50" es ambiguo:
| Producto | Queso que ya trae |
|---|---|
| Alpine Burger | Swiss |
| BBQ Burger | cheddar |
| Chili Cheeseburger | jack |
| Cowboy Burger | pepper jack |
| Mexican Burger | cheddar |
| Pizza Burger | mozzarella |
| Ranch Burger | cheddar |
| Reuben Pastrami Burger | Swiss |
| Roadhouse Burger | pepper jack |
| Bacon Cheeseburger | "cheese" |
| Cheeseburger | "your choice of cheese" |
| Swiss, Cheddar or Pepper Jack Cheeseburger | los tres en el nombre |

**8 NO TRAEN QUESO** → "Add Cheese +$1.50" está BIEN, no se toca:
Bacon Burger, Beef Burger, Mushroom Burger, Texas Burger,
Turkey Burger, Veggie Burger, Portobello Burger, Western Burger

### El cambio propuesto (solo para las 12)
Renombrar el grupo de "Add Cheese" a "Choice of Cheese",
pasar a REQUIRED, todas las opciones a $0.00,
y marcar `is_default` en el queso que ya trae.

Ejemplo Cowboy Burger:
```
Choice of Cheese  (single · OBLIGATORIO)
  Pepper Jack   +$0.00   ← is_default (es el que ya trae)
  American      +$0.00
  Cheddar       +$0.00
  Swiss         +$0.00
  Mozzarella    +$0.00
  Feta          +$0.00
```
El cliente ve que ELIGE cuál, no que AGREGA otro. Desaparece la ambigüedad.

### DECISIÓN QUE NECESITO
¿Cambiar el queso es gratis, o cobra?
- (a) Todas a $0.00 — cambiar es gratis
- (b) El que ya trae a $0.00, los otros a +$1.50 — cambiar cuesta
- (c) Otra cosa

También: ¿"Swiss, Cheddar or Pepper Jack Cheeseburger" se renombra a
"Cheeseburger"? Hoy la elección está en el nombre del producto.
OJO: ya existe un producto llamado "Cheeseburger" — habría que consolidar
o buscarle otro nombre.

---

## LOTE B — El Deluxe no deja cambiar las papas

### El problema
37 productos tienen el grupo "Style":
```
Regular                        +$0.00
Deluxe (w/ Fries & Coleslaw)   +$4.00
```
El Deluxe es una caja negra: trae French Fries y no se pueden cambiar.
NINGUNO de los 37 tiene el grupo "Choice of Side".

CONFIRMADO en DB: el Deluxe cuesta $4.00 en las 5 categorías
(7oz Burgers, 9oz Steak Burgers, Chicken Breast, Classic Meat,
Carving Board). Consistente. Las variantes legacy que decían $5.00
ya no se muestran (las mata la dedup) — ese conflicto está cerrado.

### El cambio propuesto
1. Renombrar la opción a "Deluxe (w/ Side & Coleslaw)" — sacar "Fries"
   del nombre porque ahora el side se elige.
2. Agregar el grupo "Choice of Side" a esos 37 productos:
```
Choice of Side  (single · OBLIGATORIO)
  French Fries        +$0.00   ← is_default
  Home Fries          +$0.00
  Baked Potato        +$0.00
  Mashed Potato       +$0.00
  Rice                +$0.00
  Salad               +$0.00
  Waffle Fries        +$2.00
  Sweet Potato Fries  +$2.00
  Onion Rings         +$2.00
```

Resultado:
| Cliente elige | Precio (Cowboy $15.95) |
|---|---|
| Regular | $15.95 |
| Deluxe + French Fries | $19.95 |
| Deluxe + Onion Rings | $21.95 |

### DECISIÓN QUE NECESITO
Los +$2.00 de Waffle Fries / Sweet Potato / Onion Rings:
- (a) Es el UPGRADE sobre las papas comunes → queda como está
- (b) Es el precio de carta del side → dentro del Deluxe sería doble cobro,
      hay que recalcular

### LIMITACIÓN CONOCIDA
MENIUS no tiene grupos condicionales. Si el cliente elige "Regular"
(sin deluxe), el grupo "Choice of Side" igual aparece y es obligatorio.
Le pide elegir un side que no va a recibir.

Dos salidas:
- (a) Dejarlo así por ahora (feo pero funciona, cobra bien)
- (b) Construir `depends_on_option_id` primero (~medio día de código)

---

## Cómo lo ejecutaría
- Un lote por vez, con tu OK explícito antes de cada uno
- SELECT de verificación antes y después
- Backup de las filas afectadas por si hay que revertir
- Son 409 productos de un cliente real en producción
