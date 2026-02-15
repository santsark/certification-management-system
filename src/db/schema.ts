import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, index, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'mandate_owner', 'attester']);
export const mandateStatusEnum = pgEnum('mandate_status', ['open', 'closed']);
export const certificationStatusEnum = pgEnum('certification_status', ['draft', 'open', 'closed']);
export const attestationStatusEnum = pgEnum('attestation_status', ['in_progress', 'submitted']);

// Users Table
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull(),
    mustChangePassword: boolean('must_change_password').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Mandates Table
export const mandates = pgTable('mandates', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    ownerId: uuid('owner_id').references(() => users.id).notNull(),
    backupOwnerId: uuid('backup_owner_id').references(() => users.id),
    status: mandateStatusEnum('status').default('open').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    ownerIdIdx: index('mandates_owner_id_idx').on(table.ownerId),
    backupOwnerIdIdx: index('mandates_backup_owner_id_idx').on(table.backupOwnerId),
}));

// Sessions Table
export const sessions = pgTable('sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

// Certifications Table
export const certifications = pgTable('certifications', {
    id: uuid('id').defaultRandom().primaryKey(),
    mandateId: uuid('mandate_id')
        .references(() => mandates.id, { onDelete: 'cascade' })
        .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: certificationStatusEnum('status').default('draft').notNull(),
    questions: jsonb('questions').notNull(),
    createdBy: uuid('created_by')
        .references(() => users.id)
        .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    publishedAt: timestamp('published_at'),
    closedAt: timestamp('closed_at'),
}, (table) => ({
    mandateIdIdx: index('certifications_mandate_id_idx').on(table.mandateId),
    createdByIdx: index('certifications_created_by_idx').on(table.createdBy),
    statusIdx: index('certifications_status_idx').on(table.status),
}));

// Certification Assignments Table
export const certificationAssignments = pgTable('certification_assignments', {
    id: uuid('id').defaultRandom().primaryKey(),
    certificationId: uuid('certification_id')
        .references(() => certifications.id, { onDelete: 'cascade' })
        .notNull(),
    attesterId: uuid('attester_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
}, (table) => ({
    certificationIdIdx: index('cert_assignments_certification_id_idx').on(table.certificationId),
    attesterIdIdx: index('cert_assignments_attester_id_idx').on(table.attesterId),
    uniqueAssignment: unique('unique_certification_attester').on(table.certificationId, table.attesterId),
}));

// Attestation Responses Table
export const attestationResponses = pgTable('attestation_responses', {
    id: uuid('id').defaultRandom().primaryKey(),
    certificationId: uuid('certification_id')
        .references(() => certifications.id, { onDelete: 'cascade' })
        .notNull(),
    attesterId: uuid('attester_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    responses: jsonb('responses').notNull(),
    status: attestationStatusEnum('status').default('in_progress').notNull(),
    lastSavedAt: timestamp('last_saved_at').defaultNow().notNull(),
    submittedAt: timestamp('submitted_at'),
}, (table) => ({
    certificationIdIdx: index('attestation_responses_certification_id_idx').on(table.certificationId),
    attesterIdIdx: index('attestation_responses_attester_id_idx').on(table.attesterId),
    statusIdx: index('attestation_responses_status_idx').on(table.status),
    uniqueResponse: unique('unique_certification_attester_response').on(table.certificationId, table.attesterId),
}));

// Notifications Table
export const notifications = pgTable('notifications', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    link: varchar('link', { length: 255 }),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    readIdx: index('notifications_read_idx').on(table.read),
    userReadCreatedIdx: index('notifications_user_read_created_idx').on(table.userId, table.read, table.createdAt),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    ownedMandates: many(mandates, { relationName: 'owner' }),
    backupMandates: many(mandates, { relationName: 'backupOwner' }),
    sessions: many(sessions),
    createdCertifications: many(certifications),
    certificationAssignments: many(certificationAssignments),
    attestationResponses: many(attestationResponses),
    notifications: many(notifications),
}));

export const mandatesRelations = relations(mandates, ({ one, many }) => ({
    owner: one(users, {
        fields: [mandates.ownerId],
        references: [users.id],
        relationName: 'owner',
    }),
    backupOwner: one(users, {
        fields: [mandates.backupOwnerId],
        references: [users.id],
        relationName: 'backupOwner',
    }),
    certifications: many(certifications),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const certificationsRelations = relations(certifications, ({ one, many }) => ({
    mandate: one(mandates, {
        fields: [certifications.mandateId],
        references: [mandates.id],
    }),
    creator: one(users, {
        fields: [certifications.createdBy],
        references: [users.id],
    }),
    assignments: many(certificationAssignments),
    responses: many(attestationResponses),
}));

export const certificationAssignmentsRelations = relations(certificationAssignments, ({ one }) => ({
    certification: one(certifications, {
        fields: [certificationAssignments.certificationId],
        references: [certifications.id],
    }),
    attester: one(users, {
        fields: [certificationAssignments.attesterId],
        references: [users.id],
    }),
}));

export const attestationResponsesRelations = relations(attestationResponses, ({ one }) => ({
    certification: one(certifications, {
        fields: [attestationResponses.certificationId],
        references: [certifications.id],
    }),
    attester: one(users, {
        fields: [attestationResponses.attesterId],
        references: [users.id],
    }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Mandate = typeof mandates.$inferSelect;
export type NewMandate = typeof mandates.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Certification = typeof certifications.$inferSelect;
export type NewCertification = typeof certifications.$inferInsert;
export type CertificationAssignment = typeof certificationAssignments.$inferSelect;
export type NewCertificationAssignment = typeof certificationAssignments.$inferInsert;
export type AttestationResponse = typeof attestationResponses.$inferSelect;
export type NewAttestationResponse = typeof attestationResponses.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// JSONB Types
export type QuestionType = 'yes_no' | 'dropdown' | 'multiple_choice' | 'text' | 'date';

export interface CertificationQuestion {
    id: string;
    question: string;
    type: QuestionType;
    options?: string[];
    allow_comments?: boolean;
    required: boolean;
}

export interface AttestationAnswer {
    question_id: string;
    answer: boolean | string | string[];
    comments?: string;
}
