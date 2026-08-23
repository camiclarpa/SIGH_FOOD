-- =============================================================================
-- 0017 - Web Push como canal propio, y la categoría de cada plantilla de Meta
-- =============================================================================
--
-- EL PROBLEMA QUE RESUELVE
-- ------------------------
-- Meta cobra las plantillas de categoría MARKETING. Sin tarjeta registrada las
-- rechaza con el error 131042, así que las cuatro secuencias del CRM
-- —bienvenida, encuesta post-consumo, reactivación, subida de nivel— no pueden
-- salir por WhatsApp aunque estén escritas y aprobadas.
--
-- La salida no es pagar: es dejar de usar el canal de otro para lo que no lo
-- necesita. Un aviso de "tu pedido va en camino" tiene que llegar sí o sí, y
-- para eso WhatsApp es insustituible — además de gratuito, porque es UTILIDAD.
-- Una encuesta de satisfacción o un "subiste de nivel" no tiene esa urgencia y
-- puede viajar por Web Push, que es nuestro y no cuesta nada por mensaje.
--
-- LO QUE AÑADE
-- ------------
--   1. push_suscripciones — dónde alcanzar a cada dispositivo.
--   2. automation_logs.canal — por dónde salió CADA mensaje, para poder medir.
--   3. automation_sequences.categoria_meta — copia local de cómo clasifica Meta
--      cada plantilla, que es lo que decide si se puede mandar gratis.
--
-- Todo aditivo: ninguna columna se borra ni se renombra, y las filas existentes
-- quedan con NULL en las nuevas. Un despliegue viejo sigue funcionando contra
-- este esquema, que es lo que permite aplicarlo antes de desplegar el código.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Tipos
-- -----------------------------------------------------------------------------

-- Por dónde salió DE VERDAD un mensaje.
--
-- No es lo mismo que automation_sequences.channel, que dice por dónde se quería
-- mandar. El canal real se decide en el momento: ventana de 24 h abierta ->
-- texto libre; si no, Web Push; y la plantilla como último recurso. Sin esta
-- columna no se puede saber cuánto se está ahorrando.
DO $$ BEGIN
  CREATE TYPE canal_envio AS ENUM ('push', 'whatsapp_texto', 'whatsapp_plantilla');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cómo clasifica Meta una plantilla. Determina si el envío es gratis o se cobra.
DO $$ BEGIN
  CREATE TYPE categoria_meta AS ENUM ('utilidad', 'marketing', 'autenticacion');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Suscripciones de Web Push
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "push_suscripciones" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "consumer_id" uuid NOT NULL REFERENCES "b2c_consumers"("id") ON DELETE CASCADE,

  -- La URL que el navegador nos da para alcanzar a ESTE dispositivo.
  --
  -- Única globalmente, no por comensal: alguien con móvil y portátil tiene dos
  -- suscripciones y hay que avisar a las dos. La unicidad es por endpoint porque
  -- el navegador reenvía la misma al recargar la web, y sin ella se acumularían
  -- duplicados que hacen sonar el mismo teléfono varias veces.
  "endpoint"    text NOT NULL UNIQUE,

  -- Claves del dispositivo, para cifrar el contenido según RFC 8291.
  "p256dh"      text NOT NULL,
  "auth"        text NOT NULL,

  "agente"      varchar(255),

  -- Una suscripción muerta se marca inactiva en lugar de borrarse: cuánta gente
  -- se da de baja es justo la señal de que los mensajes molestan, y borrar la
  -- fila esconde ese dato.
  "activa"      boolean NOT NULL DEFAULT true,
  "fallos"      integer NOT NULL DEFAULT 0,

  "ultima_entrega" timestamptz,
  "creada"         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_push_consumer" ON "push_suscripciones" ("consumer_id");

-- Todo envío filtra por activa; sin esto cada campaña recorre la tabla entera.
CREATE INDEX IF NOT EXISTS "idx_push_activa" ON "push_suscripciones" ("activa");

-- -----------------------------------------------------------------------------
-- 3. Por dónde salió cada mensaje
-- -----------------------------------------------------------------------------

ALTER TABLE "automation_logs"
  ADD COLUMN IF NOT EXISTS "canal" canal_envio;

-- Las filas anteriores a Web Push salieron todas por plantilla de WhatsApp: era
-- el único camino que existía. Rellenarlas evita que las métricas muestren un
-- hueco de "canal desconocido" que en realidad sí se sabe.
UPDATE "automation_logs"
   SET "canal" = 'whatsapp_plantilla'
 WHERE "canal" IS NULL;

-- -----------------------------------------------------------------------------
-- 4. La categoría de cada plantilla
-- -----------------------------------------------------------------------------

ALTER TABLE "automation_sequences"
  ADD COLUMN IF NOT EXISTS "categoria_meta" categoria_meta;

-- Se deja en NULL a propósito, sin adivinar.
--
-- La fuente de verdad es Meta, y marcar algo como 'utilidad' por su nombre sería
-- exactamente el error que esta migración intenta evitar: creer que un envío es
-- gratis y descubrirlo cuando falla. Lo rellena
-- scripts/sincronizar-categorias.mjs leyendo la Graph API.
--
-- Mientras esté en NULL, el código trata la secuencia como NO enviable por
-- plantilla y la manda por Web Push. Falla del lado seguro.

COMMIT;
