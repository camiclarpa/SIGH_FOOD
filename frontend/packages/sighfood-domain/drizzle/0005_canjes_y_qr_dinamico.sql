CREATE TYPE "public"."estado_canje" AS ENUM('pendiente', 'canjeado', 'caducado', 'anulado');--> statement-breakpoint
CREATE TYPE "public"."tipo_premio" AS ENUM('producto', 'descuento', 'experiencia', 'acceso_vip');--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" uuid NOT NULL,
	"reward_id" uuid NOT NULL,
	"codigo" varchar(12) NOT NULL,
	"puntos_gastados" integer NOT NULL,
	"estado" "estado_canje" DEFAULT 'pendiente' NOT NULL,
	"account_id" uuid,
	"canjeado_por" uuid,
	"canjeado_en" timestamp with time zone,
	"expira_en" timestamp with time zone NOT NULL,
	"motivo_anulacion" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "redemptions_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"tipo" "tipo_premio" NOT NULL,
	"coste_puntos" integer NOT NULL,
	"stock" integer,
	"nivel_minimo" "membership_tier",
	"dias_validez" integer DEFAULT 30 NOT NULL,
	"imagen_url" varchar(500),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "destino_url" varchar(500);--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "campana" varchar(100);--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_canjeado_por_staff_users_id_fk" FOREIGN KEY ("canjeado_por") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_redemptions_consumer" ON "redemptions" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_redemptions_estado" ON "redemptions" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "idx_redemptions_codigo" ON "redemptions" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "idx_redemptions_expira" ON "redemptions" USING btree ("expira_en");--> statement-breakpoint
CREATE INDEX "idx_rewards_activo" ON "rewards" USING btree ("activo");--> statement-breakpoint
CREATE INDEX "idx_rewards_coste" ON "rewards" USING btree ("coste_puntos");