import type { Platform } from '@sns-growth-bridge/contracts';

/**
 * Minimal SNS-AI-shaped DTOs for Phase 6.
 * Fields follow current SNS-AI main at 914c70ee4666015f93603eef9a2f3dd9a1a7de08.
 */

export interface SnsAiAdapterContext {
  producedAt: string;
  traceId: string;
}

export interface SnsAiHistorySource {
  at?: string;
  account?: string;
  providerPostId?: string | number;
  platform?: string;
  status?: string;
  text?: string;
  features?: Record<string, unknown>;
  /** Truthiness only. Never copied onto Canonical output. */
  mediaUrl?: string | null;
  mediaType?: string | null;
}

export interface SnsAiHistoryAdapterInput {
  row: SnsAiHistorySource;
  /** Required when `row.platform` is absent. Never inferred from accountId. */
  platform?: Platform;
}

export interface SnsAiMetricSource {
  collectedAt?: string;
  account?: string;
  providerPostId?: string | number;
  platform?: string;
  checkpointMinutes?: number;
  metrics?: Record<string, unknown>;
}

export interface SnsAiMetricAdapterInput {
  row: SnsAiMetricSource;
  /** Required when `row.platform` is absent. Never inferred from accountId. */
  platform?: Platform;
}

export interface SnsAiFeedbackSource {
  at?: string;
  account?: string;
  action?: string;
  note?: string;
  dimension?: string | null;
  value?: string | number | null;
  /** Present on SNS-AI rows; Canonical ExplicitFeedbackEvent has no matching field. */
  source?: string;
  active?: boolean;
}
