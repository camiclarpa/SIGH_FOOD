-- =============================================================================
-- 0019 - Trazabilidad por lote y atributos de calidad
-- =============================================================================
--
-- LO QUE FALTABA PARA QUE UNA RESEÑA SIRVA EN PRODUCCIÓN
-- ------------------------------------------------------
-- Hasta ahora una reseña decía QUÉ pasó pero no A QUÉ tanda le pasó. Con eso se
-- puede atender a un cliente, pero no se puede arreglar la causa: si tres
-- personas dicen "perdió la crocancia" y no se sabe si comieron del mismo lote,
-- no hay forma de distinguir un fallo de una tanda concreta —sellado flojo, más
-- humedad -de un problema de la receta.
--
-- Esa distinción es la diferencia entre retirar una tanda y cambiar un producto
-- que funciona.
--
-- LOS ATRIBUTOS, Y POR QUÉ SE PREGUNTAN POR SEPARADO
-- --------------------------------------------------
-- Una nota global de 3 estrellas no dice nada al equipo de producción. Las
-- mismas 3 estrellas pueden ser "está buenísimo pero llegó blando" o "crujiente
-- pero soso", y se arreglan en sitios distintos.
--
-- Se puntúan cuatro cosas que cualquiera puede juzgar sin ser catador:
-- crocancia, sabor, empaque y frescura. Son las que un snack empaquetado puede
-- fallar, y cada una apunta a un responsable distinto.
--
-- LA REGLA DEL 2%, Y POR QUÉ NO SE APLICA TAL CUAL
-- ------------------------------------------------
-- "Alertar si un lote supera el 2% de reseñas negativas" es la regla correcta
-- con volumen. Con cinco reseñas no lo es: una sola queja da el 20% y dispararía
-- una alerta por cada cliente descontento.
--
-- El umbral vive en el código, no aquí, y combina las dos cosas: un porcentaje
-- cuando hay muestra suficiente, y un número absoluto de quejas cuando no la
-- hay. Tres personas distintas quejándose del mismo lote es señal aunque solo
-- haya cinco reseñas.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Los lotes
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- El código impreso en la bolsa. Es lo que la persona teclea o escanea, así
  -- que se guarda en MAYÚSCULAS y sin espacios: quien lo copia de un empaque
  -- arrugado no acierta con el formato exacto.
  "codigo" varchar(40) NOT NULL UNIQUE,

  -- A qué producto pertenece. Nulo si es una tanda mixta.
  "producto_id" uuid REFERENCES "productos"("id") ON DELETE SET NULL,

  "producido_en" date NOT NULL,
  -- Cuándo deja de estar bueno. Permite distinguir "llegó viejo" de "salió mal".
  "vence_en" date,
  "unidades" integer,
  "notas" text,

  -- Una tanda retirada no se borra: su historial es justo lo que hay que poder
  -- consultar cuando se repita el problema.
  "retirado" boolean NOT NULL DEFAULT false,
  "retirado_en" timestamptz,
  "motivo_retiro" text,

  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_lotes_producido" ON "lotes" ("producido_en");
CREATE INDEX IF NOT EXISTS "idx_lotes_producto" ON "lotes" ("producto_id");

-- -----------------------------------------------------------------------------
-- 2. La reseña, atada a su lote
-- -----------------------------------------------------------------------------

ALTER TABLE "consumer_reviews"
  ADD COLUMN IF NOT EXISTS "lote_id" uuid REFERENCES "lotes"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_reviews_lote" ON "consumer_reviews" ("lote_id");

-- Puntuaciones de 1 a 5 por atributo: {crocancia, sabor, empaque, frescura}.
--
-- En jsonb y no en cuatro columnas porque la lista va a cambiar: un producto
-- horneado y uno frito no se juzgan igual, y añadir "untuosidad" el día que
-- exista no debería ser una migración.
ALTER TABLE "consumer_reviews"
  ADD COLUMN IF NOT EXISTS "atributos_calidad" jsonb;

-- -----------------------------------------------------------------------------
-- 3. La tercera categoría: lo que pide el cliente y todavía no existe
-- -----------------------------------------------------------------------------
--
-- "Me gustaría con picante medio" no es un elogio ni una queja: es una petición
-- de producto. Mezclarla con las quejas la entierra, y es la única categoría que
-- dice qué fabricar después.

DO $$ BEGIN
  ALTER TYPE categoria_resena ADD VALUE IF NOT EXISTS 'sugerencia';
EXCEPTION WHEN others THEN NULL;
END $$;

COMMIT;
