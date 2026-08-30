-- =============================================================================
-- 0020 - Momentos: de analítica pasiva a motor de consumo
-- =============================================================================
--
-- LO QUE MEDÍA ANTES Y POR QUÉ NO BASTABA
-- ---------------------------------------
-- Un momento era «alguien escaneó el QR de una mesa». Eso servía cuando el
-- único canal era el bar. Con producto empaquetado hay al menos tres contextos
-- distintos, y mezclarlos hace que ninguno se pueda leer:
--
--   · En un bar aliado, con una cerveza delante.
--   · En casa, de una bolsa comprada en la tienda.
--   · En un evento o activación.
--
-- Son consumos distintos, a horas distintas y con acompañamientos distintos.
-- Un pico a las seis de la tarde significa una cosa si es en bar y otra si es
-- en casa, y hasta ahora los dos caían en la misma barra.
--
-- LO QUE AÑADE
-- ------------
--   1. canal      — dónde se consumió.
--   2. maridaje   — con qué. Una pregunta de un toque tras escanear.
--   3. zona       — para ver en qué parte de la ciudad se activa la marca.
--   4. lote_id    — qué tanda se estaba comiendo, igual que en las reseñas.
--   5. compartido — si la persona lo enseñó a alguien.
--
-- SOBRE EL ANONIMATO
-- ------------------
-- `consumer_id` ya era opcional y se queda así. Es deliberado: quien escanea
-- una bolsa en su casa no tiene por qué registrarse para que el momento cuente.
-- Exigir cuenta antes de contar el escaneo destruiría justo la métrica que
-- interesa — cuántos de los que escanean acaban registrándose.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. El canal
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE canal_momento AS ENUM ('horeca', 'hogar', 'evento');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "sensory_moments"
  ADD COLUMN IF NOT EXISTS "canal" canal_momento;

-- Los momentos que ya existen vinieron TODOS del QR de una mesa: en su día no
-- había otra vía. Marcarlos como 'horeca' es lo cierto, no una suposición.
UPDATE "sensory_moments" SET "canal" = 'horeca' WHERE "canal" IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Con qué lo estaba tomando
-- -----------------------------------------------------------------------------
--
-- Una sola pregunta, de un toque, justo después de escanear. Es el único momento
-- en que la persona tiene el producto en la mano y sabe la respuesta.
--
-- Vale para dos cosas distintas: recomendar maridajes con fundamento en lugar de
-- por intuición, y entender el contexto de consumo — quien lo toma con café a
-- las cuatro de la tarde no es el mismo cliente que quien lo toma con cerveza a
-- las diez de la noche.

ALTER TABLE "sensory_moments"
  ADD COLUMN IF NOT EXISTS "maridaje" varchar(30);

-- -----------------------------------------------------------------------------
-- 3. Dónde
-- -----------------------------------------------------------------------------
--
-- Zona, no coordenadas. Para decidir dónde poner el siguiente punto de venta
-- basta con saber el barrio, y pedir la ubicación exacta del móvil a cambio de
-- eso es desproporcionado: cuesta un permiso que mucha gente niega y arrastra
-- una obligación de tratamiento de datos que no compensa.
--
-- En HORECA la zona sale del bar, que ya la tiene. En hogar, de la dirección de
-- envío del pedido si existe.

ALTER TABLE "sensory_moments"
  ADD COLUMN IF NOT EXISTS "zona" varchar(80);

-- -----------------------------------------------------------------------------
-- 4. Qué tanda
-- -----------------------------------------------------------------------------
--
-- La misma trazabilidad que las reseñas. Con esto, una tanda mala se puede
-- detectar por los escaneos aunque nadie llegue a dejar reseña.

ALTER TABLE "sensory_moments"
  ADD COLUMN IF NOT EXISTS "lote_id" uuid REFERENCES "lotes"("id") ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 5. Si lo enseñó
-- -----------------------------------------------------------------------------

ALTER TABLE "sensory_moments"
  ADD COLUMN IF NOT EXISTS "compartido" boolean NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- 6. Índices para las consultas del panel
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_momentos_canal" ON "sensory_moments" ("canal");
CREATE INDEX IF NOT EXISTS "idx_momentos_zona" ON "sensory_moments" ("zona");
CREATE INDEX IF NOT EXISTS "idx_momentos_lote" ON "sensory_moments" ("lote_id");

COMMIT;
