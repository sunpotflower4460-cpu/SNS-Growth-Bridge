import { describe, expect, it } from 'vitest';

import { adaptMySnsBrandProfile } from './brand-profile.js';
import { brandProfile, CONTEXT } from './test-utils.js';
import { PACKAGE_PHASE, MY_SNS_METRIC_SNAPSHOT_STATUS } from './version.js';

describe('adaptMySnsBrandProfile', () => {
  it('maps BrandProfile fields and uses workspaceId-only subject', () => {
    const result = adaptMySnsBrandProfile(brandProfile(), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.subject).toEqual({ workspaceId: 'ws_fixture_1' });
    expect(result.value.subject.creatorId).toBeUndefined();
    expect(result.value.subject.accountId).toBeUndefined();
    expect(result.value.name).toBe('Aquarium Studio');
    expect(result.value.audience).toBe('listeners who like late-night experiments');
    expect(result.value.language).toBe('ja');
    expect(result.value.voiceTraits).toEqual(['calm', 'first-person']);
    expect(result.value.values).toEqual(['honesty']);
    expect(result.value.preferredTerms).toEqual(['listen']);
    expect(result.value.avoidedTerms).toEqual(['buy now']);
    expect(result.value.defaultCallToAction).toBe('よかったら聴いてみてください');
    expect(result.value.profileVersion).toBe('my-sns:bp_123:2026-09-03T10:00:00.000Z');
    expect(result.value.meta.producer).toBe('my-sns');
    expect(result.value.meta.schemaVersion).toBe(1);
  });

  it('does not invent hardRules from preferred or avoided terms', () => {
    const result = adaptMySnsBrandProfile(brandProfile(), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.hardRules).toEqual([]);
  });

  it('does not map description onto Canonical output', () => {
    const result = adaptMySnsBrandProfile(brandProfile(), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value).not.toHaveProperty('description');
    expect(JSON.stringify(result.value)).not.toContain('This description must not appear');
  });

  it('omits optional audience when absent', () => {
    const result = adaptMySnsBrandProfile(brandProfile({ audience: undefined }), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.audience).toBeUndefined();
  });

  it('is deterministic for the same source and context', () => {
    const source = brandProfile();
    expect(adaptMySnsBrandProfile(source, CONTEXT)).toEqual(adaptMySnsBrandProfile(source, CONTEXT));
  });

  it('does not mutate input', () => {
    const source = brandProfile();
    const before = structuredClone(source);
    adaptMySnsBrandProfile(source, CONTEXT);
    expect(source).toEqual(before);
  });

  it('does not invent creatorId from any source field', () => {
    const result = adaptMySnsBrandProfile(brandProfile(), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(JSON.stringify(result.value)).not.toContain('creatorId');
  });
});

describe('package identity', () => {
  it('is Phase 5 and keeps MetricSnapshot blocked', () => {
    expect(PACKAGE_PHASE).toBe(5);
    expect(MY_SNS_METRIC_SNAPSHOT_STATUS).toBe('blocked');
  });
});
