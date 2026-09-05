import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, index, check } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), createdAt: text('created_at').notNull(),
});
export const members = sqliteTable('members', {
  email: text('email').primaryKey(), userId: text('user_id'), name: text('name').notNull(),
  role: text('role').notNull(), active: integer('active').notNull().default(1), createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('members_user_id').on(t.userId), check('members_role', sql`${t.role} IN ('admin','operator')`)]);
export const media = sqliteTable('media', {
  id: text('id').primaryKey(), scope: text('scope').notNull(), mime: text('mime').notNull(),
  bytes: integer('bytes').notNull(), createdBy: text('created_by').notNull(), createdAt: text('created_at').notNull(),
});
export const workers = sqliteTable('workers', {
  id: text('id').primaryKey(), scope: text('scope').notNull(), name: text('name').notNull(), phone: text('phone').notNull().default(''),
  dailyWage: integer('daily_wage').notNull(), openingBalance: integer('opening_balance').notNull().default(0),
  photoKey: text('photo_key').references(() => media.id), samplePhoto: integer('sample_photo'),
  active: integer('active').notNull().default(1), version: integer('version').notNull().default(1),
}, t => [index('workers_scope').on(t.scope,t.active), check('workers_wage', sql`${t.dailyWage} > 0 AND ${t.dailyWage} <= 10000000 AND ${t.dailyWage} % 100 = 0`), check('workers_scope_check', sql`${t.scope} IN ('demo','live')`)]);
export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(), scope: text('scope').notNull(), name: text('name').notNull(), owner: text('owner').notNull(), address: text('address').notNull(),
  color: text('color').notNull(), photoKey: text('photo_key').references(() => media.id), active: integer('active').notNull().default(1), version: integer('version').notNull().default(1),
}, t => [index('sites_scope').on(t.scope,t.active), check('sites_scope_check', sql`${t.scope} IN ('demo','live')`)]);
export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey(), scope: text('scope').notNull(), workerId: text('worker_id').notNull().references(() => workers.id), date: text('date').notNull(),
  amSiteId: text('am_site_id').references(() => sites.id), pmSiteId: text('pm_site_id').references(() => sites.id),
  amWage: integer('am_wage').notNull().default(0), pmWage: integer('pm_wage').notNull().default(0),
  version: integer('version').notNull().default(0), lastOperation: text('last_operation'), updatedBy: text('updated_by').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('attendance_worker_date').on(t.workerId,t.date), index('attendance_scope_date').on(t.scope,t.date),
  check('attendance_am',sql`(${t.amSiteId} IS NULL AND ${t.amWage} = 0) OR (${t.amSiteId} IS NOT NULL AND ${t.amWage} > 0)`),
  check('attendance_pm',sql`(${t.pmSiteId} IS NULL AND ${t.pmWage} = 0) OR (${t.pmSiteId} IS NOT NULL AND ${t.pmWage} > 0)`)]);
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(), scope: text('scope').notNull(), workerId: text('worker_id').notNull().references(() => workers.id),
  amount: integer('amount').notNull(), kind: text('kind').notNull(), date: text('date').notNull(), method: text('method').notNull(),
  notes: text('notes').notNull().default(''), reversalOf: text('reversal_of'), createdBy: text('created_by').notNull(), createdAt: text('created_at').notNull(),
}, t => [index('payments_scope_date').on(t.scope,t.date), index('payments_worker').on(t.workerId), uniqueIndex('payments_one_reversal').on(t.reversalOf),
  check('payments_amount',sql`${t.amount} > 0 AND ${t.amount} <= 100000000`), check('payments_kind',sql`${t.kind} IN ('payment','advance','reversal')`)]);
export const audit = sqliteTable('audit', {
  seq: integer('seq').primaryKey({autoIncrement:true}), id: text('id').notNull(), scope: text('scope').notNull(),
  entity: text('entity').notNull(), entityId: text('entity_id').notNull(), actor: text('actor').notNull(),
  payloadHash: text('payload_hash').notNull(), payload: text('payload').notNull(), createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('audit_idempotency').on(t.id), index('audit_scope_seq').on(t.scope,t.seq)]);
