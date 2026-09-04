import type {
  SnsAiAdapterContext,
  SnsAiFeedbackSource,
  SnsAiHistorySource,
  SnsAiMetricSource,
} from './source-types.js';

export const CONTEXT: SnsAiAdapterContext = {
  producedAt: '2026-09-04T00:00:00.000Z',
  traceId: 'trace_sns_ai_adapter',
};

export function historyRow(over: Partial<SnsAiHistorySource> = {}): SnsAiHistorySource {
  return {
    at: '2026-09-03T08:00:00.000Z',
    account: 'music-tools-x',
    providerPostId: 'ext_x_1',
    platform: 'x',
    status: 'published',
    text: 'Synthetic published post',
    features: { topic: 'music', hook: 'question' },
    mediaUrl: null,
    ...over,
  };
}

export function metricRow(over: Partial<SnsAiMetricSource> = {}): SnsAiMetricSource {
  return {
    collectedAt: '2026-09-04T08:00:00.000Z',
    account: 'music-tools-x',
    providerPostId: 'ext_x_1',
    platform: 'x',
    checkpointMinutes: 1440,
    metrics: {
      impressions: 2000,
      likes: 10,
      reposts: 20,
      quotes: 4,
      bookmarks: 30,
      replies: 8,
      profileClicks: 40,
      urlClicks: 16,
    },
    ...over,
  };
}

export function feedbackRow(over: Partial<SnsAiFeedbackSource> = {}): SnsAiFeedbackSource {
  return {
    at: '2026-09-03T12:00:00.000Z',
    account: 'music-tools-x',
    action: 'prefer',
    note: 'Keep the late-night tone',
    dimension: 'topic',
    value: 'music',
    source: 'human',
    active: true,
    ...over,
  };
}
