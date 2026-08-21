CREATE TYPE "public"."chat_direccion" AS ENUM('entrante', 'saliente');--> statement-breakpoint
CREATE TYPE "public"."chat_estado" AS ENUM('bot', 'humano', 'cerrada');--> statement-breakpoint
CREATE TYPE "public"."chat_estado_mensaje" AS ENUM('pendiente', 'enviado', 'entregado', 'leido', 'fallido');--> statement-breakpoint
CREATE TYPE "public"."chat_tipo" AS ENUM('texto', 'imagen', 'audio', 'video', 'documento', 'ubicacion', 'plantilla', 'otro');--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telefono" varchar(20) NOT NULL,
	"consumer_id" uuid,
	"nombre_perfil" varchar(150),
	"estado" "chat_estado" DEFAULT 'bot' NOT NULL,
	"asignado_a" uuid,
	"ventana_expira_en" timestamp with time zone,
	"ultimo_mensaje_en" timestamp with time zone,
	"sin_leer" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chat_conversations_telefono_unique" UNIQUE("telefono")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"wamid" varchar(200),
	"direccion" "chat_direccion" NOT NULL,
	"tipo" "chat_tipo" DEFAULT 'texto' NOT NULL,
	"texto" text,
	"media_id" varchar(200),
	"media_mime" varchar(100),
	"estado" "chat_estado_mensaje" DEFAULT 'pendiente' NOT NULL,
	"error_codigo" varchar(50),
	"error_mensaje" text,
	"plantilla" varchar(100),
	"enviado_por" uuid,
	"sequence_id" uuid,
	"timestamp_meta" timestamp with time zone,
	"entregado_en" timestamp with time zone,
	"leido_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_asignado_a_staff_users_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_enviado_por_staff_users_id_fk" FOREIGN KEY ("enviado_por") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sequence_id_automation_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."automation_sequences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_conv_telefono" ON "chat_conversations" USING btree ("telefono");--> statement-breakpoint
CREATE INDEX "idx_chat_conv_consumer" ON "chat_conversations" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_chat_conv_estado" ON "chat_conversations" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "idx_chat_conv_ultimo" ON "chat_conversations" USING btree ("ultimo_mensaje_en");--> statement-breakpoint
CREATE INDEX "idx_chat_msg_conv" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_chat_msg_fecha" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_msg_estado" ON "chat_messages" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chat_msg_wamid" ON "chat_messages" USING btree ("wamid");