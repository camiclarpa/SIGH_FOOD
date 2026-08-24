-- =============================================================================
-- 0018 - Que una reseña sirva para algo
-- =============================================================================
--
-- POR QUÉ EL PANEL DECÍA "SIN ANALIZAR" Y "SIN DEFINIR"
-- ----------------------------------------------------
-- Dos causas distintas, ninguna de ellas un error de la IA:
--
--   1. `analizarResena()` existe y funciona, pero NADIE la llamaba. Solo era
--      alcanzable por una ruta manual que no invoca ninguna pantalla. Las
--      reseñas entraban y se quedaban ahí para siempre.
--
--   2. La línea sensorial nunca se rellenaba. Al guardar una reseña de un pedido
--      no se miraba qué se había comprado, así que `product_line` quedaba en
--      NULL y el panel lo mostraba como "Sin definir".
--
-- Las dos se arreglan en código. Esto añade lo que ese código necesita guardar.
--
-- LO QUE APORTA LA CATEGORÍA
-- --------------------------
-- Una nota de 2 estrellas no dice qué hacer. "Llegó frío" y "no me gusta el
-- picante" son la misma nota y problemas opuestos: el primero se arregla en
-- reparto y el segundo NO se arregla — es una preferencia, y tratarla como
-- fallo llevaría a suavizar un producto que a los demás les gusta así.
--
-- Separarlas es la diferencia entre un panel que informa y uno que se mira.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. La causa raíz, en cuatro etiquetas
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE categoria_resena AS ENUM (
    -- Algo salió mal en la cocina: poca salsa, quemado, crudo, falta un producto.
    'fallo_cocina',
    -- Salió bien y llegó mal: frío, derramado, tarde, empaque roto.
    'fallo_logistica',
    -- No es un fallo. "Demasiado picante para mí" es información de paladar, no
    -- una avería. Mezclarla con las otras dos falsea el control de calidad.
    'preferencia',
    -- Le gustó. Se etiqueta igual: saber QUÉ gusta vale tanto como saber qué no.
    'elogio'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "consumer_reviews"
  ADD COLUMN IF NOT EXISTS "categoria" categoria_resena;

-- -----------------------------------------------------------------------------
-- 2. Lo que marcó la persona, aparte de lo que escribió
-- -----------------------------------------------------------------------------
--
-- En una nota baja se le ofrecen motivos de un toque —temperatura, tiempo,
-- empaque, sabor— porque casi nadie escribe un texto en el móvil a medianoche.
-- Se guardan aparte del comentario: son datos, no prosa, y se pueden contar sin
-- pasar por la IA.

ALTER TABLE "consumer_reviews"
  ADD COLUMN IF NOT EXISTS "motivos" jsonb;

-- -----------------------------------------------------------------------------
-- 3. Cuándo se le pidió la opinión
-- -----------------------------------------------------------------------------
--
-- La reseña NO se pide en la pantalla de entrega: en ese momento la persona
-- acaba de recibir la bolsa y todavía no ha probado nada. Preguntar ahí da notas
-- sobre el reparto, no sobre la comida.
--
-- Se pide un rato después, cuando ya comió. Esta columna es lo que impide
-- pedirlo dos veces: sin ella, un cron que se ejecuta cada diez minutos
-- preguntaría cada diez minutos.

ALTER TABLE "pedidos"
  ADD COLUMN IF NOT EXISTS "resena_pedida_en" timestamptz;

-- Los pedidos ya entregados antes de que esto existiera se marcan como pedidos.
-- No es cierto —a nadie se le preguntó—, pero preguntarles ahora por una comida
-- de hace días es peor que no preguntar: la respuesta sería un recuerdo vago y
-- el mensaje, inoportuno.
UPDATE "pedidos"
   SET "resena_pedida_en" = now()
 WHERE "estado" = 'entregado' AND "resena_pedida_en" IS NULL;

-- El cron busca entregados sin reseña pedida. Sin índice recorrería la tabla
-- entera cada diez minutos.
CREATE INDEX IF NOT EXISTS "idx_pedidos_resena_pendiente"
  ON "pedidos" ("estado", "resena_pedida_en");

-- Y el clasificador busca reseñas sin analizar.
CREATE INDEX IF NOT EXISTS "idx_reviews_sin_analizar"
  ON "consumer_reviews" ("analizada_en");

COMMIT;
