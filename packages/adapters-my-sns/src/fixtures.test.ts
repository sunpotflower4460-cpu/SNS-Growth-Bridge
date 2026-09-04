import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { adaptMySnsBrandProfile } from './brand-profile.js';
import { adaptMySnsDraftRevisionToHumanCorrection } from './correction.js';
import { adaptMySnsPublishedPost } from './published-post.js';
import { AdapterReason } from './result.js';
import type {
  MySnsAdapterContext,
  MySnsBrandProfileSource,
  MySnsDraftRevisionSource,
  MySnsPublishedPostInput,
} from './source-types.js';
import { MY_SNS_METRIC_SNAPSHOT_STATUS } from './version.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

const FORBIDDEN_OUTPUT = /storagePath|access_token|refresh_token|api_key|webhook_secret|BEGIN RSA PRIVATE KEY|sk_live_|ghp_[A-Za-z0-9]{20,}/i;

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

describe('sanitized adapter fixtures', () => {
  it('contain no secret-like strings', () => {
    const files = walkFiles(fixturesRoot).filter((path) => path.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(SECRET_VALUE_PATTERN.test(text), file).toBe(false);
    }
  });

  it('maps the positive BrandProfile fixture', () => {
    const fixture = loadJson('positive/brand-profile-normal.json') as {
      context: MySnsAdapterContext;
      source: MySnsBrandProfileSource;
    };
    const result = adaptMySnsBrandProfile(fixture.source, fixture.context);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.hardRules).toEqual([]);
    expect(JSON.stringify(result.value)).not.toMatch(FORBIDDEN_OUTPUT);
  });

  it('maps the positive correction fixture', () => {
    const fixture = loadJson('positive/correction-body-edited.json') as {
      context: MySnsAdapterContext;
      source: MySnsDraftRevisionSource;
    };
    const result = adaptMySnsDraftRevisionToHumanCorrection(fixture.source, fixture.context);
    expect(result.status).toBe('mapped');
  });

  it('maps API publish and manual publish without externalPostId', () => {
    const api = loadJson('positive/published-api-success.json') as {
      context: MySnsAdapterContext;
    } & MySnsPublishedPostInput;
    const manual = loadJson('positive/published-manual-no-external-id.json') as {
      context: MySnsAdapterContext;
    } & MySnsPublishedPostInput;
    const apiResult = adaptMySnsPublishedPost(api, api.context);
    const manualResult = adaptMySnsPublishedPost(manual, manual.context);
    expect(apiResult.status).toBe('mapped');
    expect(manualResult.status).toBe('mapped');
    if (apiResult.status === 'mapped') {
      expect(apiResult.value.externalPostId).toBe('ext_123');
      expect(JSON.stringify(apiResult.value)).not.toMatch(FORBIDDEN_OUTPUT);
      expect(apiResult.value.media).toEqual([]);
    }
    if (manualResult.status === 'mapped') {
      expect(manualResult.value.externalPostId).toBeUndefined();
      expect(manualResult.value.platform).toBe('note');
    }
  });

  it('skips unedited approval and scheduled jobs from fixtures', () => {
    const unedited = loadJson('skipped/correction-unedited.json') as {
      context: MySnsAdapterContext;
      source: MySnsDraftRevisionSource;
    };
    const scheduled = loadJson('skipped/published-scheduled.json') as {
      context: MySnsAdapterContext;
    } & MySnsPublishedPostInput;
    expect(adaptMySnsDraftRevisionToHumanCorrection(unedited.source, unedited.context)).toEqual({
      status: 'not-applicable',
      reason: AdapterReason.uneditedApproval,
    });
    expect(adaptMySnsPublishedPost(scheduled, scheduled.context)).toEqual({
      status: 'not-applicable',
      reason: AdapterReason.jobNotPublished,
    });
  });

  it('blocks cross-workspace and missing publishedAt fixtures', () => {
    const cross = loadJson('negative/published-cross-workspace.json') as {
      context: MySnsAdapterContext;
    } & MySnsPublishedPostInput;
    const missing = loadJson('negative/published-missing-published-at.json') as {
      context: MySnsAdapterContext;
    } & MySnsPublishedPostInput;
    expect(adaptMySnsPublishedPost(cross, cross.context)).toEqual({
      status: 'blocked',
      reason: AdapterReason.crossWorkspace,
    });
    expect(adaptMySnsPublishedPost(missing, missing.context)).toEqual({
      status: 'blocked',
      reason: AdapterReason.missingPublishedAt,
    });
  });
});

describe('MetricSnapshot', () => {
  it('is blocked and not implemented for My-SNS', () => {
    expect(MY_SNS_METRIC_SNAPSHOT_STATUS).toBe('blocked');
  });
});
