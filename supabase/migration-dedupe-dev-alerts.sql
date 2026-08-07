-- Limpieza de alertas duplicadas en dev_alerts — aplicada en prod 2026-08-07.
--
-- Contexto: los crons de monitoreo corren cada 10 minutos y hasta el Lote 5 de
-- AUDIT_R2 re-insertaban una fila por pasada mientras la condicion siguiera
-- vigente. Resultado medido en prod: 3.627 alertas en 28 horas, TODAS sin
-- resolver, 346 de ellas para una sola orden atascada desde abril. Con ese
-- ruido el dashboard de alertas no servia para nada.
--
-- El fix de codigo (createAlertOnce en src/lib/dev-tool/alerts.ts) evita que
-- se generen nuevas. Esto limpia el historico ya acumulado.
--
-- Conserva la instancia MAS RECIENTE de cada (type, title) y borra el resto:
-- no se pierde ninguna condicion, solo las repeticiones.
-- Resultado real: 3.606 filas borradas, quedaron 21 (una por condicion).

WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY type, title ORDER BY created_at DESC) AS rn
  FROM public.dev_alerts
  WHERE resolved_at IS NULL
)
DELETE FROM public.dev_alerts
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
