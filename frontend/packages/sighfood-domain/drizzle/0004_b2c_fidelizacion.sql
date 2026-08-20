-- =============================================================================
-- B2C: fidelizacion, segmentacion y voz del comensal
-- =============================================================================
--
-- Ocho tablas nuevas y tres niveles nuevos de membership_tier. Todo aditivo:
-- ninguna tabla existente pierde datos ni columnas.
--
-- Nota sobre lo que NO esta aqui: drizzle-kit propuso ademas repetir los
-- cambios de la 0003 (columnas vector a 1024 y el valor workers_ai_bge_m3),
-- porque aquella se escribio a mano y no dejo snapshot contra el que comparar.
-- Se han retirado: cambiar el tipo de una columna vector arrastra sus indices
-- HNSW, y ADD VALUE sobre una etiqueta que ya existe aborta la migracion.
-- La 0004 si deja snapshot, asi que la proxima generacion partira de la
-- realidad.

CREATE TYPE "public"."badge_criterio" AS ENUM('escaneos_totales', 'lineas_distintas', 'bares_distintos', 'escaneos_en_franja', 'racha_semanas', 'referidos_convertidos');--> statement-breakpoint
CREATE TYPE "public"."desafio_estado" AS ENUM('borrador', 'activo', 'pausado', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."motivo_puntos" AS ENUM('escaneo', 'insignia', 'desafio', 'referido', 'canje', 'ajuste_manual', 'caducidad');--> statement-breakpoint
CREATE TYPE "public"."segmento_tipo" AS ENUM('dinamico', 'manual');--> statement-breakpoint
CREATE TYPE "public"."sentimiento" AS ENUM('positivo', 'neutro', 'negativo');--> statement-breakpoint
ALTER TYPE "public"."membership_tier" ADD VALUE 'explorador';--> statement-breakpoint
ALTER TYPE "public"."membership_tier" ADD VALUE 'aficionado';--> statement-breakpoint
ALTER TYPE "public"."membership_tier" ADD VALUE 'catador_leyenda';--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(60) NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"descripcion" text NOT NULL,
	"icono" varchar(16) DEFAULT '*' NOT NULL,
	"criterio" "badge_criterio" NOT NULL,
	"umbral" integer NOT NULL,
	"parametro" varchar(100),
	"puntos_otorgados" integer DEFAULT 0 NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "badges_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "challenge_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"consumer_id" uuid NOT NULL,
	"account_id" uuid,
	"respuestas" jsonb NOT NULL,
	"acertadas" integer,
	"puntos_ganados" integer DEFAULT 0 NOT NULL,
	"segundos_respuesta" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(150) NOT NULL,
	"descripcion" text,
	"preguntas" jsonb NOT NULL,
	"estado" "desafio_estado" DEFAULT 'borrador' NOT NULL,
	"puntos_premio" integer DEFAULT 0 NOT NULL,
	"premio_descripcion" varchar(255),
	"linea_producto" "moment_product_line",
	"zona" varchar(100),
	"empieza_en" timestamp with time zone,
	"termina_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consumer_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"valor_al_desbloquear" integer,
	"desbloqueada_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consumer_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" uuid NOT NULL,
	"account_id" uuid,
	"moment_id" uuid,
	"product_line" "moment_product_line",
	"puntuacion" integer,
	"comentario" text,
	"sentimiento" "sentimiento",
	"puntuacion_sentimiento" numeric(5, 2),
	"atributos" jsonb,
	"alerta_calidad" boolean DEFAULT false NOT NULL,
	"analizada_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consumer_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" uuid NOT NULL,
	"segment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" uuid NOT NULL,
	"puntos" integer NOT NULL,
	"motivo" "motivo_puntos" NOT NULL,
	"referencia_id" uuid,
	"descripcion" varchar(255),
	"saldo_resultante" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"descripcion" text,
	"tipo" "segmento_tipo" DEFAULT 'dinamico' NOT NULL,
	"regla" jsonb,
	"color" varchar(20) DEFAULT 'slate',
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "segments_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
ALTER TABLE "challenge_responses" ADD CONSTRAINT "challenge_responses_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_responses" ADD CONSTRAINT "challenge_responses_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_responses" ADD CONSTRAINT "challenge_responses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_badges" ADD CONSTRAINT "consumer_badges_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_badges" ADD CONSTRAINT "consumer_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_reviews" ADD CONSTRAINT "consumer_reviews_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_reviews" ADD CONSTRAINT "consumer_reviews_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_reviews" ADD CONSTRAINT "consumer_reviews_moment_id_sensory_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."sensory_moments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_segments" ADD CONSTRAINT "consumer_segments_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_segments" ADD CONSTRAINT "consumer_segments_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_badges_criterio" ON "badges" USING btree ("criterio");--> statement-breakpoint
CREATE INDEX "idx_badges_activa" ON "badges" USING btree ("activa");--> statement-breakpoint
CREATE INDEX "idx_respuestas_challenge" ON "challenge_responses" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "idx_respuestas_consumer" ON "challenge_responses" USING btree ("consumer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_respuesta_challenge_consumer" ON "challenge_responses" USING btree ("challenge_id","consumer_id");--> statement-breakpoint
CREATE INDEX "idx_challenges_estado" ON "challenges" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "idx_challenges_ventana" ON "challenges" USING btree ("empieza_en","termina_en");--> statement-breakpoint
CREATE INDEX "idx_consumer_badges_consumer" ON "consumer_badges" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_consumer_badges_badge" ON "consumer_badges" USING btree ("badge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_consumer_badge" ON "consumer_badges" USING btree ("consumer_id","badge_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_consumer" ON "consumer_reviews" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_account" ON "consumer_reviews" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_sentimiento" ON "consumer_reviews" USING btree ("sentimiento");--> statement-breakpoint
CREATE INDEX "idx_reviews_alerta" ON "consumer_reviews" USING btree ("alerta_calidad");--> statement-breakpoint
CREATE INDEX "idx_reviews_fecha" ON "consumer_reviews" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_consumer_segment" ON "consumer_segments" USING btree ("consumer_id","segment_id");--> statement-breakpoint
CREATE INDEX "idx_consumer_segments_segment" ON "consumer_segments" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "idx_puntos_consumer" ON "point_transactions" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_puntos_motivo" ON "point_transactions" USING btree ("motivo");--> statement-breakpoint
CREATE INDEX "idx_puntos_fecha" ON "point_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_segments_activo" ON "segments" USING btree ("activo");