-- =============================================================================
-- 0010 - Fase 3 y 4: identidad liviana, fidelización, favoritos y medición
-- =============================================================================
--
-- Cierra el ciclo: hasta ahora la tienda vendía una vez. Esto la convierte en
-- algo a lo que se vuelve.
--
--   · sesiones_cliente  el teléfono ES la cuenta. Código por WhatsApp, sin
--                       contraseña ni registro. Códigos y tokens hasheados.
--   · favoritos         guardan la CONFIGURACIÓN, no solo el producto.
--   · eventos_embudo    medición propia, sin píxel de terceros.
--   · zonas_envio       el coste del domicilio sale de una tabla, no de una API
--                       de mapas que cobra por consulta y puede caerse en mitad
--                       de una compra.
--
-- Y dos columnas en tablas que ya existían:
--
--   · pedidos.puntos_otorgados       hace idempotente el premio por compra.
--   · consumer_reviews.pedido_id     permite reseñar un pedido, no solo un
--                                    escaneo en mesa.
--
-- Solo CREA y AÑADE. No borra ni modifica nada existente.

-- -----------------------------------------------------------------------------
-- Identidad
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "sesiones_cliente" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "telefono" varchar(30) NOT NULL,
  "consumer_id" uuid REFERENCES "b2c_consumers"("id") ON DELETE CASCADE,
  "codigo_hash" varchar(64),
  "codigo_expira_en" timestamptz,
  "intentos" integer NOT NULL DEFAULT 0,
  "token_hash" varchar(64),
  "expira_en" timestamptz,
  "verificado_en" timestamptz,
  "created_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_sesiones_telefono" ON "sesiones_cliente" ("telefono");
CREATE INDEX IF NOT EXISTS "idx_sesiones_token" ON "sesiones_cliente" ("token_hash");

-- -----------------------------------------------------------------------------
-- Favoritos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "favoritos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "consumer_id" uuid NOT NULL REFERENCES "b2c_consumers"("id") ON DELETE CASCADE,
  "producto_id" uuid NOT NULL REFERENCES "productos"("id") ON DELETE CASCADE,
  "opcion_ids" jsonb DEFAULT '[]'::jsonb,
  "etiqueta" varchar(60),
  "created_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_favoritos_consumer" ON "favoritos" ("consumer_id");

-- -----------------------------------------------------------------------------
-- Embudo
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "eventos_embudo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "evento" varchar(40) NOT NULL,
  "sesion_anonima" varchar(64) NOT NULL,
  "producto_id" uuid REFERENCES "productos"("id") ON DELETE SET NULL,
  "pedido_id" uuid REFERENCES "pedidos"("id") ON DELETE SET NULL,
  "valor_cop" integer,
  "created_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_embudo_evento" ON "eventos_embudo" ("evento", "created_at");
CREATE INDEX IF NOT EXISTS "idx_embudo_sesion" ON "eventos_embudo" ("sesion_anonima");

-- -----------------------------------------------------------------------------
-- Cobertura de envío
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "zonas_envio" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" varchar(100) NOT NULL UNIQUE,
  "costo_cop" integer NOT NULL,
  "minutos_estimados" varchar(20),
  "minimo_cop" integer NOT NULL DEFAULT 0,
  "alias" jsonb DEFAULT '[]'::jsonb,
  "activa" boolean NOT NULL DEFAULT true,
  "orden" integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "idx_zonas_activa" ON "zonas_envio" ("activa");

-- -----------------------------------------------------------------------------
-- Columnas nuevas
-- -----------------------------------------------------------------------------

ALTER TABLE "pedidos"
  ADD COLUMN IF NOT EXISTS "puntos_otorgados" integer;

ALTER TABLE "consumer_reviews"
  ADD COLUMN IF NOT EXISTS "pedido_id" uuid REFERENCES "pedidos"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_reviews_pedido" ON "consumer_reviews" ("pedido_id");
