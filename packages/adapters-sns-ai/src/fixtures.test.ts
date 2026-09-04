import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { adaptSnsAiHumanFeedback } from './feedback.js';
import { adaptSnsAiHistoryToPublishedPost } from './history.js';
import { adaptSnsAiMetricSnapshot } from './metric.js';
import { AdapterReason } from './result.js';
import type {
  SnsAiAdapterContext,
  SnsAiFeedbackSource,
  SnsAiHistorySource,
  SnsAiMetricSource,
} from './source-types.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

const FORBIDDEN_OUTPUT =
  /storagePath|signedUrl|privateStorage|privateUrl|X-Amz-Signature|access_token|refresh_token|api_key|webhook_secret|BEGIN RSA PRIVATE KEY|sk_live_|ghp_[A-Za-z0-9]{20,}/i;

const SECRET_VALUE_PATTERN =
  /sk_live_|sk_test_|ghp_[A-Za-z0-9]{20,}|github_pat_|xox[baprs]-|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./i;

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walkFiles(full) : [full];
  });
}

function loadJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(fixturesRoot, relativePath), 'utf8')) as unknown;
}

describe('sanitized SNS-AI adapter fixtures', () => {
  it('contain no secret-like strings', () => {
    const files = walkFiles(fixturesRoot).filter((path) => path.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(SECRET_VALUE_PATTERN.test(text), file).toBe(false);
    }
  });

  it('maps positive history, metric, and feedback fixtures', () => {
    const history = loadJson('positive/history-published-x.json') as {
      context: SnsAiAdapterContext;
      row: SnsAiHistorySource;
    };
    const ig = loadJson('positive/history-published-instagram.json') as {
      context: SnsAiAdapterContext;
      row: SnsAiHistorySource;
    };
    const metric = loadJson('positive/metric-x-1h.json') as {
      context: SnsAiAdapterContext;
      row: SnsAiMetricSource;
    };
    const igMetric = loadJson('positive/metric-instagram.json') as {
      context: SnsAiAdapterContext;
      row: SnsAiMetricSource;
    };
    const feedback = loadJson('positive/feedback-prefer.json') as {
      context: SnsAiAdapterContext;
      source: SnsAiFeedbackSource;
    };
    const published = adaptSnsAiHistoryToPublishedPost({ row: history.row }, history.context);
    const igPublished = adaptSnsAiHistoryToPublishedPost({ row: ig.row }, ig.context);
    const mappedMetric = adaptSnsAiMetricSnapshot({ row: metric.row }, metric.context);
    const mappedIgMetric = adaptSnsAiMetricSnapshot({ row: igMetric.row }, igMetric.context);
    const mappedFeedback = adaptSnsAiHumanFeedback(feedback.source, feedback.context);
    expect(published.status).toBe('mapped');
    expect(igPublished.status).toBe('mapped');
    expect(mappedMetric.status).toBe('mapped');
    expect(mappedIgMetric.status).toBe('mapped');
    expect(mappedFeedback.status).toBe('mapped');
    if (published.status === 'mapped') {
      expect(JSON.stringify(published.value)).not.toMatch(FORBIDDEN_OUTPUT);
      expect(published.value.media).toEqual([]);
    }
    if (mappedMetric.status === 'mapped') {
      expect(mappedMetric.value.checkpointMinutes).toBe(60);
      expect(mappedMetric.value.metrics.likes).toBe(2);
    }
    if (mappedFeedback.status === 'mapped') {
      expect(mappedFeedback.value.action).toBe('prefer');
      expect(mappedFeedback.value).not.toHaveProperty('source');
    }
  });

  it('skips unpublished and missing providerPostId fixtures', () => {
    const missing = loadJson('skipped/history-missing-provider-post-id.json') as {
      context: SnsAiAdapterContext;
      row: SnsAiHistorySource;
    };
    const unpublished = loadJson('skipped/history-not-published.json') as {
      context: SnsAiAdapterContext;
      row: SnsAiHistorySource;
    };
    expect(adaptSnsAiHistoryToPublishedPost({ row: missing.row }, missing.context)).toEqual({
      status: 'not-applicable',
      reason: AdapterReason.missingProviderPostId,
    });
    expect(adaptSnsAiHistoryToPublishedPost({ row: unpublished.row }, unpublished.context)).toEqual({
      status: 'not-applicable',
      reason: AdapterReason.notPublished,
    });
  });

  it('blocks empty account, negative metrics, and unknown feedback dimension fixtures', () => {
    const emptyAccount = loadJson('negative/history-empty-account.json') as {
      context: SnsAiAdapterContext;
      row: SnsAiHistorySource;
    };
    const negative = loadJson('negative/metric-negative-count.json') as {
      context: SnsAiAdapterContext;
      row: SnsAiMetricSource;
    };
    const unknownDim = loadJson('negative/feedback-unknown-dimension.json') as {
      context: SnsAiAdapterContext;
      source: SnsAiFeedbackSource;
    };
    expect(adaptSnsAiHistoryToPublishedPost({ row: emptyAccount.row }, emptyAccount.context)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceIdentity}: account`,
    });
    expect(adaptSnsAiMetricSnapshot({ row: negative.row }, negative.context)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidMetric}: impressions`,
    });
    expect(adaptSnsAiHumanFeedback(unknownDim.source, unknownDim.context)).toEqual({
      status: 'blocked',
      reason: AdapterReason.unknownFeedbackDimension,
    });
  });
});
