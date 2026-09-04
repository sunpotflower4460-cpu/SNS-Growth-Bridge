import type { CrossProductAccountLink, GrowthStrategySnapshot } from '@sns-growth-bridge/contracts';
import {
  bindActiveLinkToEvidence,
  LinkReason,
  type LinkResult,
} from '@sns-growth-bridge/identity-links';
import { scoreSnapshot } from '@sns-growth-bridge/scoring';
import { buildStrategyParity, projectToGrowthStrategySnapshot } from '@sns-growth-bridge/strategy';

import type { SnsAiEvidenceBundle } from './types.js';

export function likesDoNotAffectScore(bundle: SnsAiEvidenceBundle): boolean {
  const [target, ...peers] = bundle.metrics;
  if (!target) {
    return true;
  }
  const baseline = scoreSnapshot(target, peers);
  const boosted = scoreSnapshot({ ...target, metrics: { ...target.metrics, likes: 100000 } }, peers);
  return baseline.score === boosted.score;
}

export function buildLinkedShadowStrategy(input: {
  link: CrossProductAccountLink;
  bundle: SnsAiEvidenceBundle;
  now: string;
  producedAt: string;
  traceId: string;
}): LinkResult<GrowthStrategySnapshot> {
  const binding = bindActiveLinkToEvidence(input.link, {
    accountId: input.bundle.accountId,
    platform: input.bundle.platform,
  });
  if (binding.status !== 'mapped') {
    return binding;
  }
  const bundle = buildStrategyParity({
    accountId: input.bundle.accountId,
    now: input.now,
    posts: input.bundle.strategyPosts,
    snapshots: input.bundle.metrics,
  });
  const snapshot = projectToGrowthStrategySnapshot({
    parity: bundle.parity,
    patternEvidence: bundle.patternEvidence,
    subject: binding.value.subject,
    platform: binding.value.platform,
    meta: {
      schemaVersion: 1,
      producer: 'sns-growth-bridge',
      producedAt: input.producedAt,
      traceId: input.traceId,
    },
    strategyId: `bridge-linked-strategy:${input.link.linkId}:${input.bundle.digest}`,
    inputsDigest: input.bundle.digest,
    matureCheckpointMinutes: 1440,
  });
  if (snapshot.subject.creatorId !== undefined) {
    return { status: 'blocked', reason: LinkReason.canonicalValidationFailed };
  }
  return { status: 'mapped', value: snapshot };
}
