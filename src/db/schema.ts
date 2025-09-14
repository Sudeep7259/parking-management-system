import { sqliteTable, integer, text, real, unique } from 'drizzle-orm/sqlite-core';



// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// Parking marketplace tables
export const userRoles = sqliteTable('user_roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueUserRole: unique().on(table.userId, table.role)
}));

export const parkingLocations = sqliteTable('parking_locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerUserId: text('owner_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  pincode: text('pincode'),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  photos: text('photos', { mode: 'json' }),
  totalSlots: integer('total_slots').notNull().default(1),
  availableSlots: integer('available_slots').notNull().default(1),
  pricingMode: text('pricing_mode').notNull().default('hourly'),
  basePricePerHourPaise: integer('base_price_per_hour_paise').notNull().default(1000),
  slabJson: text('slab_json', { mode: 'json' }),
  approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
  approvedBy: text('approved_by').references(() => user.id),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const reservations = sqliteTable('reservations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  locationId: integer('location_id').notNull().references(() => parkingLocations.id, { onDelete: 'cascade' }),
  customerUserId: text('customer_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  vehicleNumber: text('vehicle_number'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  pricePaise: integer('price_paise').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reservationId: integer('reservation_id').notNull().references(() => reservations.id, { onDelete: 'cascade' }),
  amountPaise: integer('amount_paise').notNull(),
  paymentMethod: text('payment_method').notNull().default('upi'),
  upiVpa: text('upi_vpa'),
  upiTxnId: text('upi_txn_id'),
  qrPayload: text('qr_payload'),
  status: text('status').notNull().default('initiated'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});