-- =============================================================================
-- 0016 - Contenido, activaciones presenciales y embajadores
-- =============================================================================
--
-- Las herramientas 4 y 5 del plan. La 5 —datos de primera mano, segmentación
-- por valor y win-back— ya estaba casi entera: b2c_consumers guarda el perfil,
-- lib/rfm.ts clasifica por valor y lib/disparadores.ts reactiva. Lo único que
-- faltaba de la 5 no era una tabla sino un proceso, y va en código.
--
-- Esto es la herramienta 4, que no existía.
--
-- POR QUÉ NO SE REUSAN activations, pop_materials NI demonstrations
-- ----------------------------------------------------------------
-- Existen y están vacías, pero son del canal B2B: las tres cuelgan de
-- `account_id NOT NULL`, es decir, de un bar. Sirven para llevar el material POP
-- instalado en un local y las demostraciones al dueño.
--
-- Una activación B2C es otra cosa: un pop-up en un centro comercial no ocurre en
-- ningún bar, y forzar un account_id obligaría a inventarse cuentas falsas para
-- que la fila encaje. Se habría corrompido la tabla que sí usa el canal B2B
-- cuando se reactive.
--
-- LO QUE HACE MEDIBLE UNA ACTIVACIÓN
-- ----------------------------------
-- El enlace opcional a un código QR. Un pop-up con su propio QR deja de ser un
-- gasto que "salió bien" para convertirse en un número: cuánta gente escaneó,
-- cuántos pidieron y cuánto se facturó. Sin eso, decidir si repetir el evento es
-- una corazonada.
--
-- Y LOS EMBAJADORES
-- -----------------
-- Se miden solos gracias a `pedidos.referido_por`, que se añadió en la 0015: el
-- código del embajador viaja en el enlace que comparte, se guarda con el pedido
-- y cruzarlos es un JOIN. No hace falta ninguna tabla de métricas: una tabla de
-- totales acumulados se desincroniza con la realidad en cuanto se cancela un
-- pedido, y entonces nadie sabe cuál de las dos cifras es la buena.

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "contenido_tipo" AS ENUM ('guia', 'video', 'reto', 'storytelling', 'receta', 'ugc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "contenido_canal" AS ENUM ('instagram', 'tiktok', 'whatsapp', 'vip', 'web', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "contenido_estado" AS ENUM ('idea', 'produccion', 'listo', 'publicado', 'archivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "activacion_tipo" AS ENUM ('evento', 'popup', 'degustacion', 'feria', 'alianza');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "activacion_estado" AS ENUM ('planificada', 'confirmada', 'realizada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "embajador_estado" AS ENUM ('activo', 'pausado', 'retirado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Biblioteca de contenido sensorial
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "contenidos" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "titulo"          varchar(200) NOT NULL,
  "tipo"            "contenido_tipo" NOT NULL,
  "canal"           "contenido_canal" NOT NULL,
  -- Qué línea sensorial trabaja. Null = transversal a la marca.
  "linea_producto"  "moment_product_line",
  "estado"          "contenido_estado" NOT NULL DEFAULT 'idea',
  "gancho"          text,
  "notas"           text,
  -- Dónde vive la pieza: Drive, el reel publicado, el archivo. Solo el enlace:
  -- alojar vídeo en el CRM no aporta nada y complica las copias de seguridad.
  "url"             varchar(500),
  "publicado_en"    timestamp with time zone,
  -- Resultado real, tecleado a mano después de publicar. No se sincroniza con
  -- ninguna API: prometer métricas automáticas de Instagram obligaría a
  -- mantener una integración que se rompe cada vez que Meta cambia algo.
  "alcance"         integer,
  "interacciones"   integer,
  "creado_por"      uuid REFERENCES "staff_users"("id") ON DELETE SET NULL,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_contenidos_estado" ON "contenidos" ("estado");
CREATE INDEX IF NOT EXISTS "idx_contenidos_canal" ON "contenidos" ("canal");
CREATE INDEX IF NOT EXISTS "idx_contenidos_publicado" ON "contenidos" ("publicado_en");

-- -----------------------------------------------------------------------------
-- Activaciones presenciales B2C
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "activaciones" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre"             varchar(200) NOT NULL,
  "tipo"               "activacion_tipo" NOT NULL,
  "estado"             "activacion_estado" NOT NULL DEFAULT 'planificada',
  "lugar"              varchar(200) NOT NULL,
  "direccion"          varchar(255),
  "fecha"              timestamp with time zone NOT NULL,
  -- El bar, cuando la activación ocurre dentro de uno. Nullable a propósito: un
  -- pop-up en un centro comercial no tiene cuenta B2B asociada, y exigirla
  -- obligaría a inventarse una.
  "account_id"         uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  /*
    QR propio de la activación.

    Es lo que convierte el evento en algo medible: quien escanea ahí queda
    atribuido, y después se puede responder "cuántos de los que vinieron
    acabaron pidiendo". Sin esto, decidir si repetir un evento es una
    corazonada.
  */
  "qr_code_id"         uuid REFERENCES "qr_codes"("id") ON DELETE SET NULL,
  "aforo_estimado"     integer,
  "asistentes"         integer,
  -- Lo que de verdad importa: cuánta gente nueva entró a la base por aquí.
  "comensales_nuevos"  integer,
  "ventas_cop"         integer,
  "coste_cop"          integer,
  "notas"              text,
  "creado_por"         uuid REFERENCES "staff_users"("id") ON DELETE SET NULL,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_activaciones_fecha" ON "activaciones" ("fecha");
CREATE INDEX IF NOT EXISTS "idx_activaciones_estado" ON "activaciones" ("estado");

-- -----------------------------------------------------------------------------
-- Programa de embajadores
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "embajadores" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /*
    Un embajador ES un comensal. No es una tabla de personas aparte.

    Si fuera independiente habría dos fichas de la misma persona que se
    contradicen, y lo que se le premia —puntos, canjes— vive en el comensal.
    UNIQUE porque nadie puede ser embajador dos veces.
  */
  "consumer_id"   uuid NOT NULL UNIQUE REFERENCES "b2c_consumers"("id") ON DELETE CASCADE,
  /** Cómo se le llama públicamente: @arepamica. */
  "alias"         varchar(80),
  /*
    El código que va en su enlace: bocazo.co/?ref=camilo

    Se cruza con `pedidos.referido_por` (migración 0015), así que las ventas que
    trae se calculan con un JOIN y no hay que llevar contadores. Un contador
    acumulado se desincroniza en cuanto se cancela un pedido, y entonces nadie
    sabe cuál de las dos cifras es la buena.
  */
  "codigo"        varchar(60) NOT NULL UNIQUE,
  "estado"        "embajador_estado" NOT NULL DEFAULT 'activo',
  /** Puntos que se le abonan por cada pedido traído. 0 = solo visibilidad. */
  "puntos_por_pedido" integer NOT NULL DEFAULT 0,
  "seguidores"    integer,
  "notas"         text,
  "alta"          timestamp with time zone DEFAULT now(),
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_embajadores_estado" ON "embajadores" ("estado");
CREATE INDEX IF NOT EXISTS "idx_embajadores_codigo" ON "embajadores" ("codigo");

-- Para cruzar ventas por embajador sin recorrer la tabla entera.
CREATE INDEX IF NOT EXISTS "idx_pedidos_referido_por"
  ON "pedidos" ("referido_por") WHERE "referido_por" IS NOT NULL;
