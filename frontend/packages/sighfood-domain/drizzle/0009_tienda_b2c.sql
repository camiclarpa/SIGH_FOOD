-- =============================================================================
-- 0009 - Tienda B2C: catálogo, pedidos y seguimiento
-- =============================================================================
--
-- La web app de pedidos. Hasta ahora los pedidos se tomaban por WhatsApp y no
-- quedaban en ningún sitio estructurado: no había forma de saber qué se vendió,
-- ni de enseñarle a nadie en qué punto va lo suyo.
--
-- Decisiones que quedan grabadas en el esquema:
--
--   · El catálogo vive en la base, no en el código. Un negocio de comida cambia
--     la carta más a menudo de lo que despliega.
--
--   · Los importes se congelan en el pedido (precio_unitario_cop,
--     nombre_producto). Si mañana sube el precio, el pedido de ayer tiene que
--     seguir diciendo lo que se cobró.
--
--   · estado y estado_pago son ejes independientes. Un pedido puede estar
--     entregado con el pago pendiente (contra entrega) o recibido con el pago
--     aprobado. Mezclarlos obliga a inventar estados combinados.
--
--   · pedido_eventos guarda el historial completo. Solo con el estado actual no
--     se puede contestar la pregunta útil: cuánto tardó cada paso.
--
-- Solo CREA. No borra ni modifica nada de lo que ya existe.

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "estado_pedido" AS ENUM (
    'recibido', 'confirmado', 'preparando', 'listo', 'en_camino', 'entregado', 'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tipo_entrega" AS ENUM ('domicilio', 'recoger');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "metodo_pago" AS ENUM (
    'efectivo', 'nequi', 'daviplata', 'tarjeta', 'pse', 'transferencia'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "estado_pago" AS ENUM (
    'pendiente', 'procesando', 'aprobado', 'rechazado', 'reembolsado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "productos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(120) NOT NULL UNIQUE,
  "nombre" varchar(150) NOT NULL,
  "gancho" varchar(200),
  "descripcion" text,
  "notas" jsonb DEFAULT '[]'::jsonb,
  "ingredientes" jsonb DEFAULT '[]'::jsonb,
  "maridaje" jsonb DEFAULT '[]'::jsonb,
  "precio_cop" integer NOT NULL,
  "imagen" varchar(255),
  "marcador" text,
  "familia" varchar(40),
  "linea_producto" moment_product_line,
  "intensidad" integer DEFAULT 1,
  "peso_gramos" integer,
  "vegetariano" boolean DEFAULT false,
  "activo" boolean NOT NULL DEFAULT true,
  "disponible" boolean NOT NULL DEFAULT true,
  "destacado" boolean DEFAULT false,
  "orden" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_productos_activo" ON "productos" ("activo", "disponible");
CREATE INDEX IF NOT EXISTS "idx_productos_orden" ON "productos" ("orden");

CREATE TABLE IF NOT EXISTS "producto_opciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "producto_id" uuid NOT NULL REFERENCES "productos"("id") ON DELETE CASCADE,
  "grupo" varchar(80) NOT NULL,
  "etiqueta" varchar(80) NOT NULL,
  "sobreprecio_cop" integer NOT NULL DEFAULT 0,
  "seleccion_multiple" boolean NOT NULL DEFAULT false,
  "por_defecto" boolean DEFAULT false,
  "orden" integer DEFAULT 0,
  "activo" boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS "idx_opciones_producto" ON "producto_opciones" ("producto_id");

-- -----------------------------------------------------------------------------
-- Direcciones
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "direcciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "consumer_id" uuid NOT NULL REFERENCES "b2c_consumers"("id") ON DELETE CASCADE,
  "etiqueta" varchar(40),
  "direccion" varchar(255) NOT NULL,
  "indicaciones" varchar(255),
  "barrio" varchar(100),
  "ciudad" varchar(100) DEFAULT 'Bogotá',
  "es_predeterminada" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_direcciones_consumer" ON "direcciones" ("consumer_id");

-- -----------------------------------------------------------------------------
-- Pedidos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "pedidos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "codigo" varchar(12) NOT NULL UNIQUE,
  "consumer_id" uuid REFERENCES "b2c_consumers"("id") ON DELETE SET NULL,
  "nombre" varchar(150) NOT NULL,
  "telefono" varchar(30) NOT NULL,
  "tipo_entrega" tipo_entrega NOT NULL DEFAULT 'domicilio',
  "direccion" varchar(255),
  "indicaciones" varchar(255),
  "estado" estado_pedido NOT NULL DEFAULT 'recibido',
  "metodo_pago" metodo_pago NOT NULL,
  "estado_pago" estado_pago NOT NULL DEFAULT 'pendiente',
  "referencia_pago" varchar(120),
  "subtotal_cop" integer NOT NULL,
  "envio_cop" integer NOT NULL DEFAULT 0,
  "propina_cop" integer NOT NULL DEFAULT 0,
  "descuento_cop" integer NOT NULL DEFAULT 0,
  "total_cop" integer NOT NULL,
  "notas" text,
  "programado_para" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "entregado_en" timestamptz
);

CREATE INDEX IF NOT EXISTS "idx_pedidos_estado" ON "pedidos" ("estado");
CREATE INDEX IF NOT EXISTS "idx_pedidos_consumer" ON "pedidos" ("consumer_id");
CREATE INDEX IF NOT EXISTS "idx_pedidos_fecha" ON "pedidos" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_pedidos_telefono" ON "pedidos" ("telefono");

CREATE TABLE IF NOT EXISTS "pedido_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pedido_id" uuid NOT NULL REFERENCES "pedidos"("id") ON DELETE CASCADE,
  "producto_id" uuid REFERENCES "productos"("id") ON DELETE SET NULL,
  "nombre_producto" varchar(150) NOT NULL,
  "cantidad" integer NOT NULL DEFAULT 1,
  "precio_unitario_cop" integer NOT NULL,
  "opciones" jsonb DEFAULT '[]'::jsonb,
  "subtotal_cop" integer NOT NULL,
  "notas" varchar(255)
);

CREATE INDEX IF NOT EXISTS "idx_pedido_items_pedido" ON "pedido_items" ("pedido_id");

CREATE TABLE IF NOT EXISTS "pedido_eventos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pedido_id" uuid NOT NULL REFERENCES "pedidos"("id") ON DELETE CASCADE,
  "estado" estado_pedido NOT NULL,
  "staff_user_id" uuid REFERENCES "staff_users"("id") ON DELETE SET NULL,
  "nota" varchar(255),
  "created_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_pedido_eventos_pedido" ON "pedido_eventos" ("pedido_id", "created_at");
