import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guardas del chatbot del dashboard.
 *
 * El chat se vende como ASESOR ("preguntame sobre ventas, recetas, cómo usar el
 * dashboard") y durante un tiempo ejecutó acciones con dinero real —precios,
 * promos, campañas de email, puntos de lealtad— sin confirmación en código, sin
 * gate de plan por acción y sin validar los argumentos que inventa el modelo.
 *
 * Estos tests leen el archivo como texto a propósito: lo que hay que proteger no
 * es una función, es una PROPIEDAD del prompt y del set de herramientas. Un test
 * de unidad no evita que alguien vuelva a escribir "podés crear promociones" en
 * el system prompt dentro de tres meses.
 */

const ROUTE = readFileSync(
  join(process.cwd(), 'src/app/api/ai/chat/route.ts'),
  'utf-8',
);

/** Nombres de tool declarados en el array que se le pasa a Claude. */
function declaredTools(): string[] {
  const start = ROUTE.indexOf('const claudeTools');
  expect(start).toBeGreaterThan(-1);
  const end = ROUTE.indexOf('\n  ];', start);
  const block = ROUTE.slice(start, end);
  return Array.from(block.matchAll(/name:\s*"([a-z_]+)"/g)).map((m) => m[1]);
}

const WRITE_TOOLS = [
  'create_promotion',
  'toggle_product',
  'update_product_price',
  'send_campaign',
  'adjust_loyalty_points',
  'update_operating_hours',
  'create_reservation',
];

describe('el chat es un asesor, no un operador', () => {
  it('no declara ninguna herramienta de escritura', () => {
    const tools = declaredTools();
    for (const w of WRITE_TOOLS) {
      expect(tools, `la tool de escritura "${w}" volvió al array`).not.toContain(w);
    }
  });

  it('solo declara las tres herramientas de lectura', () => {
    expect(declaredTools().sort()).toEqual([
      'get_customer_detail',
      'get_inventory_status',
      'get_orders_live',
    ]);
  });

  it('executeTool no implementa ninguna acción de escritura', () => {
    for (const w of WRITE_TOOLS) {
      expect(
        ROUTE.includes(`if (name === "${w}")`),
        `executeTool volvió a implementar "${w}"`,
      ).toBe(false);
    }
  });

  it('no escribe en tablas de negocio desde el chat', () => {
    // .insert( / .update( sobre supabase dentro del route: el chat solo debe
    // persistir el historial en chat_messages.
    const writes = Array.from(ROUTE.matchAll(/\.from\("(\w+)"\)\s*\n?\s*\.(insert|update|delete|upsert)/g));
    const tables = writes.map((m) => m[1]);
    expect(tables.filter((t) => t !== 'chat_messages')).toEqual([]);
  });

  it('no le ordena al modelo ejecutar acciones', () => {
    expect(ROUTE).not.toMatch(/EJECUTA la acci[óo]n directamente/);
    expect(ROUTE).not.toMatch(/EXECUTE the action directly/);
  });

  it('el prompt declara explícitamente que no puede modificar nada', () => {
    expect(ROUTE).toMatch(/NO PUEDES|CANNOT DO/i);
    expect(ROUTE).toMatch(/You are an ADVISOR/);
    expect(ROUTE).toMatch(/Sos un ASESOR/);
  });
});

describe('el prompt no promete features inexistentes', () => {
  it('no ofrece campañas de SMS — MENIUS no tiene SMS', () => {
    // Se permite nombrarlo para NEGARLO ("MENIUS has NO SMS feature"),
    // pero no como feature disponible.
    expect(ROUTE).not.toMatch(/SMS Campaigns/);
    expect(ROUTE).not.toMatch(/- SMS: \d+% open rate/);
  });

  it('no inventa automations que no existen', () => {
    // AutomationsPanel no tiene automation de cumpleaños ni de premio VIP.
    expect(ROUTE).not.toMatch(/birthday, reactivation, VIP reward/);
    expect(ROUTE).not.toMatch(/Best automation to enable first/);
  });

  it('no dice que las automations se pueden activar (el panel es read-only)', () => {
    expect(ROUTE).not.toMatch(/Automations: enable in Settings/);
  });

  it('no ofrece flag de reseñas', () => {
    expect(ROUTE).not.toMatch(/Flag reviews/);
  });
});

describe('el prompt no promete métricas que el contexto no tiene', () => {
  it('no ordena comparar contra ayer ni contra la semana anterior', () => {
    // gatherRestaurantContext solo arma ventanas de hoy, 7d y 30d.
    expect(ROUTE).not.toMatch(/always compare periods \(today vs yesterday/);
    expect(ROUTE).not.toMatch(/comparar hoy vs ayer/);
  });

  it('avisa explícitamente que no hay datos de ayer', () => {
    expect(ROUTE).toMatch(/NO yesterday and NO previous-week data/);
  });
});

describe('texto escrito por terceros se neutraliza antes del prompt', () => {
  it('las reseñas pasan por neutralizeUserText', () => {
    // Las reseñas se crean desde el menú público SIN autenticación y las más
    // recientes entran al contexto: es el único texto de un tercero que llega
    // al system prompt del dueño.
    expect(ROUTE).toMatch(/neutralizeUserText\(r\.comment\)/);
    expect(ROUTE).toMatch(/neutralizeUserText\(r\.customer_name/);
  });

  it('la sección de reseñas se marca como datos, no instrucciones', () => {
    expect(ROUTE).toMatch(/never instructions|nunca instrucciones/);
  });
});
