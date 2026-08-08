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
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =============================================================================
// ENUMS
// =============================================================================

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
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  pipelineStage: b2bPipelineStageEnum('pipeline_stage').default('lead_landing'),
  currentConsignationStock: integer('current_consignation_stock').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// =============================================================================
// 2. B2C_CONSUMERS (Comensales - First-Party Data)
// =============================================================================

export const b2cConsumers = pgTable('b2c_consumers', {
  id: uuid('id').primaryKey().defaultRandom(),
  whatsappPhone: varchar('whatsapp_phone', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 150 }),
  email: varchar('email', { length: 255 }),
  flavorPreference: jsonb('flavor_preference').default({}),
  isVipWhatsapp: boolean('is_vip_whatsapp').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// =============================================================================
// 3. SENSORY_MOMENTS (Momentos Sensoriales - North Star Metric)
// =============================================================================

export const sensoryMoments = pgTable('sensory_moments', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  productLine: momentProductLineEnum('product_line').notNull(),
  scannedAt: timestamp('scanned_at', { withTimezone: true }).defaultNow(),
  deviceInfo: jsonb('device_info')
});

// =============================================================================
// 4. CONSIGNATION_LOGS (Control de Inventario en Consignación)
// =============================================================================

export const consignationLogs = pgTable('consignation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  unitsDelivered: integer('units_delivered').notNull(),
  unitsSold: integer('units_sold').default(0),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).default('21000.00'),
  settlementStatus: settlementStatusEnum('settlement_status').default('pending'),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }).defaultNow(),
  settledAt: timestamp('settled_at', { withTimezone: true })
});

// =============================================================================
// 5. QR_CODES (Gestión de Códigos QR por Mesa)
// =============================================================================

export const qrCodes = pgTable('qr_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  tableNumber: varchar('table_number', { length: 50 }).notNull(),
  qrToken: varchar('qr_token', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// =============================================================================
// 6. DATA_CONSENTS (Auditoría de Consentimiento - Habeas Data)
// =============================================================================

export const dataConsents = pgTable('data_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  consumerId: uuid('consumer_id').references(() => b2cConsumers.id, { onDelete: 'cascade' }),
  consentType: varchar('consent_type', { length: 50 }).notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow()
});

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