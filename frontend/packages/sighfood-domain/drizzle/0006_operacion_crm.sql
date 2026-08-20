CREATE TYPE "public"."canal_consentimiento" AS ENUM('whatsapp', 'email', 'sms', 'push', 'datos');--> statement-breakpoint
CREATE TABLE "configuracion" (
	"clave" varchar(100) PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"descripcion" text,
	"actualizado_por" uuid,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mensajes_entrantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" uuid,
	"log_id" uuid,
	"canal" "automation_channel" NOT NULL,
	"remitente" varchar(100) NOT NULL,
	"texto" text NOT NULL,
	"atendido" boolean DEFAULT false NOT NULL,
	"atendido_por" uuid,
	"atendido_en" timestamp with time zone,
	"nota_interna" text,
	"recibido_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "data_consents" ADD COLUMN "canal" "canal_consentimiento";--> statement-breakpoint
ALTER TABLE "data_consents" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "data_consents" ADD COLUMN "revoked_by" varchar(150);--> statement-breakpoint
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_actualizado_por_staff_users_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes_entrantes" ADD CONSTRAINT "mensajes_entrantes_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes_entrantes" ADD CONSTRAINT "mensajes_entrantes_log_id_automation_logs_id_fk" FOREIGN KEY ("log_id") REFERENCES "public"."automation_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensajes_entrantes" ADD CONSTRAINT "mensajes_entrantes_atendido_por_staff_users_id_fk" FOREIGN KEY ("atendido_por") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_entrantes_consumer" ON "mensajes_entrantes" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_entrantes_atendido" ON "mensajes_entrantes" USING btree ("atendido");--> statement-breakpoint
CREATE INDEX "idx_entrantes_fecha" ON "mensajes_entrantes" USING btree ("recibido_en");--> statement-breakpoint
CREATE INDEX "idx_data_consents_vigente" ON "data_consents" USING btree ("consumer_id","revoked_at");