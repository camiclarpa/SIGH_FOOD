CREATE TYPE "public"."b2b_pipeline_stage" AS ENUM('lead_landing', 'lemon_test_pending', 'lemon_test_passed', 'consignation_active', 'recurring_client', 'saas_converted', 'churned');--> statement-breakpoint
CREATE TYPE "public"."moment_product_line" AS ENUM('flavor_switch', 'taste_shock', 'spicy_volcano', 'umami_boost', 'sweet_craft');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('pending', 'reconciled', 'invoiced', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'comercial', 'lectura');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"commercial_name" varchar(255),
	"zone" varchar(100) NOT NULL,
	"address" text NOT NULL,
	"decision_maker_name" varchar(150) NOT NULL,
	"decision_maker_role" varchar(100),
	"phone" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"pipeline_stage" "b2b_pipeline_stage" DEFAULT 'lead_landing',
	"current_consignation_stock" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "b2c_consumers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_phone" varchar(50) NOT NULL,
	"full_name" varchar(150),
	"email" varchar(255),
	"flavor_preference" jsonb DEFAULT '{}'::jsonb,
	"is_vip_whatsapp" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "b2c_consumers_whatsapp_phone_unique" UNIQUE("whatsapp_phone")
);
--> statement-breakpoint
CREATE TABLE "consignation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"units_delivered" integer NOT NULL,
	"units_sold" integer DEFAULT 0,
	"unit_price" numeric(10, 2) DEFAULT '21000.00',
	"settlement_status" "settlement_status" DEFAULT 'pending',
	"dispatched_at" timestamp with time zone DEFAULT now(),
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "data_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" uuid,
	"consent_type" varchar(50) NOT NULL,
	"ip_address" varchar(50),
	"user_agent" text,
	"granted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"table_number" varchar(50) NOT NULL,
	"qr_token" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "qr_codes_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "sensory_moments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"consumer_id" uuid,
	"product_line" "moment_product_line" NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now(),
	"device_info" jsonb
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "staff_role" DEFAULT 'lectura' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "staff_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "consignation_logs" ADD CONSTRAINT "consignation_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_consents" ADD CONSTRAINT "data_consents_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensory_moments" ADD CONSTRAINT "sensory_moments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensory_moments" ADD CONSTRAINT "sensory_moments_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_email" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_accounts_stage" ON "accounts" USING btree ("pipeline_stage");--> statement-breakpoint
CREATE INDEX "idx_b2c_whatsapp" ON "b2c_consumers" USING btree ("whatsapp_phone");--> statement-breakpoint
CREATE INDEX "idx_consignation_account" ON "consignation_logs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_consignation_status" ON "consignation_logs" USING btree ("settlement_status");--> statement-breakpoint
CREATE INDEX "idx_data_consents_consumer" ON "data_consents" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_qr_codes_account" ON "qr_codes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_qr_codes_token" ON "qr_codes" USING btree ("qr_token");--> statement-breakpoint
CREATE INDEX "idx_sensory_moments_account" ON "sensory_moments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_sensory_moments_consumer" ON "sensory_moments" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_sensory_moments_scanned" ON "sensory_moments" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "idx_staff_users_email" ON "staff_users" USING btree ("email");