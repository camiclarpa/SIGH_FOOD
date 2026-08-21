// =============================================================================
// SIGH_FOOD - Database Schema (Drizzle ORM)
// Fase 2: Definición del esquema de base de datos
// =============================================================================

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
  vector,
  type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =============================================================================
// ENUMS
// -----------------------------------------------------------------------------
// Todos los pgEnum viven aqui, antes de cualquier pgTable. Varias tablas los
// referenciaban antes de su declaracion (TS2448) porque se habian ido anadiendo
// al final del archivo.
// =============================================================================

export const episodeOutcomeEnum = pgEnum('episode_outcome', ['SUCCESS', 'PARTIAL', 'FAILED']);
export const procedureStatusEnum = pgEnum('procedure_status', ['draft', 'validated', 'active', 'deprecated']);

export const b2bPipelineStageEnum = pgEnum('b2b_pipeline_stage', [
  'lead_landing',
  'lemon_test_pending',
  'lemon_test_passed',
  'consignation_active',
  'recurring_client',
  'saas_converted',
  'churned'
]);

export const momentProductLineEnum = pgEnum('moment_product_line', [
  'flavor_switch',
  'taste_shock',
  'spicy_volcano',
  'umami_boost',
  'sweet_craft'
]);

export const settlementStatusEnum = pgEnum('settlement_status', [
  'pending',
  'reconciled',
  'invoiced',
  'cancelled'
]);

export const staffRoleEnum = pgEnum('staff_role', [
  'admin',      // todo, incluida la gestión de usuarios
  'comercial',  // opera cuentas, consignación y QR
  'lectura',    // solo consulta de métricas
]);

export const churnRiskEnum = pgEnum('churn_risk', ['low', 'medium', 'high', 'critical']);

export const leadScoreEnum = pgEnum('lead_score', ['cold', 'warm', 'hot', 'qualified']);

export const automationTriggerEnum = pgEnum('automation_trigger', [
  'signup',
  'first_purchase',
  'abandoned_cart',
  'birthday',
  'inactive_30_days',
  'churn_risk',
  'referral_conversion'
]);

export const automationChannelEnum = pgEnum('automation_channel', ['email', 'whatsapp', 'sms', 'push']);

export const automationStatusEnum = pgEnum('automation_status', ['draft', 'active', 'paused', 'completed']);

export const referralStatusEnum = pgEnum('referral_status', ['pending', 'converted', 'expired', 'cancelled']);

export const couponDiscountTypeEnum = pgEnum('coupon_discount_type', ['percentage', 'fixed', 'free_shipping']);

export const forecastPeriodEnum = pgEnum('forecast_period', ['weekly', 'monthly', 'quarterly', 'yearly']);

export const leadSourceEnum = pgEnum('lead_source', [
  'landing_page',
  'digital_ads',
  'field_prospecting',
  'referral',
  'social_media',
  'event'
]);

export const creditScoreEnum = pgEnum('credit_score', [
  'excellent',
  'good',
  'fair',
  'poor',
  'high_risk'
]);

export const demonstrationStatusEnum = pgEnum('demonstration_status', [
  'scheduled',
  'completed',
  'cancelled',
  'rescheduled'
]);

export const assetTypeEnum = pgEnum('asset_type', [
  'led_display',
  'table_talker',
  'menu_holder',
  'qr_code_stand',
  'promotional_material'
]);

export const assetStatusEnum = pgEnum('asset_status', [
  'active',
  'maintenance',
  'retired',
  'lost'
]);

export const trainingStatusEnum = pgEnum('training_status', [
  'pending',
  'in_progress',
  'completed',
  'certified'
]);

export const contractStatusEnum = pgEnum('contract_status', [
  'draft',
  'pending_signature',
  'active',
  'expired',
  'terminated'
]);

export const popMaterialTypeEnum = pgEnum('pop_material_type', [
  'table_talker',
  'qr_code',
  'menu_insert',
  'banner',
  'digital_display'
]);

export const popConditionEnum = pgEnum('pop_condition', [
  'excellent',
  'good',
  'damaged',
  'missing'
]);

export const comboTypeEnum = pgEnum('combo_type', [
  'product_drink',
  'product_food',
  'seasonal',
  'promotional'
]);

export const activationTypeEnum = pgEnum('activation_type', [
  'brand_ambassador',
  'dj_event',
  'tasting',
  'promotional_night',
  'launch_event'
]);

export const warrantyTypeEnum = pgEnum('warranty_type', [
  'product_defect',
  'shipping_damage',
  'expired_product',
  'customer_complaint'
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'digital_wallet'
]);

export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'resolved', 'closed']);

/**
 * Nivel del comensal segun su actividad.
 *
 * Se conservan bronze/silver/gold porque ya hay filas con esos valores y un
 * enum de Postgres no permite renombrar etiquetas en uso sin reescribirlas.
 * Los tres nuevos son los del programa sensorial; `nivelDeComensal()` los
 * calcula a partir del numero de escaneos.
 */
export const membershipTierEnum = pgEnum('membership_tier', [
  'bronze',
  'silver',
  'gold',
  'explorador',
  'aficionado',
  'catador_leyenda'
]);

// =============================================================================
// B2C: gamificacion, segmentacion y voz del comensal
// =============================================================================

/** Como se gana una insignia. Determina contra que se evalua el umbral. */
export const badgeCriterioEnum = pgEnum('badge_criterio', [
  'escaneos_totales',      // n escaneos acumulados
  'lineas_distintas',      // n lineas de producto distintas probadas
  'bares_distintos',       // n bares distintos visitados
  'escaneos_en_franja',    // n escaneos dentro de una franja horaria
  'racha_semanas',         // n semanas consecutivas con actividad
  'referidos_convertidos'  // n referidos que llegaron a escanear
]);

/** Por que se movieron los puntos. Sin esto el saldo no es auditable. */
export const motivoPuntosEnum = pgEnum('motivo_puntos', [
  'escaneo',
  'insignia',
  'desafio',
  'referido',
  'canje',
  'ajuste_manual',
  'caducidad'
]);

export const desafioEstadoEnum = pgEnum('desafio_estado', ['borrador', 'activo', 'pausado', 'finalizado']);

/** Sentimiento detectado en una resena. */
export const sentimientoEnum = pgEnum('sentimiento', ['positivo', 'neutro', 'negativo']);

/** Que entrega el premio. Cambia como se valida al canjearlo. */
export const tipoPremioEnum = pgEnum('tipo_premio', [
  'producto',      // un bocazo, una entrada
  'descuento',     // % o importe sobre la cuenta
  'experiencia',   // maridaje, cata, acceso VIP
  'acceso_vip',    // lanzamientos, eventos
]);

export const estadoCanjeEnum = pgEnum('estado_canje', [
  'pendiente',   // emitido, aun no entregado en el local
  'canjeado',    // el personal lo marco como entregado
  'caducado',    // vencio sin usarse
  'anulado',     // revertido; los puntos vuelven al comensal
]);

/** Canal por el que se dio o revoco un consentimiento. */
export const canalConsentimientoEnum = pgEnum('canal_consentimiento', [
  'whatsapp',
  'email',
  'sms',
  'push',
  'datos',      // tratamiento general de datos personales
]);

/** Quien lleva la conversacion ahora mismo. */
export const chatEstadoEnum = pgEnum('chat_estado', [
  'bot',        // la atiende el agente
  'humano',     // un asesor la tomo
  'cerrada',
]);

export const chatDireccionEnum = pgEnum('chat_direccion', ['entrante', 'saliente']);

/** Ciclo de vida de un mensaje segun los webhooks de estado de Meta. */
export const chatEstadoMensajeEnum = pgEnum('chat_estado_mensaje', [
  'pendiente',   // aun no aceptado por Meta
  'enviado',     // sent
  'entregado',   // delivered
  'leido',       // read
  'fallido',     // failed
]);

export const chatTipoEnum = pgEnum('chat_tipo', [
  'texto',
  'imagen',
  'audio',
  'video',
  'documento',
  'ubicacion',
  'plantilla',
  'otro',
]);

/** Como se mantiene un segmento: a mano o por regla evaluada. */
export const segmentoTipoEnum = pgEnum('segmento_tipo', ['dinamico', 'manual']);

// El modelo que produjo cada vector se guarda en la fila: vectores de modelos
// distintos viven en espacios distintos y sus distancias no son comparables, asi
// que al cambiar de proveedor hay que saber que filas reindexar.
export const embeddingModelEnum = pgEnum('embedding_model', [
  'workers_ai_bge_m3',
  'openai_text_3_small',
  'openai_text_3_large',
  'local_sentence_transformers',
  'deepseek_embedding'
]);

export const memoryLayerEnum = pgEnum('memory_layer', [
  'episodic',
  'semantic',
  'procedural'
]);

export const patternConsolidationEnum = pgEnum('pattern_consolidation', [
  'emerging',
  'active',
  'consolidated',
  'deprecated',
  'archived'
]);

export const cotStepEnum = pgEnum('cot_step', [
  'similar_cases_search',
  'context_comparison',
  'affected_elements',
  'business_impact',
  'side_effects',
  'false_positive_check'
]);

export const predictionHorizonEnum = pgEnum('prediction_horizon', [
  '7_days',
  '30_days',
  '90_days',
  'quarterly',
  'yearly'
]);

export const kgDomainEnum = pgEnum('kg_domain', [
  'b2b_accounts',
  'b2c_consumers',
  'products',
  'locations',
  'staff',
  'assets',
  'transactions'
]);

export const sandboxPhaseEnum = pgEnum('sandbox_phase', [
  'dry_run',
  'staging',
  'canary',
  'production'
]);

// Tipos de arista del grafo de conocimiento del CRM (A9).
export const kgRelationTypeEnum = pgEnum('kg_relation_type', [
  'consumes',
  'located_in',
  'owns',
  'refers',
  'influences',
  'belongs_to',
  'supplies',
  'competes_with',
  'derived_from'
]);

// Entorno en el que aplica una fila de la matriz de autonomia (A12).
export const environmentEnum = pgEnum('environment', [
  'development',
  'staging',
  'production'
]);

// Cuanto puede hacer el agente por su cuenta antes de pedir aprobacion (A12).
// 'prohibited' existe porque autonomy-guard lo comprueba para bloquear la
// accion; sin el, esa comparacion nunca era cierta y la matriz no podia vetar
// nada.
export const autonomyLevelEnum = pgEnum('autonomy_level', [
  'prohibited',
  'manual',
  'assisted',
  'supervised',
  'autonomous'
]);

export const autonomyActionEnum = pgEnum('autonomy_action', [
  'detect_report',
  'comment_pr',
  'block_merge',
  'create_fix_pr',
  'modify_threshold',
  'deprecate_pattern',
  'escalate',
  'rollback',
  'modify_infrastructure'
]);

export const xaiEvidenceTypeEnum = pgEnum('xai_evidence_type', [
  'ast_node',
  'metric_value',
  'embedding_similarity',
  'historical_pattern',
  'business_rule',
  'human_feedback'
]);

export const observabilityMetricTypeEnum = pgEnum('observability_metric_type', [
  'histogram',
  'counter',
  'gauge',
  'summary'
]);

export const agentHealthStatusEnum = pgEnum('agent_health_status', [
  'healthy',
  'degraded',
  'critical',
  'offline'
]);


// =============================================================================
// NOTA SOBRE ÍNDICES
// =============================================================================
//
// Los índices se declaran aquí, no solo en la base. Estaban creados a mano en
// Neon pero ausentes del schema, así que cualquier entorno levantado desde este
// archivo —staging, recuperación ante desastre, un `drizzle-kit push` limpio—
// nacía sin uno solo y nadie lo notaba hasta que la aplicación iba lenta.
//
// Los nombres coinciden con los que ya existen en producción para que Drizzle
// los reconozca en lugar de intentar duplicarlos.
//
// Medido con 500.000 momentos sensoriales (el volumen de 1000 clientes):
//   · filtrar momentos por cuenta:      50 ms  ->  0,87 ms
//   · momentos de los últimos 7 días:  110 ms  ->  10,9 ms

// =============================================================================
// ENUMS
// =============================================================================




// =============================================================================
// 1. ACCOUNTS (Cuentas B2B - Restaurantes/Chefs)
// =============================================================================

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  commercialName: varchar('commercial_name', { length: 255 }),
  zone: varchar('zone', { length: 100 }).notNull(),
  address: text('address').notNull(),
  decisionMakerName: varchar('decision_maker_name', { length: 150 }).notNull(),
  decisionMakerRole: varchar('decision_maker_role', { length: 100 }),
  assignedTo: uuid('assigned_to').references(() => staffUsers.id),
  salesRep: varchar('sales_rep', { length: 150 }),
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  pipelineStage: b2bPipelineStageEnum('pipeline_stage').default('lead_landing'),
  currentConsignationStock: integer('current_consignation_stock').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  churnRisk: churnRiskEnum('churn_risk').default('low'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  churnScore: numeric('churn_score', { precision: 5, scale: 2 }).default('0.00'),
  lastActivity: timestamp('last_activity', { withTimezone: true }),
  churnedAt: timestamp('churned_at', { withTimezone: true }),
  leadScore: leadScoreEnum('lead_score').default('cold'),
  conversionProb: numeric('conversion_prob', { precision: 5, scale: 2 }).default('0.00'),
  engagementScore: numeric('engagement_score', { precision: 5, scale: 2 }).default('0.00'),
  avgConsumptionDays: integer('avg_consumption_days').default(30),
  lastPurchaseDate: timestamp('last_purchase_date', { withTimezone: true }),
  reorderAlertThreshold: integer('reorder_alert_threshold').default(5)
}, (t) => [
  index('idx_accounts_email').on(t.email),
  index('idx_accounts_stage').on(t.pipelineStage),
]);

// =============================================================================
// 2. B2C_CONSUMERS (Comensales - First-Party Data)
// =============================================================================

export const b2cConsumers = pgTable('b2c_consumers', {
  id: uuid('id').primaryKey().defaultRandom(),
  whatsappPhone: varchar('whatsapp_phone', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 150 }),
  email: varchar('email', { length: 255 }),
  // Mapa "línea de producto" -> nº de escaneos. Sin $type<> Drizzle lo infiere
  // como `{}` y cualquier indexado desde el código no compila.
  flavorPreference: jsonb('flavor_preference')
    .$type<Record<string, number>>()
    .default({}),
  isVipWhatsapp: boolean('is_vip_whatsapp').default(true),
  points: integer('points').default(0),
  cashbackBalance: numeric('cashback_balance', { precision: 10, scale: 2 }).default('0.00'),
  membershipTier: membershipTierEnum('membership_tier').default('bronze'),
  totalSpent: numeric('total_spent', { precision: 10, scale: 2 }).default('0.00'),
  ltv: numeric('ltv', { precision: 10, scale: 2 }).default('0.00'),
  cac: numeric('cac', { precision: 10, scale: 2 }).default('0.00'),
  referralCode: varchar('referral_code', { length: 50 }).unique(),
  // Autorreferencia: sin la anotacion `AnyPgColumn` TypeScript no puede inferir
  // el tipo de la tabla dentro de su propia definicion (TS7022/TS7024).
  referredBy: uuid('referred_by').references((): AnyPgColumn => b2cConsumers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (t) => [
  index('idx_b2c_whatsapp').on(t.whatsappPhone),
]);

// =============================================================================
// 3. SENSORY_MOMENTS (Momentos Sensoriales - North Star Metric)
// =============================================================================

export const sensoryMoments = pgTable('sensory_moments', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  productLine: momentProductLineEnum('product_line').notNull(),
  scannedAt: timestamp('scanned_at', { withTimezone: true }).defaultNow(),
  deviceInfo: jsonb('device_info').$type<{ userAgent?: string; platform?: string }>()
}, (t) => [
  index('idx_sensory_moments_account').on(t.accountId),
  index('idx_sensory_moments_consumer').on(t.consumerId),
  index('idx_sensory_moments_scanned').on(t.scannedAt),
]);

// =============================================================================
// 4. CONSIGNATION_LOGS (Control de Inventario en Consignación)
// =============================================================================

export const consignationLogs = pgTable('consignation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  unitsDelivered: integer('units_delivered').notNull(),
  unitsSold: integer('units_sold').default(0),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).default('21000.00'),
    batchNumber: varchar('batch_number', { length: 100 }),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
  settlementStatus: settlementStatusEnum('settlement_status').default('pending'),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }).defaultNow(),
  settledAt: timestamp('settled_at', { withTimezone: true })
}, (t) => [
  index('idx_consignation_account').on(t.accountId),
  index('idx_consignation_status').on(t.settlementStatus),
]);

// =============================================================================
// 5. QR_CODES (Gestión de Códigos QR por Mesa)
// =============================================================================

export const qrCodes = pgTable('qr_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  tableNumber: varchar('table_number', { length: 50 }).notNull(),
  qrToken: varchar('qr_token', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true),
  /**
   * A donde lleva el QR. NULL = flujo normal de escaneo.
   *
   * Existe para poder cambiar la campana de un adhesivo YA IMPRESO Y PEGADO en
   * una mesa. Sin esto, cambiar el destino obligaria a reimprimir y sustituir
   * fisicamente cada QR del local.
   */
  destinoUrl: varchar('destino_url', { length: 500 }),
  /** Campana asociada, para medir que trajo cada lote de adhesivos. */
  campana: varchar('campana', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (t) => [
  index('idx_qr_codes_account').on(t.accountId),
  index('idx_qr_codes_token').on(t.qrToken),
]);

// =============================================================================
// 6. DATA_CONSENTS (Auditoría de Consentimiento - Habeas Data)
// =============================================================================

export const dataConsents = pgTable('data_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  consentType: varchar('consent_type', { length: 50 }).notNull(),
  /**
   * Canal concreto al que aplica.
   *
   * Antes solo habia `consent_type` como texto libre, asi que no se podia
   * revocar el WhatsApp conservando el email: era todo o nada.
   */
  canal: canalConsentimientoEnum('canal'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow(),
  /**
   * Cuando se revoco. NULL = sigue vigente.
   *
   * Se marca en lugar de borrar la fila: hay que poder demostrar que hubo
   * consentimiento antes y cuando dejo de haberlo. Borrarlo destruiria la
   * prueba de ambas cosas.
   */
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  /** Quien lo revoco: el propio comensal o alguien del equipo. */
  revokedBy: varchar('revoked_by', { length: 150 }),
}, (t) => [
  index('idx_data_consents_consumer').on(t.consumerId),
  index('idx_data_consents_vigente').on(t.consumerId, t.revokedAt),
]);

// =============================================================================
// 7. STAFF_USERS (Usuarios internos del CRM)
// =============================================================================
//
// El CRM lo usa solo el equipo de SIGH_FOOD: los 1000 gastrobares son registros
// de `accounts`, no usuarios que inicien sesión. Por eso aquí no hay tenencia
// por cliente, solo roles internos.


export const staffUsers = pgTable('staff_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  /** PBKDF2-SHA256 en formato `iteraciones:salt:hash` (ver lib/password.ts). */
  passwordHash: text('password_hash').notNull(),
  role: staffRoleEnum('role').notNull().default('lectura'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_staff_users_email').on(t.email),
]);

// =============================================================================
// RELATIONS (Relaciones entre tablas)
// =============================================================================

export const accountsRelations = relations(accounts, ({ many }) => ({
  sensoryMoments: many(sensoryMoments),
  consignationLogs: many(consignationLogs),
  qrCodes: many(qrCodes)
}));

export const b2cConsumersRelations = relations(b2cConsumers, ({ many }) => ({
  sensoryMoments: many(sensoryMoments),
  dataConsents: many(dataConsents)
}));

export const sensoryMomentsRelations = relations(sensoryMoments, ({ one }) => ({
  account: one(accounts, {
    fields: [sensoryMoments.accountId],
    references: [accounts.id]
  }),
  consumer: one(b2cConsumers, {
    fields: [sensoryMoments.consumerId],
    references: [b2cConsumers.id]
  })
}));

export const consignationLogsRelations = relations(consignationLogs, ({ one }) => ({
  account: one(accounts, {
    fields: [consignationLogs.accountId],
    references: [accounts.id]
  })
}));

export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  account: one(accounts, {
    fields: [qrCodes.accountId],
    references: [accounts.id]
  })
}));

export const dataConsentsRelations = relations(dataConsents, ({ one }) => ({
  consumer: one(b2cConsumers, {
    fields: [dataConsents.consumerId],
    references: [b2cConsumers.id]
  })
}));

// =============================================================================
// TYPE EXPORTS (Tipos TypeScript inferidos del schema)
// =============================================================================

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type B2cConsumer = typeof b2cConsumers.$inferSelect;
export type NewB2cConsumer = typeof b2cConsumers.$inferInsert;

export type SensoryMoment = typeof sensoryMoments.$inferSelect;
export type NewSensoryMoment = typeof sensoryMoments.$inferInsert;

export type ConsignationLog = typeof consignationLogs.$inferSelect;
export type NewConsignationLog = typeof consignationLogs.$inferInsert;

export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;

export type DataConsent = typeof dataConsents.$inferSelect;
export type NewDataConsent = typeof dataConsents.$inferInsert;
// =============================================================================
// ENUMS FASE 3 - ANALITICA PREDICTIVA Y AUTOMATIZACION
// =============================================================================







// =============================================================================
// ENUMS MODULOS CRM FALTANTES
// =============================================================================













// =============================================================================
// 11. PRODUCT_RECOMMENDATIONS (Cross-Selling y Recomendaciones IA)
// =============================================================================

export const productRecommendations = pgTable('product_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').notNull().references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  recommendedProductLine: varchar('recommended_product_line', { length: 50 }).notNull(),
  confidenceScore: numeric('confidence_score', { precision: 5, scale: 2 }).notNull(),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
}, (t) => [
  index('idx_recommendations_consumer').on(t.consumerId),
  index('idx_recommendations_product').on(t.recommendedProductLine),
]);

// =============================================================================
// 12. AUTOMATION_SEQUENCES (Secuencias de Marketing Automatizado)
// =============================================================================

export const automationSequences = pgTable('automation_sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  trigger: automationTriggerEnum('trigger').notNull(),
  channel: automationChannelEnum('channel').notNull(),
  status: automationStatusEnum('status').default('draft'),
  template: text('template').notNull(),
  // Plantilla aprobada en Meta. `template` (arriba) es el texto del CRM con
  // {{nombre}}; esto es lo que Meta acepta de verdad fuera de la ventana de
  // 24 h, con huecos posicionales. `metaTemplateVars` lleva las claves del CRM
  // EN ORDEN, porque Meta numera los huecos ({{1}}, {{2}}…) en vez de nombrarlos.
  metaTemplateName: varchar('meta_template_name', { length: 255 }),
  metaTemplateLang: varchar('meta_template_lang', { length: 10 }),
  metaTemplateVars: jsonb('meta_template_vars').$type<string[]>(),
  delayHours: integer('delay_hours').default(0),
  targetSegment: varchar('target_segment', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  churnScore: numeric('churn_score', { precision: 5, scale: 2 }).default('0.00'),
  lastActivity: timestamp('last_activity', { withTimezone: true }),
  churnedAt: timestamp('churned_at', { withTimezone: true }),
  leadScore: leadScoreEnum('lead_score').default('cold'),
  conversionProb: numeric('conversion_prob', { precision: 5, scale: 2 }).default('0.00'),
  engagementScore: numeric('engagement_score', { precision: 5, scale: 2 }).default('0.00'),
  avgConsumptionDays: integer('avg_consumption_days').default(30),
  lastPurchaseDate: timestamp('last_purchase_date', { withTimezone: true }),
  reorderAlertThreshold: integer('reorder_alert_threshold').default(5),
}, (t) => [
  index('idx_automation_trigger').on(t.trigger),
  index('idx_automation_status').on(t.status),
]);

// =============================================================================
// 13. AUTOMATION_LOGS (Registro de Ejecuciones de Automatización)
// =============================================================================

export const automationLogs = pgTable('automation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sequenceId: uuid('sequence_id').notNull().references(() => automationSequences.id, { onDelete: 'cascade' }),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  clickedAt: timestamp('clicked_at', { withTimezone: true }),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  errorMessage: text('error_message'),
}, (t) => [
  index('idx_automation_logs_sequence').on(t.sequenceId),
  index('idx_automation_logs_consumer').on(t.consumerId),
]);

// =============================================================================
// 14. REFERRALS (Programa de Referidos B2C)
// =============================================================================

export const referrals = pgTable('referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerId: uuid('referrer_id').notNull().references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  referredId: uuid('referred_id').references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  referralCode: varchar('referral_code', { length: 50 }).notNull().unique(),
  status: referralStatusEnum('status').default('pending'),
  rewardAmount: numeric('reward_amount', { precision: 10, scale: 2 }).default('0.00'),
  rewardType: varchar('reward_type', { length: 50 }).default('points'),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_referrals_referrer').on(t.referrerId),
  index('idx_referrals_code').on(t.referralCode),
  index('idx_referrals_status').on(t.status),
]);

// =============================================================================
// 15. REVENUE_FORECASTS (Proyección de Ingresos)
// =============================================================================

export const revenueForecasts = pgTable('revenue_forecasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  period: forecastPeriodEnum('period').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  projectedRevenue: numeric('projected_revenue', { precision: 12, scale: 2 }).notNull(),
  actualRevenue: numeric('actual_revenue', { precision: 12, scale: 2 }),
  pipelineValue: numeric('pipeline_value', { precision: 12, scale: 2 }).default('0.00'),
  closeProbability: numeric('close_probability', { precision: 5, scale: 2 }).default('0.00'),
  confidence: numeric('confidence', { precision: 5, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_forecasts_account').on(t.accountId),
  index('idx_forecasts_period').on(t.period),
]);

// =============================================================================
// 16. CHANNEL_METRICS (Métricas por Canal de Adquisición - ROAS/CAC)
// =============================================================================

export const channelMetrics = pgTable('channel_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  channel: varchar('channel', { length: 100 }).notNull(),
  campaign: varchar('campaign', { length: 255 }),
  period: forecastPeriodEnum('period').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  spend: numeric('spend', { precision: 12, scale: 2 }).notNull(),
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  conversions: integer('conversions').default(0),
  revenue: numeric('revenue', { precision: 12, scale: 2 }).default('0.00'),
  cac: numeric('cac', { precision: 10, scale: 2 }),
  roas: numeric('roas', { precision: 10, scale: 2 }),
  ltv: numeric('ltv', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_channel_metrics_channel').on(t.channel),
  index('idx_channel_metrics_period').on(t.period),
]);

// =============================================================================

// =============================================================================
// 17. TICKETS (Gestión de Reclamos y Control de Calidad)
// =============================================================================

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: ticketStatusEnum('status').default('open'),
  batchNumber: varchar('batch_number', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => [
  index('idx_tickets_account').on(t.accountId),
  index('idx_tickets_status').on(t.status),
]);

// =============================================================================
// MODULO 1: B2B - LEADS Y DEMOSTRACIONES
// =============================================================================

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 150 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 50 }).notNull(),
  source: leadSourceEnum('source').notNull(),
  zone: varchar('zone', { length: 100 }),
  estimatedCapacity: integer('estimated_capacity'),
  estimatedMonthlyConsumption: numeric('estimated_monthly_consumption', { precision: 10, scale: 2 }),
  creditScore: creditScoreEnum('credit_score'),
  status: varchar('status', { length: 50 }).default('new'),
  assignedTo: uuid('assigned_to').references(() => staffUsers.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
}, (t) => [
  index('idx_leads_source').on(t.source),
  index('idx_leads_status').on(t.status),
  index('idx_leads_assigned').on(t.assignedTo),
]);

export const demonstrations = pgTable('demonstrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
  completedDate: timestamp('completed_date', { withTimezone: true }),
  status: demonstrationStatusEnum('status').default('scheduled'),
  productsTested: jsonb('products_tested').$type<string[]>(),
  acceptanceRate: numeric('acceptance_rate', { precision: 5, scale: 2 }),
  feedback: text('feedback'),
  conductedBy: uuid('conducted_by').references(() => staffUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_demonstrations_lead').on(t.leadId),
  index('idx_demonstrations_account').on(t.accountId),
  index('idx_demonstrations_status').on(t.status),
]);

// =============================================================================
// MODULO 2: ONBOARDING Y LOGISTICA
// =============================================================================

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  type: assetTypeEnum('type').notNull(),
  serialNumber: varchar('serial_number', { length: 100 }).unique(),
  status: assetStatusEnum('status').default('active'),
  installedDate: timestamp('installed_date', { withTimezone: true }),
  lastMaintenanceDate: timestamp('last_maintenance_date', { withTimezone: true }),
  nextMaintenanceDate: timestamp('next_maintenance_date', { withTimezone: true }),
  location: varchar('location', { length: 255 }),
  photos: jsonb('photos').$type<string[]>(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_assets_account').on(t.accountId),
  index('idx_assets_type').on(t.type),
  index('idx_assets_status').on(t.status),
]);

export const trainingSessions = pgTable('training_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  staffName: varchar('staff_name', { length: 150 }).notNull(),
  staffRole: varchar('staff_role', { length: 50 }),
  trainingType: varchar('training_type', { length: 100 }).notNull(),
  scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
  completedDate: timestamp('completed_date', { withTimezone: true }),
  status: trainingStatusEnum('status').default('pending'),
  score: integer('score'),
  certifiedBy: uuid('certified_by').references(() => staffUsers.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_training_account').on(t.accountId),
  index('idx_training_status').on(t.status),
]);

export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  contractType: varchar('contract_type', { length: 100 }).notNull(),
  status: contractStatusEnum('status').default('draft'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  terms: text('terms').notNull(),
  signedByClient: boolean('signed_by_client').default(false),
  signedByCompany: boolean('signed_by_company').default(false),
  clientSignatureDate: timestamp('client_signature_date', { withTimezone: true }),
  companySignatureDate: timestamp('company_signature_date', { withTimezone: true }),
  documentUrl: varchar('document_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_contracts_account').on(t.accountId),
  index('idx_contracts_status').on(t.status),
]);

// =============================================================================
// MODULO 3: CUSTOMER SUCCESS - SELL THROUGH
// =============================================================================

export const sellThroughRecords = pgTable('sell_through_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  weekStart: timestamp('week_start', { withTimezone: true }).notNull(),
  weekEnd: timestamp('week_end', { withTimezone: true }).notNull(),
  unitsDelivered: integer('units_delivered').notNull(),
  unitsSold: integer('units_sold').notNull(),
  sellThroughRate: numeric('sell_through_rate', { precision: 5, scale: 2 }),
  alertTriggered: boolean('alert_triggered').default(false),
  alertReason: varchar('alert_reason', { length: 255 }),
  actionTaken: text('action_taken'),
  recordedBy: uuid('recorded_by').references(() => staffUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_sell_through_account').on(t.accountId),
  index('idx_sell_through_week').on(t.weekStart),
]);

// =============================================================================
// MODULO 5: TRADE MARKETING Y GAMIFICACION
// =============================================================================

export const popMaterials = pgTable('pop_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  type: popMaterialTypeEnum('type').notNull(),
  condition: popConditionEnum('condition').default('excellent'),
  location: varchar('location', { length: 255 }),
  installedDate: timestamp('installed_date', { withTimezone: true }),
  lastAuditDate: timestamp('last_audit_date', { withTimezone: true }),
  nextAuditDate: timestamp('next_audit_date', { withTimezone: true }),
  photos: jsonb('photos').$type<string[]>(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_pop_account').on(t.accountId),
  index('idx_pop_type').on(t.type),
]);

export const waiterIncentives = pgTable('waiter_incentives', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  waiterName: varchar('waiter_name', { length: 150 }).notNull(),
  period: varchar('period', { length: 50 }).notNull(),
  recommendationsCount: integer('recommendations_count').default(0),
  salesVolume: numeric('sales_volume', { precision: 10, scale: 2 }).default('0.00'),
  bonusAmount: numeric('bonus_amount', { precision: 10, scale: 2 }).default('0.00'),
  status: varchar('status', { length: 50 }).default('pending'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_incentives_account').on(t.accountId),
  index('idx_incentives_period').on(t.period),
]);

export const combos = pgTable('combos', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: comboTypeEnum('type').notNull(),
  description: text('description'),
  discountPercentage: numeric('discount_percentage', { precision: 5, scale: 2 }),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
  totalSales: integer('total_sales').default(0),
  revenue: numeric('revenue', { precision: 10, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_combos_account').on(t.accountId),
  index('idx_combos_type').on(t.type),
]);

export const activations = pgTable('activations', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  type: activationTypeEnum('type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
  completedDate: timestamp('completed_date', { withTimezone: true }),
  status: varchar('status', { length: 50 }).default('scheduled'),
  attendeesCount: integer('attendees_count'),
  salesGenerated: numeric('sales_generated', { precision: 10, scale: 2 }),
  feedback: text('feedback'),
  photos: jsonb('photos').$type<string[]>(),
  createdBy: uuid('created_by').references(() => staffUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_activations_account').on(t.accountId),
  index('idx_activations_type').on(t.type),
  index('idx_activations_date').on(t.scheduledDate),
]);

// =============================================================================
// MODULO 6: FINANCIERO
// =============================================================================

export const warranties = pgTable('warranties', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  type: warrantyTypeEnum('type').notNull(),
  description: text('description').notNull(),
  reportedDate: timestamp('reported_date', { withTimezone: true }).notNull(),
  resolvedDate: timestamp('resolved_date', { withTimezone: true }),
  status: varchar('status', { length: 50 }).default('open'),
  unitsAffected: integer('units_affected'),
  financialImpact: numeric('financial_impact', { precision: 10, scale: 2 }),
  resolution: text('resolution'),
  reportedBy: uuid('reported_by').references(() => staffUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_warranties_account').on(t.accountId),
  index('idx_warranties_type').on(t.type),
  index('idx_warranties_status').on(t.status),
]);

export const b2cTransactions = pgTable('b2c_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id, { onDelete: 'set null' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method'),
  status: varchar('status', { length: 50 }).default('pending'),
  transactionDate: timestamp('transaction_date', { withTimezone: true }).defaultNow(),
  gatewayReference: varchar('gateway_reference', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_b2c_transactions_consumer').on(t.consumerId),
  index('idx_b2c_transactions_account').on(t.accountId),
  index('idx_b2c_transactions_status').on(t.status),
]);
// RELATIONS FASE 3
// =============================================================================

export const productRecommendationsRelations = relations(productRecommendations, ({ one }) => ({
  consumer: one(b2cConsumers, {
    fields: [productRecommendations.consumerId],
    references: [b2cConsumers.id]
  })
}));

export const automationSequencesRelations = relations(automationSequences, ({ many }) => ({
  logs: many(automationLogs)
}));

export const automationLogsRelations = relations(automationLogs, ({ one }) => ({
  sequence: one(automationSequences, {
    fields: [automationLogs.sequenceId],
    references: [automationSequences.id]
  }),
  consumer: one(b2cConsumers, {
    fields: [automationLogs.consumerId],
    references: [b2cConsumers.id]
  }),
  account: one(accounts, {
    fields: [automationLogs.accountId],
    references: [accounts.id]
  })
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(b2cConsumers, {
    fields: [referrals.referrerId],
    references: [b2cConsumers.id]
  }),
  referred: one(b2cConsumers, {
    fields: [referrals.referredId],
    references: [b2cConsumers.id]
  })
}));

export const revenueForecastsRelations = relations(revenueForecasts, ({ one }) => ({
  account: one(accounts, {
    fields: [revenueForecasts.accountId],
    references: [accounts.id]
  })
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  account: one(accounts, {
    fields: [tickets.accountId],
    references: [accounts.id]
  }),
  consumer: one(b2cConsumers, {
    fields: [tickets.consumerId],
    references: [b2cConsumers.id]
  })
}));

// =============================================================================

// =============================================================================
// RELATIONS MODULOS CRM FALTANTES
// =============================================================================

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedStaff: one(staffUsers, {
    fields: [leads.assignedTo],
    references: [staffUsers.id]
  }),
  demonstrations: many(demonstrations)
}));

export const demonstrationsRelations = relations(demonstrations, ({ one }) => ({
  lead: one(leads, {
    fields: [demonstrations.leadId],
    references: [leads.id]
  }),
  account: one(accounts, {
    fields: [demonstrations.accountId],
    references: [accounts.id]
  }),
  conductedByStaff: one(staffUsers, {
    fields: [demonstrations.conductedBy],
    references: [staffUsers.id]
  })
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  account: one(accounts, {
    fields: [assets.accountId],
    references: [accounts.id]
  })
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ one }) => ({
  account: one(accounts, {
    fields: [trainingSessions.accountId],
    references: [accounts.id]
  }),
  certifiedByStaff: one(staffUsers, {
    fields: [trainingSessions.certifiedBy],
    references: [staffUsers.id]
  })
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  account: one(accounts, {
    fields: [contracts.accountId],
    references: [accounts.id]
  })
}));

export const sellThroughRecordsRelations = relations(sellThroughRecords, ({ one }) => ({
  account: one(accounts, {
    fields: [sellThroughRecords.accountId],
    references: [accounts.id]
  }),
  recordedByStaff: one(staffUsers, {
    fields: [sellThroughRecords.recordedBy],
    references: [staffUsers.id]
  })
}));

export const popMaterialsRelations = relations(popMaterials, ({ one }) => ({
  account: one(accounts, {
    fields: [popMaterials.accountId],
    references: [accounts.id]
  })
}));

export const waiterIncentivesRelations = relations(waiterIncentives, ({ one }) => ({
  account: one(accounts, {
    fields: [waiterIncentives.accountId],
    references: [accounts.id]
  })
}));

export const combosRelations = relations(combos, ({ one }) => ({
  account: one(accounts, {
    fields: [combos.accountId],
    references: [accounts.id]
  })
}));

export const activationsRelations = relations(activations, ({ one }) => ({
  account: one(accounts, {
    fields: [activations.accountId],
    references: [accounts.id]
  }),
  createdByStaff: one(staffUsers, {
    fields: [activations.createdBy],
    references: [staffUsers.id]
  })
}));

export const warrantiesRelations = relations(warranties, ({ one }) => ({
  account: one(accounts, {
    fields: [warranties.accountId],
    references: [accounts.id]
  }),
  reportedByStaff: one(staffUsers, {
    fields: [warranties.reportedBy],
    references: [staffUsers.id]
  })
}));

export const b2cTransactionsRelations = relations(b2cTransactions, ({ one }) => ({
  consumer: one(b2cConsumers, {
    fields: [b2cTransactions.consumerId],
    references: [b2cConsumers.id]
  }),
  account: one(accounts, {
    fields: [b2cTransactions.accountId],
    references: [accounts.id]
  })
}));
// TYPE EXPORTS FASE 3
// =============================================================================

export type ProductRecommendation = typeof productRecommendations.$inferSelect;
export type NewProductRecommendation = typeof productRecommendations.$inferInsert;

export type AutomationSequence = typeof automationSequences.$inferSelect;
export type NewAutomationSequence = typeof automationSequences.$inferInsert;

export type AutomationLog = typeof automationLogs.$inferSelect;
export type NewAutomationLog = typeof automationLogs.$inferInsert;

export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;

export type RevenueForecast = typeof revenueForecasts.$inferSelect;
export type NewRevenueForecast = typeof revenueForecasts.$inferInsert;

export type ChannelMetric = typeof channelMetrics.$inferSelect;
export type NewChannelMetric = typeof channelMetrics.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
// =============================================================================

// =============================================================================
// A1: ANALISIS AST - Analisis Estructural de Datos del CRM
// (En CRM: analisis de estructura de datos, no de codigo)
// =============================================================================

export const astAnalysisResults = pgTable('ast_analysis_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisType: varchar('analysis_type', { length: 100 }).notNull(),
  targetModule: varchar('target_module', { length: 100 }).notNull(),
  targetEntityId: uuid('target_entity_id'),
  structuralFindings: jsonb('structural_findings'),
  complexityScore: numeric('complexity_score', { precision: 5, scale: 2 }),
  executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_ast_type').on(t.analysisType),
  index('idx_ast_module').on(t.targetModule),
]);

// =============================================================================
// A2: MOTOR DE EMBEDDINGS - Busqueda Semantica CRM
// =============================================================================

export const embeddingIndex = pgTable('embedding_index', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: kgDomainEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  embedding: vector('embedding', { dimensions: 1024 }),
  model: embeddingModelEnum('model').default('workers_ai_bge_m3'),
  textSource: text('text_source'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_embedding_entity').on(t.entityType, t.entityId),
  index('idx_embedding_model').on(t.model),
]);

// =============================================================================
// A3: LEARNINGENGINE - Motor Central de Aprendizaje CRM
// =============================================================================

export const crmLearningEpisodes = pgTable('crm_learning_episodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  module: varchar('module', { length: 100 }).notNull(),
  issueType: varchar('issue_type', { length: 100 }).notNull(),
  problemDescription: text('problem_description').notNull(),
  problemEmbedding: vector('problem_embedding', { dimensions: 1024 }),
  solutionDescription: text('solution_description'),
  solutionEmbedding: vector('solution_embedding', { dimensions: 1024 }),
  resolutionTimeHours: numeric('resolution_time_hours', { precision: 10, scale: 2 }),
  outcome: episodeOutcomeEnum('outcome').default('SUCCESS'),
  humanNotes: text('human_notes'),
  accountId: uuid('account_id').references(() => accounts.id),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_crm_episodes_module').on(t.module),
  index('idx_crm_episodes_account').on(t.accountId),
  index('idx_crm_episodes_consumer').on(t.consumerId),
]);

export const crmLearningFeedback = pgTable('crm_learning_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  episodeId: uuid('episode_id').references(() => crmLearningEpisodes.id, { onDelete: 'cascade' }),
  feedbackType: varchar('feedback_type', { length: 50 }).notNull(),
  rating: integer('rating'),
  comments: text('comments'),
  providedBy: uuid('provided_by').references(() => staffUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_crm_feedback_episode').on(t.episodeId),
]);

// =============================================================================
// A4: WORKINGMEMORY - Contexto Activo entre Modulos CRM
// =============================================================================

export const workingMemoryCycles = pgTable('working_memory_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleType: varchar('cycle_type', { length: 50 }).notNull(),
  agentName: varchar('agent_name', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  contextData: jsonb('context_data'),
  moduleFindings: jsonb('module_findings'),
  crossModuleLinks: jsonb('cross_module_links'),
  riskByModule: jsonb('risk_by_module'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ttlMinutes: integer('ttl_minutes').default(120),
}, (t) => [
  index('idx_wm_cycles_agent').on(t.agentName),
  index('idx_wm_cycles_status').on(t.status),
]);

// =============================================================================
// A5: MEMORIA DE TRES CAPAS (ya existe en learningEpisodes, agentPatterns, agentProcedures)
// Se agregan tablas complementarias especificas del CRM
// =============================================================================

export const crmPatterns = pgTable('crm_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  patternName: varchar('pattern_name', { length: 255 }).notNull(),
  domain: kgDomainEnum('domain').notNull(),
  patternDescription: text('pattern_description').notNull(),
  issueType: varchar('issue_type', { length: 100 }),
  episodeCount: integer('episode_count').default(0),
  confidenceScore: numeric('confidence_score', { precision: 5, scale: 2 }).default('1.00'),
  consolidation: patternConsolidationEnum('consolidation').default('emerging'),
  decayRate: numeric('decay_rate', { precision: 5, scale: 4 }).default('0.05'),
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
  applicableModules: jsonb('applicable_modules').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_crm_patterns_domain').on(t.domain),
  index('idx_crm_patterns_consolidation').on(t.consolidation),
]);

export const crmProcedures = pgTable('crm_procedures', {
  id: uuid('id').primaryKey().defaultRandom(),
  procedureName: varchar('procedure_name', { length: 255 }).notNull(),
  domain: kgDomainEnum('domain').notNull(),
  issueType: varchar('issue_type', { length: 100 }).notNull(),
  steps: jsonb('steps').$type<Array<{ order: number; action: string; module: string }>>().notNull(),
  validationCount: integer('validation_count').default(0),
  successRate: numeric('success_rate', { precision: 5, scale: 2 }).default('0.00'),
  status: procedureStatusEnum('status').default('draft'),
  createdBy: uuid('created_by').references(() => staffUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_crm_procedures_domain').on(t.domain),
  index('idx_crm_procedures_status').on(t.status),
]);

// =============================================================================
// A6: FORGETTING CURVE - Depreciacion de Conocimiento
// =============================================================================

export const forgettingCurveLog = pgTable('forgetting_curve_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  patternId: uuid('pattern_id').references(() => crmPatterns.id, { onDelete: 'cascade' }),
  previousConfidence: numeric('previous_confidence', { precision: 5, scale: 2 }),
  newConfidence: numeric('new_confidence', { precision: 5, scale: 2 }),
  previousState: patternConsolidationEnum('previous_state'),
  newState: patternConsolidationEnum('new_state'),
  daysSinceLastUse: integer('days_since_last_use'),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_forgetting_pattern').on(t.patternId),
  index('idx_forgetting_applied').on(t.appliedAt),
]);

// =============================================================================
// A7: CHAIN OF THOUGHT - Razonamiento CRM antes de acciones
// =============================================================================

export const cotExecutions = pgTable('cot_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  triggerType: varchar('trigger_type', { length: 100 }).notNull(),
  triggerEntityId: uuid('trigger_entity_id'),
  triggerDomain: kgDomainEnum('trigger_domain'),
  step1SimilarCases: jsonb('step1_similar_cases'),
  step2ContextComparison: jsonb('step2_context_comparison'),
  step3AffectedElements: jsonb('step3_affected_elements'),
  step4BusinessImpact: jsonb('step4_business_impact'),
  step5SideEffects: jsonb('step5_side_effects'),
  step6FalsePositiveCheck: jsonb('step6_fp_check'),
  finalDecision: varchar('final_decision', { length: 100 }),
  confidenceScore: numeric('confidence_score', { precision: 5, scale: 2 }),
  executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_cot_trigger').on(t.triggerType, t.triggerDomain),
  index('idx_cot_decision').on(t.finalDecision),
]);

// =============================================================================
// A8: PREDICCION MULTIVARIADA - CRM Predictivo
// =============================================================================

export const multivariatePredictions = pgTable('multivariate_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  predictionType: varchar('prediction_type', { length: 100 }).notNull(),
  targetEntityId: uuid('target_entity_id').notNull(),
  targetDomain: kgDomainEnum('target_domain').notNull(),
  horizon: predictionHorizonEnum('horizon').notNull(),
  predictedValue: numeric('predicted_value', { precision: 10, scale: 2 }),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  factors: jsonb('factors'),
  riskScore: numeric('risk_score', { precision: 5, scale: 2 }),
  actualValue: numeric('actual_value', { precision: 10, scale: 2 }),
  accuracy: numeric('accuracy', { precision: 5, scale: 2 }),
  predictedAt: timestamp('predicted_at', { withTimezone: true }).defaultNow(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
}, (t) => [
  index('idx_mv_pred_type').on(t.predictionType),
  index('idx_mv_pred_target').on(t.targetEntityId, t.targetDomain),
  index('idx_mv_pred_horizon').on(t.horizon),
]);

// =============================================================================
// A9: KNOWLEDGE GRAPH - Grafo del Dominio CRM
// =============================================================================

export const kgCrmNodes = pgTable('kg_crm_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeType: kgDomainEnum('node_type').notNull(),
  nodeId: uuid('node_id').notNull(),
  nodeName: varchar('node_name', { length: 255 }).notNull(),
  centralityScore: numeric('centrality_score', { precision: 5, scale: 2 }).default('0.00'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_kg_crm_type').on(t.nodeType),
  index('idx_kg_crm_node').on(t.nodeId),
]);

export const kgCrmEdges = pgTable('kg_crm_edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceNodeId: uuid('source_node_id').notNull().references(() => kgCrmNodes.id, { onDelete: 'cascade' }),
  targetNodeId: uuid('target_node_id').notNull().references(() => kgCrmNodes.id, { onDelete: 'cascade' }),
  edgeType: kgRelationTypeEnum('edge_type').notNull(),
  couplingStrength: numeric('coupling_strength', { precision: 5, scale: 2 }).default('0.50'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_kg_crm_source').on(t.sourceNodeId),
  index('idx_kg_crm_target').on(t.targetNodeId),
  index('idx_kg_crm_edge_type').on(t.edgeType),
]);

// =============================================================================
// A10: XAI - Explicabilidad de Decisiones CRM
// =============================================================================

export const xaiExplanations = pgTable('xai_explanations', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionType: varchar('decision_type', { length: 100 }).notNull(),
  decisionId: uuid('decision_id'),
  evidenceType: xaiEvidenceTypeEnum('evidence_type').notNull(),
  evidenceData: jsonb('evidence_data'),
  confidenceScore: numeric('confidence_score', { precision: 5, scale: 2 }),
  businessImpactTranslation: text('business_impact_translation'),
  similarCasesUsed: jsonb('similar_cases_used'),
  knownSideEffects: jsonb('known_side_effects'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_xai_decision').on(t.decisionType, t.decisionId),
  index('idx_xai_evidence').on(t.evidenceType),
]);

// =============================================================================
// A11: VALIDATION SANDBOX - Validacion 4 Fases CRM
// =============================================================================

export const sandboxExecutions = pgTable('sandbox_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  actionType: autonomyActionEnum('action_type').notNull(),
  targetDomain: kgDomainEnum('target_domain'),
  targetEntityId: uuid('target_entity_id'),
  phase1DryRun: jsonb('phase1_dry_run'),
  phase2Staging: jsonb('phase2_staging'),
  phase3Canary: jsonb('phase3_canary'),
  phase4Production: jsonb('phase4_production'),
  currentPhase: sandboxPhaseEnum('current_phase').default('dry_run'),
  authorized: boolean('authorized').default(false),
  finalDecision: varchar('final_decision', { length: 50 }),
  executedBy: uuid('executed_by').references(() => staffUsers.id),
  executedAt: timestamp('executed_at', { withTimezone: true }),
}, (t) => [
  index('idx_sandbox_action').on(t.actionType),
  index('idx_sandbox_phase').on(t.currentPhase),
]);

// =============================================================================
// A12: GOBIERNO Y AUTONOMIA - Matriz CRM
// =============================================================================

export const crmAutonomyMatrix = pgTable('crm_autonomy_matrix', {
  id: uuid('id').primaryKey().defaultRandom(),
  actionType: autonomyActionEnum('action_type').notNull(),
  domain: kgDomainEnum('domain').notNull(),
  environment: environmentEnum('environment').notNull(),
  autonomyLevel: autonomyLevelEnum('autonomy_level').notNull(),
  approvalRequired: boolean('approval_required').default(false),
  approvalTimeoutMinutes: integer('approval_timeout_minutes').default(30),
  requiredApprovalsCount: integer('required_approvals_count').default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_crm_autonomy_action').on(t.actionType),
  index('idx_crm_autonomy_domain').on(t.domain),
  index('idx_crm_autonomy_env').on(t.environment),
]);

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  actionType: autonomyActionEnum('action_type').notNull(),
  requestedBy: uuid('requested_by').references(() => staffUsers.id),
  approvalData: jsonb('approval_data'),
  status: varchar('status', { length: 50 }).default('pending'),
  approvedBy: uuid('approved_by').references(() => staffUsers.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedReason: text('rejected_reason'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_approval_status').on(t.status),
  index('idx_approval_expires').on(t.expiresAt),
]);

// =============================================================================
// A13: SEGURIDAD DEL AGENTE CRM
// =============================================================================

export const agentSecurityLog = pgTable('agent_security_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  description: text('description').notNull(),
  sourceAgent: varchar('source_agent', { length: 100 }),
  targetSystem: varchar('target_system', { length: 100 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_security_event').on(t.eventType),
  index('idx_security_severity').on(t.severity),
]);

// =============================================================================
// A14: OBSERVABILIDAD PROPIA CRM
// =============================================================================

export const crmAgentMetrics = pgTable('crm_agent_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricName: varchar('metric_name', { length: 150 }).notNull(),
  metricType: observabilityMetricTypeEnum('metric_type').notNull(),
  metricValue: numeric('metric_value', { precision: 10, scale: 4 }).notNull(),
  labels: jsonb('labels'),
  agentName: varchar('agent_name', { length: 100 }),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_crm_metrics_name').on(t.metricName),
  index('idx_crm_metrics_recorded').on(t.recordedAt),
  index('idx_crm_metrics_agent').on(t.agentName),
]);

export const crmAgentHealth = pgTable('crm_agent_health', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentName: varchar('agent_name', { length: 100 }).notNull(),
  healthStatus: agentHealthStatusEnum('health_status').default('healthy'),
  intelligenceScore: numeric('intelligence_score', { precision: 5, scale: 2 }),
  driftScore: numeric('drift_score', { precision: 5, scale: 4 }),
  lastSuccessfulRun: timestamp('last_successful_run', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').default(0),
  fpRate: numeric('fp_rate', { precision: 5, scale: 4 }),
  acceptanceRate: numeric('acceptance_rate', { precision: 5, scale: 4 }),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_crm_health_agent').on(t.agentName),
  index('idx_crm_health_status').on(t.healthStatus),
]);

export const crmWeeklyReports = pgTable('crm_weekly_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportWeek: varchar('report_week', { length: 20 }).notNull(),
  agentName: varchar('agent_name', { length: 100 }).notNull(),
  detectionKpis: jsonb('detection_kpis'),
  learningKpis: jsonb('learning_kpis'),
  predictionKpis: jsonb('prediction_kpis'),
  agentHealth: jsonb('agent_health'),
  topRiskyModules: jsonb('top_risky_modules'),
  weekAlerts: jsonb('week_alerts'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_crm_reports_week').on(t.reportWeek),
  index('idx_crm_reports_agent').on(t.agentName),
]);

// =============================================================================
// RELATIONS - 14 ARQUITECTURAS TRANSVERSALES
// =============================================================================

export const astAnalysisResultsRelations = relations(astAnalysisResults, ({}) => ({}));

export const embeddingIndexRelations = relations(embeddingIndex, ({}) => ({}));

export const crmLearningEpisodesRelations = relations(crmLearningEpisodes, ({ one, many }) => ({
  account: one(accounts, {
    fields: [crmLearningEpisodes.accountId],
    references: [accounts.id]
  }),
  consumer: one(b2cConsumers, {
    fields: [crmLearningEpisodes.consumerId],
    references: [b2cConsumers.id]
  }),
  feedback: many(crmLearningFeedback)
}));

export const crmLearningFeedbackRelations = relations(crmLearningFeedback, ({ one }) => ({
  episode: one(crmLearningEpisodes, {
    fields: [crmLearningFeedback.episodeId],
    references: [crmLearningEpisodes.id]
  }),
  providedByStaff: one(staffUsers, {
    fields: [crmLearningFeedback.providedBy],
    references: [staffUsers.id]
  })
}));

export const workingMemoryCyclesRelations = relations(workingMemoryCycles, ({}) => ({}));

export const crmPatternsRelations = relations(crmPatterns, ({ many }) => ({
  forgettingLogs: many(forgettingCurveLog)
}));

export const crmProceduresRelations = relations(crmProcedures, ({ one }) => ({
  createdByStaff: one(staffUsers, {
    fields: [crmProcedures.createdBy],
    references: [staffUsers.id]
  })
}));

export const forgettingCurveLogRelations = relations(forgettingCurveLog, ({ one }) => ({
  pattern: one(crmPatterns, {
    fields: [forgettingCurveLog.patternId],
    references: [crmPatterns.id]
  })
}));

export const cotExecutionsRelations = relations(cotExecutions, ({}) => ({}));

export const multivariatePredictionsRelations = relations(multivariatePredictions, ({}) => ({}));

export const kgCrmEdgesRelations = relations(kgCrmEdges, ({ one }) => ({
  sourceNode: one(kgCrmNodes, {
    fields: [kgCrmEdges.sourceNodeId],
    references: [kgCrmNodes.id]
  }),
  targetNode: one(kgCrmNodes, {
    fields: [kgCrmEdges.targetNodeId],
    references: [kgCrmNodes.id]
  })
}));

export const xaiExplanationsRelations = relations(xaiExplanations, ({}) => ({}));

export const sandboxExecutionsRelations = relations(sandboxExecutions, ({ one }) => ({
  executedByStaff: one(staffUsers, {
    fields: [sandboxExecutions.executedBy],
    references: [staffUsers.id]
  })
}));

export const crmAutonomyMatrixRelations = relations(crmAutonomyMatrix, ({}) => ({}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  requestedByStaff: one(staffUsers, {
    fields: [approvalRequests.requestedBy],
    references: [staffUsers.id]
  }),
  approvedByStaff: one(staffUsers, {
    fields: [approvalRequests.approvedBy],
    references: [staffUsers.id]
  })
}));

export const agentSecurityLogRelations = relations(agentSecurityLog, ({}) => ({}));

export const crmAgentMetricsRelations = relations(crmAgentMetrics, ({}) => ({}));

export const crmAgentHealthRelations = relations(crmAgentHealth, ({}) => ({}));

export const crmWeeklyReportsRelations = relations(crmWeeklyReports, ({}) => ({}));
// TYPE EXPORTS MODULOS CRM FALTANTES
// =============================================================================

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type Demonstration = typeof demonstrations.$inferSelect;
export type NewDemonstration = typeof demonstrations.$inferInsert;

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type TrainingSession = typeof trainingSessions.$inferSelect;
export type NewTrainingSession = typeof trainingSessions.$inferInsert;

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;

export type SellThroughRecord = typeof sellThroughRecords.$inferSelect;
export type NewSellThroughRecord = typeof sellThroughRecords.$inferInsert;

export type PopMaterial = typeof popMaterials.$inferSelect;
export type NewPopMaterial = typeof popMaterials.$inferInsert;

export type WaiterIncentive = typeof waiterIncentives.$inferSelect;
export type NewWaiterIncentive = typeof waiterIncentives.$inferInsert;

export type Combo = typeof combos.$inferSelect;
export type NewCombo = typeof combos.$inferInsert;

export type Activation = typeof activations.$inferSelect;
export type NewActivation = typeof activations.$inferInsert;

export type Warranty = typeof warranties.$inferSelect;
export type NewWarranty = typeof warranties.$inferInsert;

export type B2cTransaction = typeof b2cTransactions.$inferSelect;
export type NewB2cTransaction = typeof b2cTransactions.$inferInsert;
// TYPE EXPORTS MODULOS CRM FALTANTES
// =============================================================================












// =============================================================================
// ENUMS - 14 ARQUITECTURAS TRANSVERSALES (CRM SIGH_FOOD)
// =============================================================================











// =============================================================================
// TYPE EXPORTS - 14 ARQUITECTURAS TRANSVERSALES
// =============================================================================

export type AstAnalysisResult = typeof astAnalysisResults.$inferSelect;
export type NewAstAnalysisResult = typeof astAnalysisResults.$inferInsert;

export type EmbeddingIndex = typeof embeddingIndex.$inferSelect;
export type NewEmbeddingIndex = typeof embeddingIndex.$inferInsert;

export type CrmLearningEpisode = typeof crmLearningEpisodes.$inferSelect;
export type NewCrmLearningEpisode = typeof crmLearningEpisodes.$inferInsert;

export type CrmLearningFeedback = typeof crmLearningFeedback.$inferSelect;
export type NewCrmLearningFeedback = typeof crmLearningFeedback.$inferInsert;

export type WorkingMemoryCycle = typeof workingMemoryCycles.$inferSelect;
export type NewWorkingMemoryCycle = typeof workingMemoryCycles.$inferInsert;

export type CrmPattern = typeof crmPatterns.$inferSelect;
export type NewCrmPattern = typeof crmPatterns.$inferInsert;

export type CrmProcedure = typeof crmProcedures.$inferSelect;
export type NewCrmProcedure = typeof crmProcedures.$inferInsert;

export type ForgettingCurveLog = typeof forgettingCurveLog.$inferSelect;
export type NewForgettingCurveLog = typeof forgettingCurveLog.$inferInsert;

export type CotExecution = typeof cotExecutions.$inferSelect;
export type NewCotExecution = typeof cotExecutions.$inferInsert;

export type MultivariatePrediction = typeof multivariatePredictions.$inferSelect;
export type NewMultivariatePrediction = typeof multivariatePredictions.$inferInsert;

export type KgCrmNode = typeof kgCrmNodes.$inferSelect;
export type NewKgCrmNode = typeof kgCrmNodes.$inferInsert;

export type KgCrmEdge = typeof kgCrmEdges.$inferSelect;
export type NewKgCrmEdge = typeof kgCrmEdges.$inferInsert;

export type XaiExplanation = typeof xaiExplanations.$inferSelect;
export type NewXaiExplanation = typeof xaiExplanations.$inferInsert;

export type SandboxExecution = typeof sandboxExecutions.$inferSelect;
export type NewSandboxExecution = typeof sandboxExecutions.$inferInsert;

export type CrmAutonomyMatrix = typeof crmAutonomyMatrix.$inferSelect;
export type NewCrmAutonomyMatrix = typeof crmAutonomyMatrix.$inferInsert;

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;

export type AgentSecurityLog = typeof agentSecurityLog.$inferSelect;
export type NewAgentSecurityLog = typeof agentSecurityLog.$inferInsert;

export type CrmAgentMetric = typeof crmAgentMetrics.$inferSelect;
export type NewCrmAgentMetric = typeof crmAgentMetrics.$inferInsert;

export type CrmAgentHealth = typeof crmAgentHealth.$inferSelect;
export type NewCrmAgentHealth = typeof crmAgentHealth.$inferInsert;

export type CrmWeeklyReport = typeof crmWeeklyReports.$inferSelect;
export type NewCrmWeeklyReport = typeof crmWeeklyReports.$inferInsert;

// =============================================================================
// B2C: PASAPORTE DEL COMENSAL, GAMIFICACION Y VOZ DEL CONSUMIDOR
// -----------------------------------------------------------------------------
// El CRM ya guardaba puntos, cashback y nivel en b2c_consumers, pero como
// columnas sueltas: un saldo sin historial que nadie podia auditar ni explicar.
// Estas tablas convierten eso en un programa de fidelizacion operable.
// =============================================================================

/** Catalogo de insignias. Se define una vez y se otorga muchas. */
export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 60 }).notNull().unique(),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  descripcion: text('descripcion').notNull(),
  /** Emoji o icono corto; se pinta tal cual en la ficha del comensal. */
  icono: varchar('icono', { length: 16 }).notNull().default('*'),
  criterio: badgeCriterioEnum('criterio').notNull(),
  /** Cuanto hace falta del criterio para desbloquearla. */
  umbral: integer('umbral').notNull(),
  /** Acota el criterio: linea de producto, franja horaria, zona. */
  parametro: varchar('parametro', { length: 100 }),
  puntosOtorgados: integer('puntos_otorgados').notNull().default(0),
  activa: boolean('activa').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_badges_criterio').on(t.criterio),
  index('idx_badges_activa').on(t.activa),
]);

/** Insignias desbloqueadas por cada comensal. */
export const consumerBadges = pgTable('consumer_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').notNull().references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  badgeId: uuid('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  /** Valor del criterio al desbloquearla; sirve para explicar el porque. */
  valorAlDesbloquear: integer('valor_al_desbloquear'),
  desbloqueadaEn: timestamp('desbloqueada_en', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_consumer_badges_consumer').on(t.consumerId),
  index('idx_consumer_badges_badge').on(t.badgeId),
  // Una insignia se desbloquea una sola vez por comensal. Sin esto, reevaluar
  // los criterios duplicaria insignias y regalaria puntos en cada pasada.
  uniqueIndex('uq_consumer_badge').on(t.consumerId, t.badgeId),
]);

/**
 * Movimientos de la billetera de puntos.
 *
 * b2c_consumers.points guarda el saldo, pero un saldo sin historial no se puede
 * auditar: ante una reclamacion no habia forma de saber de donde salieron los
 * puntos ni quien los movio.
 */
export const pointTransactions = pgTable('point_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').notNull().references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  /** Positivo suma, negativo resta. */
  puntos: integer('puntos').notNull(),
  motivo: motivoPuntosEnum('motivo').notNull(),
  /** Fila que origino el movimiento (momento, insignia, desafio, referido). */
  referenciaId: uuid('referencia_id'),
  descripcion: varchar('descripcion', { length: 255 }),
  /** Saldo tras aplicar el movimiento, para reconstruir sin sumar todo. */
  saldoResultante: integer('saldo_resultante'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_puntos_consumer').on(t.consumerId),
  index('idx_puntos_motivo').on(t.motivo),
  index('idx_puntos_fecha').on(t.createdAt),
]);

/** Desafios y rifas que se juegan en la mesa. */
export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  titulo: varchar('titulo', { length: 150 }).notNull(),
  descripcion: text('descripcion'),
  /** Preguntas del desafio: [{ pregunta, opciones[], correcta? }]. */
  preguntas: jsonb('preguntas').$type<Array<{
    pregunta: string;
    opciones: string[];
    correcta?: number;
  }>>().notNull(),
  estado: desafioEstadoEnum('estado').notNull().default('borrador'),
  puntosPremio: integer('puntos_premio').notNull().default(0),
  premioDescripcion: varchar('premio_descripcion', { length: 255 }),
  /** Si se limita a una linea de producto o a una zona. */
  lineaProducto: momentProductLineEnum('linea_producto'),
  zona: varchar('zona', { length: 100 }),
  empiezaEn: timestamp('empieza_en', { withTimezone: true }),
  terminaEn: timestamp('termina_en', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_challenges_estado').on(t.estado),
  index('idx_challenges_ventana').on(t.empiezaEn, t.terminaEn),
]);

/** Respuestas de los comensales a un desafio. */
export const challengeResponses = pgTable('challenge_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  challengeId: uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
  consumerId: uuid('consumer_id').notNull().references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  respuestas: jsonb('respuestas').$type<Array<{ pregunta: number; elegida: number }>>().notNull(),
  acertadas: integer('acertadas'),
  puntosGanados: integer('puntos_ganados').notNull().default(0),
  /** Cuanto tardo en responder; alimenta las dinamicas "express". */
  segundosRespuesta: integer('segundos_respuesta'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_respuestas_challenge').on(t.challengeId),
  index('idx_respuestas_consumer').on(t.consumerId),
  // Un comensal responde una vez a cada desafio.
  uniqueIndex('uq_respuesta_challenge_consumer').on(t.challengeId, t.consumerId),
]);

/**
 * Segmentos de comensales.
 *
 * Un segmento dinamico guarda su REGLA, no la lista: si guardara la lista, un
 * comensal que deja de cumplirla seguiria recibiendo campanas para siempre.
 */
export const segments = pgTable('segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: varchar('nombre', { length: 120 }).notNull().unique(),
  descripcion: text('descripcion'),
  tipo: segmentoTipoEnum('tipo').notNull().default('dinamico'),
  /** Regla evaluada: { lineaProducto?, zona?, franja?, minEscaneos?, diasInactivo?, nivel? }. */
  regla: jsonb('regla').$type<{
    lineaProducto?: string;
    zona?: string;
    franjaDesde?: number;
    franjaHasta?: number;
    minEscaneos?: number;
    diasInactivo?: number;
    nivel?: string;
  }>(),
  color: varchar('color', { length: 20 }).default('slate'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_segments_activo').on(t.activo),
]);

/** Pertenencia a segmentos manuales. Los dinamicos se resuelven por regla. */
export const consumerSegments = pgTable('consumer_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').notNull().references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  segmentId: uuid('segment_id').notNull().references(() => segments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex('uq_consumer_segment').on(t.consumerId, t.segmentId),
  index('idx_consumer_segments_segment').on(t.segmentId),
]);

/**
 * Resenas del comensal sobre el producto.
 *
 * Es el canal por el que un fallo de produccion —una tanda demasiado picante,
 * una textura rara— llega desde la mesa hasta quien puede corregirlo.
 */
export const consumerReviews = pgTable('consumer_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').notNull().references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  momentId: uuid('moment_id').references(() => sensoryMoments.id, { onDelete: 'set null' }),
  productLine: momentProductLineEnum('product_line'),
  /** 1 a 5. */
  puntuacion: integer('puntuacion'),
  comentario: text('comentario'),
  /** Lo rellena el analisis de la IA, no el comensal. */
  sentimiento: sentimientoEnum('sentimiento'),
  puntuacionSentimiento: numeric('puntuacion_sentimiento', { precision: 5, scale: 2 }),
  /** Atributos detectados: textura, temperatura, picante, sabor. */
  atributos: jsonb('atributos').$type<Record<string, string>>(),
  /** true si el analisis sugiere un problema de calidad que revisar. */
  alertaCalidad: boolean('alerta_calidad').notNull().default(false),
  analizadaEn: timestamp('analizada_en', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_reviews_consumer').on(t.consumerId),
  index('idx_reviews_account').on(t.accountId),
  index('idx_reviews_sentimiento').on(t.sentimiento),
  index('idx_reviews_alerta').on(t.alertaCalidad),
  index('idx_reviews_fecha').on(t.createdAt),
]);

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;
export type ConsumerBadge = typeof consumerBadges.$inferSelect;
export type NewConsumerBadge = typeof consumerBadges.$inferInsert;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type NewPointTransaction = typeof pointTransactions.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type ChallengeResponse = typeof challengeResponses.$inferSelect;
export type NewChallengeResponse = typeof challengeResponses.$inferInsert;
export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;
export type ConsumerSegment = typeof consumerSegments.$inferSelect;
export type NewConsumerSegment = typeof consumerSegments.$inferInsert;
export type ConsumerReview = typeof consumerReviews.$inferSelect;
export type NewConsumerReview = typeof consumerReviews.$inferInsert;

// =============================================================================
// B2C: ECONOMIA DE CANJE
// -----------------------------------------------------------------------------
// Los puntos ya se ganaban, pero no se podian gastar en nada: un saldo que solo
// sube no es un programa de fidelizacion, es un contador.
// =============================================================================

/** Catalogo de premios canjeables. */
export const rewards = pgTable('rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: varchar('nombre', { length: 150 }).notNull(),
  descripcion: text('descripcion'),
  tipo: tipoPremioEnum('tipo').notNull(),
  costePuntos: integer('coste_puntos').notNull(),
  /** Cuantos quedan. NULL = sin limite. */
  stock: integer('stock'),
  /** Nivel minimo del comensal para poder canjearlo. */
  nivelMinimo: membershipTierEnum('nivel_minimo'),
  /** Dias que vale el codigo desde que se emite. */
  diasValidez: integer('dias_validez').notNull().default(30),
  imagenUrl: varchar('imagen_url', { length: 500 }),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_rewards_activo').on(t.activo),
  index('idx_rewards_coste').on(t.costePuntos),
]);

/**
 * Canjes emitidos.
 *
 * El codigo es lo que impide el fraude: el comensal ensena un codigo corto, el
 * personal lo introduce y solo entonces se marca como entregado. Sin ese paso,
 * una captura de pantalla del movil valdria por infinitos premios.
 */
export const redemptions = pgTable('redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').notNull().references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  rewardId: uuid('reward_id').notNull().references(() => rewards.id, { onDelete: 'restrict' }),
  /** Codigo corto que el comensal ensena en la mesa. */
  codigo: varchar('codigo', { length: 12 }).notNull().unique(),
  /** Coste en el momento de emitir: el precio del catalogo puede cambiar despues. */
  puntosGastados: integer('puntos_gastados').notNull(),
  estado: estadoCanjeEnum('estado').notNull().default('pendiente'),
  /** Donde y quien lo entrego. */
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  canjeadoPor: uuid('canjeado_por').references(() => staffUsers.id),
  canjeadoEn: timestamp('canjeado_en', { withTimezone: true }),
  expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
  motivoAnulacion: text('motivo_anulacion'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_redemptions_consumer').on(t.consumerId),
  index('idx_redemptions_estado').on(t.estado),
  index('idx_redemptions_codigo').on(t.codigo),
  index('idx_redemptions_expira').on(t.expiraEn),
]);

export type Reward = typeof rewards.$inferSelect;
export type NewReward = typeof rewards.$inferInsert;
export type Redemption = typeof redemptions.$inferSelect;
export type NewRedemption = typeof redemptions.$inferInsert;

// =============================================================================
// OPERACION DEL CRM: configuracion, consentimientos y respuestas
// =============================================================================

/**
 * Configuracion del sistema, en clave-valor.
 *
 * Los umbrales del agente —cuantos dias sin escanear cuentan como "en riesgo",
 * a partir de que confianza actua solo— estaban repartidos como constantes en
 * el codigo. Calibrarlos exigia un despliegue, asi que en la practica nadie los
 * tocaba y el agente operaba siempre con los valores que alguien eligio una vez.
 */
export const configuracion = pgTable('configuracion', {
  clave: varchar('clave', { length: 100 }).primaryKey(),
  valor: jsonb('valor').notNull(),
  descripcion: text('descripcion'),
  /** Quien lo cambio por ultima vez: un umbral mal puesto hay que poder rastrearlo. */
  actualizadoPor: uuid('actualizado_por').references(() => staffUsers.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Respuestas del comensal a un mensaje automatizado.
 *
 * Sin esto, la mensajeria es un altavoz: se envia y nadie sabe si alguien
 * contesto. Una respuesta a un WhatsApp automatico es la senal mas fuerte de
 * interes que puede dar un comensal, y se estaba perdiendo.
 */
export const mensajesEntrantes = pgTable('mensajes_entrantes', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  /** Envio al que responde, si se pudo emparejar. */
  logId: uuid('log_id').references(() => automationLogs.id, { onDelete: 'set null' }),
  canal: automationChannelEnum('canal').notNull(),
  /** Telefono o direccion desde la que llego, por si no hay comensal conocido. */
  remitente: varchar('remitente', { length: 100 }).notNull(),
  texto: text('texto').notNull(),
  /** true cuando alguien del equipo ya lo atendio. */
  atendido: boolean('atendido').notNull().default(false),
  atendidoPor: uuid('atendido_por').references(() => staffUsers.id),
  atendidoEn: timestamp('atendido_en', { withTimezone: true }),
  notaInterna: text('nota_interna'),
  recibidoEn: timestamp('recibido_en', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_entrantes_consumer').on(t.consumerId),
  index('idx_entrantes_atendido').on(t.atendido),
  index('idx_entrantes_fecha').on(t.recibidoEn),
]);

export type Configuracion = typeof configuracion.$inferSelect;
export type NewConfiguracion = typeof configuracion.$inferInsert;
export type MensajeEntrante = typeof mensajesEntrantes.$inferSelect;
export type NewMensajeEntrante = typeof mensajesEntrantes.$inferInsert;

// =============================================================================
// WHATSAPP: CONVERSACIONES Y MENSAJES
// =============================================================================

/**
 * Hilo de conversacion con un numero.
 *
 * La clave es el telefono en E.164 y no el comensal: un mensaje puede llegar de
 * alguien que todavia no esta registrado, y perderlo por no tener a quien
 * asociarlo seria perder justo al lead que acaba de escribir.
 */
export const chatConversations = pgTable('chat_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Telefono normalizado a E.164, sin '+'. Es como lo devuelve Meta. */
  telefono: varchar('telefono', { length: 20 }).notNull().unique(),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id, { onDelete: 'set null' }),
  /** Nombre del perfil de WhatsApp, si Meta lo envia. */
  nombrePerfil: varchar('nombre_perfil', { length: 150 }),
  estado: chatEstadoEnum('estado').notNull().default('bot'),
  /** Asesor que tomo el chat. */
  asignadoA: uuid('asignado_a').references(() => staffUsers.id, { onDelete: 'set null' }),
  /**
   * Cuando caduca la ventana de servicio de 24 h de Meta.
   *
   * Fuera de ella NO se puede mandar texto libre: solo plantillas aprobadas.
   * Se guarda calculado en lugar de derivarlo cada vez, para poder filtrar por
   * el en la bandeja sin recorrer los mensajes.
   */
  ventanaExpiraEn: timestamp('ventana_expira_en', { withTimezone: true }),
  ultimoMensajeEn: timestamp('ultimo_mensaje_en', { withTimezone: true }),
  /** Mensajes entrantes sin leer por el equipo. */
  sinLeer: integer('sin_leer').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_chat_conv_telefono').on(t.telefono),
  index('idx_chat_conv_consumer').on(t.consumerId),
  index('idx_chat_conv_estado').on(t.estado),
  index('idx_chat_conv_ultimo').on(t.ultimoMensajeEn),
]);

/**
 * Mensajes de una conversacion.
 *
 * `wamid` es el identificador de Meta y lleva indice unico: los webhooks se
 * reintentan, y sin esa restriccion el mismo mensaje entrante se guardaria
 * varias veces cada vez que Meta reintenta.
 */
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull()
    .references(() => chatConversations.id, { onDelete: 'cascade' }),
  /** Identificador de Meta (wamid.HBg...). NULL mientras no lo acepte. */
  wamid: varchar('wamid', { length: 200 }),
  direccion: chatDireccionEnum('direccion').notNull(),
  tipo: chatTipoEnum('tipo').notNull().default('texto'),
  texto: text('texto'),
  /** Id del medio en Meta; hay que pedir la URL aparte y caduca. */
  mediaId: varchar('media_id', { length: 200 }),
  mediaMime: varchar('media_mime', { length: 100 }),
  estado: chatEstadoMensajeEnum('estado').notNull().default('pendiente'),
  /** Codigo y mensaje de error de Meta cuando falla el envio. */
  errorCodigo: varchar('error_codigo', { length: 50 }),
  errorMensaje: text('error_mensaje'),
  /** Plantilla usada, si fue un envio HSM. */
  plantilla: varchar('plantilla', { length: 100 }),
  /** Quien lo envio: NULL si lo mando el bot. */
  enviadoPor: uuid('enviado_por').references(() => staffUsers.id, { onDelete: 'set null' }),
  /** Secuencia de automatizacion que lo origino. */
  sequenceId: uuid('sequence_id').references(() => automationSequences.id, { onDelete: 'set null' }),
  /** Marca de tiempo de Meta, que puede diferir de la nuestra. */
  timestampMeta: timestamp('timestamp_meta', { withTimezone: true }),
  entregadoEn: timestamp('entregado_en', { withTimezone: true }),
  leidoEn: timestamp('leido_en', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_chat_msg_conv').on(t.conversationId),
  index('idx_chat_msg_fecha').on(t.createdAt),
  index('idx_chat_msg_estado').on(t.estado),
  // Evita duplicar un mensaje cuando Meta reintenta el webhook.
  uniqueIndex('uq_chat_msg_wamid').on(t.wamid),
]);

export type ChatConversation = typeof chatConversations.$inferSelect;
export type NewChatConversation = typeof chatConversations.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
