import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const homeUserProfiles = pgTable('home_user_profiles', {
  userId: uuid('user_id').primaryKey(),
  interestTopics: text('interest_topics').notNull(),
  channelDescription: text('channel_description').notNull(),
  ownChannelUrl: text('own_channel_url'),
  referenceChannelUrls: jsonb('reference_channel_urls')
    .$type<string[]>()
    .notNull()
    .default([]),
  excludedTopics: jsonb('excluded_topics').$type<string[]>().notNull().default([]),
  preferredRegionCode: text('preferred_region_code').notNull().default('KR'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const keywordIdeaRuns = pgTable(
  'keyword_idea_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    profileSnapshot: jsonb('profile_snapshot').notNull(),
    provider: text('provider').notNull(),
    status: text('status').notNull().default('completed'),
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index('keyword_idea_runs_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const userKeywordProbes = pgTable(
  'user_keyword_probes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    generationRunId: uuid('generation_run_id').references(() => keywordIdeaRuns.id, {
      onDelete: 'set null',
    }),
    probeLabel: text('probe_label').notNull(),
    audience: text('audience').notNull(),
    seedTheme: text('seed_theme').notNull(),
    problemOrSituation: text('problem_or_situation').notNull(),
    goal: text('goal').notNull(),
    consumerStage: text('consumer_stage').notNull(),
    rationale: text('rationale').notNull(),
    suggestedKeywords: jsonb('suggested_keywords').$type<string[]>().notNull().default([]),
    status: text('status').notNull().default('draft'),
    confidence: text('confidence'),
    linkedHarvestId: uuid('linked_harvest_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userStatusIdx: index('user_keyword_probes_user_status_idx').on(
      table.userId,
      table.status,
    ),
  }),
);
