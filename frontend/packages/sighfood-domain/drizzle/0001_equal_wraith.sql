CREATE TYPE "public"."activation_type" AS ENUM('brand_ambassador', 'dj_event', 'tasting', 'promotional_night', 'launch_event');--> statement-breakpoint
CREATE TYPE "public"."agent_health_status" AS ENUM('healthy', 'degraded', 'critical', 'offline');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('active', 'maintenance', 'retired', 'lost');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('led_display', 'table_talker', 'menu_holder', 'qr_code_stand', 'promotional_material');--> statement-breakpoint
CREATE TYPE "public"."automation_channel" AS ENUM('email', 'whatsapp', 'sms', 'push');--> statement-breakpoint
CREATE TYPE "public"."automation_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger" AS ENUM('signup', 'first_purchase', 'abandoned_cart', 'birthday', 'inactive_30_days', 'churn_risk', 'referral_conversion');--> statement-breakpoint
CREATE TYPE "public"."autonomy_action" AS ENUM('detect_report', 'comment_pr', 'block_merge', 'create_fix_pr', 'modify_threshold', 'deprecate_pattern', 'escalate', 'rollback', 'modify_infrastructure');--> statement-breakpoint
CREATE TYPE "public"."autonomy_level" AS ENUM('prohibited', 'manual', 'assisted', 'supervised', 'autonomous');--> statement-breakpoint
CREATE TYPE "public"."churn_risk" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."combo_type" AS ENUM('product_drink', 'product_food', 'seasonal', 'promotional');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('draft', 'pending_signature', 'active', 'expired', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."cot_step" AS ENUM('similar_cases_search', 'context_comparison', 'affected_elements', 'business_impact', 'side_effects', 'false_positive_check');--> statement-breakpoint
CREATE TYPE "public"."coupon_discount_type" AS ENUM('percentage', 'fixed', 'free_shipping');--> statement-breakpoint
CREATE TYPE "public"."credit_score" AS ENUM('excellent', 'good', 'fair', 'poor', 'high_risk');--> statement-breakpoint
CREATE TYPE "public"."demonstration_status" AS ENUM('scheduled', 'completed', 'cancelled', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."embedding_model" AS ENUM('openai_text_3_small', 'openai_text_3_large', 'local_sentence_transformers', 'deepseek_embedding');--> statement-breakpoint
CREATE TYPE "public"."environment" AS ENUM('development', 'staging', 'production');--> statement-breakpoint
CREATE TYPE "public"."episode_outcome" AS ENUM('SUCCESS', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."forecast_period" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."kg_domain" AS ENUM('b2b_accounts', 'b2c_consumers', 'products', 'locations', 'staff', 'assets', 'transactions');--> statement-breakpoint
CREATE TYPE "public"."kg_relation_type" AS ENUM('consumes', 'located_in', 'owns', 'refers', 'influences', 'belongs_to', 'supplies', 'competes_with', 'derived_from');--> statement-breakpoint
CREATE TYPE "public"."lead_score" AS ENUM('cold', 'warm', 'hot', 'qualified');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('landing_page', 'digital_ads', 'field_prospecting', 'referral', 'social_media', 'event');--> statement-breakpoint
CREATE TYPE "public"."membership_tier" AS ENUM('bronze', 'silver', 'gold');--> statement-breakpoint
CREATE TYPE "public"."memory_layer" AS ENUM('episodic', 'semantic', 'procedural');--> statement-breakpoint
CREATE TYPE "public"."observability_metric_type" AS ENUM('histogram', 'counter', 'gauge', 'summary');--> statement-breakpoint
CREATE TYPE "public"."pattern_consolidation" AS ENUM('emerging', 'active', 'consolidated', 'deprecated', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet');--> statement-breakpoint
CREATE TYPE "public"."pop_condition" AS ENUM('excellent', 'good', 'damaged', 'missing');--> statement-breakpoint
CREATE TYPE "public"."pop_material_type" AS ENUM('table_talker', 'qr_code', 'menu_insert', 'banner', 'digital_display');--> statement-breakpoint
CREATE TYPE "public"."prediction_horizon" AS ENUM('7_days', '30_days', '90_days', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."procedure_status" AS ENUM('draft', 'validated', 'active', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'converted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sandbox_phase" AS ENUM('dry_run', 'staging', 'canary', 'production');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('pending', 'in_progress', 'completed', 'certified');--> statement-breakpoint
CREATE TYPE "public"."warranty_type" AS ENUM('product_defect', 'shipping_damage', 'expired_product', 'customer_complaint');--> statement-breakpoint
CREATE TYPE "public"."xai_evidence_type" AS ENUM('ast_node', 'metric_value', 'embedding_similarity', 'historical_pattern', 'business_rule', 'human_feedback');--> statement-breakpoint
CREATE TABLE "activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type" "activation_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"scheduled_date" timestamp with time zone NOT NULL,
	"completed_date" timestamp with time zone,
	"status" varchar(50) DEFAULT 'scheduled',
	"attendees_count" integer,
	"sales_generated" numeric(10, 2),
	"feedback" text,
	"photos" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_security_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"source_agent" varchar(100),
	"target_system" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" "autonomy_action" NOT NULL,
	"requested_by" uuid,
	"approval_data" jsonb,
	"status" varchar(50) DEFAULT 'pending',
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_reason" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type" "asset_type" NOT NULL,
	"serial_number" varchar(100),
	"status" "asset_status" DEFAULT 'active',
	"installed_date" timestamp with time zone,
	"last_maintenance_date" timestamp with time zone,
	"next_maintenance_date" timestamp with time zone,
	"location" varchar(255),
	"photos" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "assets_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "ast_analysis_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_type" varchar(100) NOT NULL,
	"target_module" varchar(100) NOT NULL,
	"target_entity_id" uuid,
	"structural_findings" jsonb,
	"complexity_score" numeric(5, 2),
	"executed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" uuid NOT NULL,
	"consumer_id" uuid,
	"account_id" uuid,
	"status" varchar(50) NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now(),
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "automation_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"trigger" "automation_trigger" NOT NULL,
	"channel" "automation_channel" NOT NULL,
	"status" "automation_status" DEFAULT 'draft',
	"template" text NOT NULL,
	"delay_hours" integer DEFAULT 0,
	"target_segment" varchar(100),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"churn_score" numeric(5, 2) DEFAULT '0.00',
	"last_activity" timestamp with time zone,
	"churned_at" timestamp with time zone,
	"lead_score" "lead_score" DEFAULT 'cold',
	"conversion_prob" numeric(5, 2) DEFAULT '0.00',
	"engagement_score" numeric(5, 2) DEFAULT '0.00',
	"avg_consumption_days" integer DEFAULT 30,
	"last_purchase_date" timestamp with time zone,
	"reorder_alert_threshold" integer DEFAULT 5
);
--> statement-breakpoint
CREATE TABLE "b2c_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" uuid,
	"account_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" "payment_method",
	"status" varchar(50) DEFAULT 'pending',
	"transaction_date" timestamp with time zone DEFAULT now(),
	"gateway_reference" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" varchar(100) NOT NULL,
	"campaign" varchar(255),
	"period" "forecast_period" NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"spend" numeric(12, 2) NOT NULL,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"revenue" numeric(12, 2) DEFAULT '0.00',
	"cac" numeric(10, 2),
	"roas" numeric(10, 2),
	"ltv" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "combos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "combo_type" NOT NULL,
	"description" text,
	"discount_percentage" numeric(5, 2),
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"total_sales" integer DEFAULT 0,
	"revenue" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"contract_type" varchar(100) NOT NULL,
	"status" "contract_status" DEFAULT 'draft',
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"terms" text NOT NULL,
	"signed_by_client" boolean DEFAULT false,
	"signed_by_company" boolean DEFAULT false,
	"client_signature_date" timestamp with time zone,
	"company_signature_date" timestamp with time zone,
	"document_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cot_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger_type" varchar(100) NOT NULL,
	"trigger_entity_id" uuid,
	"trigger_domain" "kg_domain",
	"step1_similar_cases" jsonb,
	"step2_context_comparison" jsonb,
	"step3_affected_elements" jsonb,
	"step4_business_impact" jsonb,
	"step5_side_effects" jsonb,
	"step6_fp_check" jsonb,
	"final_decision" varchar(100),
	"confidence_score" numeric(5, 2),
	"executed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_agent_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" varchar(100) NOT NULL,
	"health_status" "agent_health_status" DEFAULT 'healthy',
	"intelligence_score" numeric(5, 2),
	"drift_score" numeric(5, 4),
	"last_successful_run" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0,
	"fp_rate" numeric(5, 4),
	"acceptance_rate" numeric(5, 4),
	"checked_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_agent_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" varchar(150) NOT NULL,
	"metric_type" "observability_metric_type" NOT NULL,
	"metric_value" numeric(10, 4) NOT NULL,
	"labels" jsonb,
	"agent_name" varchar(100),
	"recorded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_autonomy_matrix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" "autonomy_action" NOT NULL,
	"domain" "kg_domain" NOT NULL,
	"environment" "environment" NOT NULL,
	"autonomy_level" "autonomy_level" NOT NULL,
	"approval_required" boolean DEFAULT false,
	"approval_timeout_minutes" integer DEFAULT 30,
	"required_approvals_count" integer DEFAULT 1,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_learning_episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" varchar(100) NOT NULL,
	"issue_type" varchar(100) NOT NULL,
	"problem_description" text NOT NULL,
	"problem_embedding" vector(1536),
	"solution_description" text,
	"solution_embedding" vector(1536),
	"resolution_time_hours" numeric(10, 2),
	"outcome" "episode_outcome" DEFAULT 'SUCCESS',
	"human_notes" text,
	"account_id" uuid,
	"consumer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_learning_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid,
	"feedback_type" varchar(50) NOT NULL,
	"rating" integer,
	"comments" text,
	"provided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_name" varchar(255) NOT NULL,
	"domain" "kg_domain" NOT NULL,
	"pattern_description" text NOT NULL,
	"issue_type" varchar(100),
	"episode_count" integer DEFAULT 0,
	"confidence_score" numeric(5, 2) DEFAULT '1.00',
	"consolidation" "pattern_consolidation" DEFAULT 'emerging',
	"decay_rate" numeric(5, 4) DEFAULT '0.05',
	"last_validated_at" timestamp with time zone,
	"applicable_modules" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedure_name" varchar(255) NOT NULL,
	"domain" "kg_domain" NOT NULL,
	"issue_type" varchar(100) NOT NULL,
	"steps" jsonb NOT NULL,
	"validation_count" integer DEFAULT 0,
	"success_rate" numeric(5, 2) DEFAULT '0.00',
	"status" "procedure_status" DEFAULT 'draft',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_weekly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_week" varchar(20) NOT NULL,
	"agent_name" varchar(100) NOT NULL,
	"detection_kpis" jsonb,
	"learning_kpis" jsonb,
	"prediction_kpis" jsonb,
	"agent_health" jsonb,
	"top_risky_modules" jsonb,
	"week_alerts" jsonb,
	"generated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "demonstrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"account_id" uuid,
	"scheduled_date" timestamp with time zone NOT NULL,
	"completed_date" timestamp with time zone,
	"status" "demonstration_status" DEFAULT 'scheduled',
	"products_tested" jsonb,
	"acceptance_rate" numeric(5, 2),
	"feedback" text,
	"conducted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "embedding_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "kg_domain" NOT NULL,
	"entity_id" uuid NOT NULL,
	"embedding" vector(1536),
	"model" "embedding_model" DEFAULT 'openai_text_3_small',
	"text_source" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forgetting_curve_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_id" uuid,
	"previous_confidence" numeric(5, 2),
	"new_confidence" numeric(5, 2),
	"previous_state" "pattern_consolidation",
	"new_state" "pattern_consolidation",
	"days_since_last_use" integer,
	"applied_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kg_crm_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"edge_type" "kg_relation_type" NOT NULL,
	"coupling_strength" numeric(5, 2) DEFAULT '0.50',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kg_crm_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "kg_domain" NOT NULL,
	"node_id" uuid NOT NULL,
	"node_name" varchar(255) NOT NULL,
	"centrality_score" numeric(5, 2) DEFAULT '0.00',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"contact_name" varchar(150) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(50) NOT NULL,
	"source" "lead_source" NOT NULL,
	"zone" varchar(100),
	"estimated_capacity" integer,
	"estimated_monthly_consumption" numeric(10, 2),
	"credit_score" "credit_score",
	"status" varchar(50) DEFAULT 'new',
	"assigned_to" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"converted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "multivariate_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_type" varchar(100) NOT NULL,
	"target_entity_id" uuid NOT NULL,
	"target_domain" "kg_domain" NOT NULL,
	"horizon" "prediction_horizon" NOT NULL,
	"predicted_value" numeric(10, 2),
	"confidence" numeric(5, 2),
	"factors" jsonb,
	"risk_score" numeric(5, 2),
	"actual_value" numeric(10, 2),
	"accuracy" numeric(5, 2),
	"predicted_at" timestamp with time zone DEFAULT now(),
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pop_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type" "pop_material_type" NOT NULL,
	"condition" "pop_condition" DEFAULT 'excellent',
	"location" varchar(255),
	"installed_date" timestamp with time zone,
	"last_audit_date" timestamp with time zone,
	"next_audit_date" timestamp with time zone,
	"photos" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" uuid NOT NULL,
	"recommended_product_line" varchar(50) NOT NULL,
	"confidence_score" numeric(5, 2) NOT NULL,
	"reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"converted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referred_id" uuid,
	"referral_code" varchar(50) NOT NULL,
	"status" "referral_status" DEFAULT 'pending',
	"reward_amount" numeric(10, 2) DEFAULT '0.00',
	"reward_type" varchar(50) DEFAULT 'points',
	"converted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "revenue_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"period" "forecast_period" NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"projected_revenue" numeric(12, 2) NOT NULL,
	"actual_revenue" numeric(12, 2),
	"pipeline_value" numeric(12, 2) DEFAULT '0.00',
	"close_probability" numeric(5, 2) DEFAULT '0.00',
	"confidence" numeric(5, 2) DEFAULT '0.00',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sandbox_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" "autonomy_action" NOT NULL,
	"target_domain" "kg_domain",
	"target_entity_id" uuid,
	"phase1_dry_run" jsonb,
	"phase2_staging" jsonb,
	"phase3_canary" jsonb,
	"phase4_production" jsonb,
	"current_phase" "sandbox_phase" DEFAULT 'dry_run',
	"authorized" boolean DEFAULT false,
	"final_decision" varchar(50),
	"executed_by" uuid,
	"executed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sell_through_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"week_end" timestamp with time zone NOT NULL,
	"units_delivered" integer NOT NULL,
	"units_sold" integer NOT NULL,
	"sell_through_rate" numeric(5, 2),
	"alert_triggered" boolean DEFAULT false,
	"alert_reason" varchar(255),
	"action_taken" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"consumer_id" uuid,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open',
	"batch_number" varchar(100),
	"created_at" timestamp with time zone DEFAULT now(),
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"staff_name" varchar(150) NOT NULL,
	"staff_role" varchar(50),
	"training_type" varchar(100) NOT NULL,
	"scheduled_date" timestamp with time zone NOT NULL,
	"completed_date" timestamp with time zone,
	"status" "training_status" DEFAULT 'pending',
	"score" integer,
	"certified_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waiter_incentives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"waiter_name" varchar(150) NOT NULL,
	"period" varchar(50) NOT NULL,
	"recommendations_count" integer DEFAULT 0,
	"sales_volume" numeric(10, 2) DEFAULT '0.00',
	"bonus_amount" numeric(10, 2) DEFAULT '0.00',
	"status" varchar(50) DEFAULT 'pending',
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type" "warranty_type" NOT NULL,
	"description" text NOT NULL,
	"reported_date" timestamp with time zone NOT NULL,
	"resolved_date" timestamp with time zone,
	"status" varchar(50) DEFAULT 'open',
	"units_affected" integer,
	"financial_impact" numeric(10, 2),
	"resolution" text,
	"reported_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "working_memory_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_type" varchar(50) NOT NULL,
	"agent_name" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"context_data" jsonb,
	"module_findings" jsonb,
	"cross_module_links" jsonb,
	"risk_by_module" jsonb,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"ttl_minutes" integer DEFAULT 120
);
--> statement-breakpoint
CREATE TABLE "xai_explanations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_type" varchar(100) NOT NULL,
	"decision_id" uuid,
	"evidence_type" "xai_evidence_type" NOT NULL,
	"evidence_data" jsonb,
	"confidence_score" numeric(5, 2),
	"business_impact_translation" text,
	"similar_cases_used" jsonb,
	"known_side_effects" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "sales_rep" varchar(150);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "churn_risk" "churn_risk" DEFAULT 'low';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "churn_score" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "last_activity" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "churned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "lead_score" "lead_score" DEFAULT 'cold';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "conversion_prob" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "engagement_score" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "avg_consumption_days" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "last_purchase_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "reorder_alert_threshold" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD COLUMN "points" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD COLUMN "cashback_balance" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD COLUMN "membership_tier" "membership_tier" DEFAULT 'bronze';--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD COLUMN "total_spent" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD COLUMN "ltv" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD COLUMN "cac" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD COLUMN "referral_code" varchar(50);--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD COLUMN "referred_by" uuid;--> statement-breakpoint
ALTER TABLE "consignation_logs" ADD COLUMN "batch_number" varchar(100);--> statement-breakpoint
ALTER TABLE "consignation_logs" ADD COLUMN "expiry_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activations" ADD CONSTRAINT "activations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activations" ADD CONSTRAINT "activations_created_by_staff_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_staff_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approved_by_staff_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_sequence_id_automation_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."automation_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2c_transactions" ADD CONSTRAINT "b2c_transactions_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2c_transactions" ADD CONSTRAINT "b2c_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combos" ADD CONSTRAINT "combos_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_learning_episodes" ADD CONSTRAINT "crm_learning_episodes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_learning_episodes" ADD CONSTRAINT "crm_learning_episodes_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_learning_feedback" ADD CONSTRAINT "crm_learning_feedback_episode_id_crm_learning_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."crm_learning_episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_learning_feedback" ADD CONSTRAINT "crm_learning_feedback_provided_by_staff_users_id_fk" FOREIGN KEY ("provided_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_procedures" ADD CONSTRAINT "crm_procedures_created_by_staff_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demonstrations" ADD CONSTRAINT "demonstrations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demonstrations" ADD CONSTRAINT "demonstrations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demonstrations" ADD CONSTRAINT "demonstrations_conducted_by_staff_users_id_fk" FOREIGN KEY ("conducted_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forgetting_curve_log" ADD CONSTRAINT "forgetting_curve_log_pattern_id_crm_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."crm_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_crm_edges" ADD CONSTRAINT "kg_crm_edges_source_node_id_kg_crm_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."kg_crm_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_crm_edges" ADD CONSTRAINT "kg_crm_edges_target_node_id_kg_crm_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."kg_crm_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_staff_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pop_materials" ADD CONSTRAINT "pop_materials_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_b2c_consumers_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_b2c_consumers_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_forecasts" ADD CONSTRAINT "revenue_forecasts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_executions" ADD CONSTRAINT "sandbox_executions_executed_by_staff_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sell_through_records" ADD CONSTRAINT "sell_through_records_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sell_through_records" ADD CONSTRAINT "sell_through_records_recorded_by_staff_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_consumer_id_b2c_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."b2c_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_certified_by_staff_users_id_fk" FOREIGN KEY ("certified_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiter_incentives" ADD CONSTRAINT "waiter_incentives_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_reported_by_staff_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activations_account" ON "activations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_activations_type" ON "activations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_activations_date" ON "activations" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_security_event" ON "agent_security_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_security_severity" ON "agent_security_log" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_approval_status" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_approval_expires" ON "approval_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_assets_account" ON "assets" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_assets_type" ON "assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_assets_status" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ast_type" ON "ast_analysis_results" USING btree ("analysis_type");--> statement-breakpoint
CREATE INDEX "idx_ast_module" ON "ast_analysis_results" USING btree ("target_module");--> statement-breakpoint
CREATE INDEX "idx_automation_logs_sequence" ON "automation_logs" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "idx_automation_logs_consumer" ON "automation_logs" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_automation_trigger" ON "automation_sequences" USING btree ("trigger");--> statement-breakpoint
CREATE INDEX "idx_automation_status" ON "automation_sequences" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_b2c_transactions_consumer" ON "b2c_transactions" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_b2c_transactions_account" ON "b2c_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_b2c_transactions_status" ON "b2c_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_channel_metrics_channel" ON "channel_metrics" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_channel_metrics_period" ON "channel_metrics" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_combos_account" ON "combos" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_combos_type" ON "combos" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_contracts_account" ON "contracts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_status" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cot_trigger" ON "cot_executions" USING btree ("trigger_type","trigger_domain");--> statement-breakpoint
CREATE INDEX "idx_cot_decision" ON "cot_executions" USING btree ("final_decision");--> statement-breakpoint
CREATE INDEX "idx_crm_health_agent" ON "crm_agent_health" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "idx_crm_health_status" ON "crm_agent_health" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "idx_crm_metrics_name" ON "crm_agent_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX "idx_crm_metrics_recorded" ON "crm_agent_metrics" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "idx_crm_metrics_agent" ON "crm_agent_metrics" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "idx_crm_autonomy_action" ON "crm_autonomy_matrix" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_crm_autonomy_domain" ON "crm_autonomy_matrix" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_crm_autonomy_env" ON "crm_autonomy_matrix" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "idx_crm_episodes_module" ON "crm_learning_episodes" USING btree ("module");--> statement-breakpoint
CREATE INDEX "idx_crm_episodes_account" ON "crm_learning_episodes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_crm_episodes_consumer" ON "crm_learning_episodes" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_crm_feedback_episode" ON "crm_learning_feedback" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "idx_crm_patterns_domain" ON "crm_patterns" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_crm_patterns_consolidation" ON "crm_patterns" USING btree ("consolidation");--> statement-breakpoint
CREATE INDEX "idx_crm_procedures_domain" ON "crm_procedures" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_crm_procedures_status" ON "crm_procedures" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_crm_reports_week" ON "crm_weekly_reports" USING btree ("report_week");--> statement-breakpoint
CREATE INDEX "idx_crm_reports_agent" ON "crm_weekly_reports" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "idx_demonstrations_lead" ON "demonstrations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_demonstrations_account" ON "demonstrations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_demonstrations_status" ON "demonstrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_embedding_entity" ON "embedding_index" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_embedding_model" ON "embedding_index" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_forgetting_pattern" ON "forgetting_curve_log" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "idx_forgetting_applied" ON "forgetting_curve_log" USING btree ("applied_at");--> statement-breakpoint
CREATE INDEX "idx_kg_crm_source" ON "kg_crm_edges" USING btree ("source_node_id");--> statement-breakpoint
CREATE INDEX "idx_kg_crm_target" ON "kg_crm_edges" USING btree ("target_node_id");--> statement-breakpoint
CREATE INDEX "idx_kg_crm_edge_type" ON "kg_crm_edges" USING btree ("edge_type");--> statement-breakpoint
CREATE INDEX "idx_kg_crm_type" ON "kg_crm_nodes" USING btree ("node_type");--> statement-breakpoint
CREATE INDEX "idx_kg_crm_node" ON "kg_crm_nodes" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "idx_leads_source" ON "leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_leads_assigned" ON "leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_mv_pred_type" ON "multivariate_predictions" USING btree ("prediction_type");--> statement-breakpoint
CREATE INDEX "idx_mv_pred_target" ON "multivariate_predictions" USING btree ("target_entity_id","target_domain");--> statement-breakpoint
CREATE INDEX "idx_mv_pred_horizon" ON "multivariate_predictions" USING btree ("horizon");--> statement-breakpoint
CREATE INDEX "idx_pop_account" ON "pop_materials" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_pop_type" ON "pop_materials" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_recommendations_consumer" ON "product_recommendations" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "idx_recommendations_product" ON "product_recommendations" USING btree ("recommended_product_line");--> statement-breakpoint
CREATE INDEX "idx_referrals_referrer" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "idx_referrals_code" ON "referrals" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "idx_referrals_status" ON "referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_forecasts_account" ON "revenue_forecasts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_forecasts_period" ON "revenue_forecasts" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_sandbox_action" ON "sandbox_executions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_sandbox_phase" ON "sandbox_executions" USING btree ("current_phase");--> statement-breakpoint
CREATE INDEX "idx_sell_through_account" ON "sell_through_records" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_sell_through_week" ON "sell_through_records" USING btree ("week_start");--> statement-breakpoint
CREATE INDEX "idx_tickets_account" ON "tickets" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_status" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_training_account" ON "training_sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_training_status" ON "training_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_incentives_account" ON "waiter_incentives" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_incentives_period" ON "waiter_incentives" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_warranties_account" ON "warranties" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_warranties_type" ON "warranties" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_warranties_status" ON "warranties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wm_cycles_agent" ON "working_memory_cycles" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "idx_wm_cycles_status" ON "working_memory_cycles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_xai_decision" ON "xai_explanations" USING btree ("decision_type","decision_id");--> statement-breakpoint
CREATE INDEX "idx_xai_evidence" ON "xai_explanations" USING btree ("evidence_type");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_assigned_to_staff_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD CONSTRAINT "b2c_consumers_referred_by_b2c_consumers_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."b2c_consumers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2c_consumers" ADD CONSTRAINT "b2c_consumers_referral_code_unique" UNIQUE("referral_code");