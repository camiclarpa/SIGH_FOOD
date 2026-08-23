-- =============================================================================
-- 0015 - De dónde vino el pedido
-- =============================================================================
--
-- Hasta ahora el único origen que se guardaba era el QR de la mesa. Si alguien
-- llegaba desde Instagram, desde un enlace de un amigo o desde una campaña, esa
-- información se perdía en el momento en que se creaba el pedido.
--
-- Es el único dato de todo el plan que NO SE PUEDE RECUPERAR DESPUÉS. Un modelo
-- puede calcular la recencia de un cliente el año que viene con los pedidos que
-- ya existen; pero ningún modelo puede deducir que el pedido de hoy vino de un
-- reel si nadie lo escribió. Por eso se captura antes de tener con qué
-- analizarlo: el histórico solo se empieza a acumular una vez.
--
-- Se guarda el PRIMER toque de la visita, no el último. Quien llega por un reel
-- y luego vuelve escribiendo la dirección a mano fue traído por el reel; contar
-- ese pedido como "directo" premia al canal equivocado y termina apagando la
-- inversión que sí funcionaba.
--
-- Columnas y no un jsonb: esto se agrupa —cuánto vendió cada canal este mes— y
-- un GROUP BY sobre una clave de jsonb no usa índice.
--
-- Todas admiten NULL: un pedido sin origen conocido es normal (entrada directa),
-- y forzar un valor obligaría a inventarse una categoría.

ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "utm_source"   varchar(80);
ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "utm_medium"   varchar(80);
ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "utm_campaign" varchar(120);
--- Quién lo refirió: el `ref` del enlace que comparte un comensal.
ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "referido_por" varchar(120);

-- Para el informe de canales. Parcial: la inmensa mayoría de pedidos no tendrá
-- origen, y esas filas no aportan nada al índice.
CREATE INDEX IF NOT EXISTS "idx_pedidos_utm_source"
  ON "pedidos" ("utm_source") WHERE "utm_source" IS NOT NULL;

-- Y el mismo origen en los eventos del embudo, para poder comparar cuántos
-- LLEGARON por un canal contra cuántos COMPRARON. Sin esto solo se puede medir
-- la conversión del total, que esconde justo lo que hay que decidir: qué canal
-- trae gente que compra y cuál trae gente que solo mira.
ALTER TABLE "eventos_embudo" ADD COLUMN IF NOT EXISTS "utm_source" varchar(80);
