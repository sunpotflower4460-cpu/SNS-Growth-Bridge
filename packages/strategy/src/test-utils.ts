import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const goldenRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'golden');

export function loadGolden(name: string): unknown {
  const text = readFileSync(join(goldenRoot, `${name}.json`), 'utf8');
  return JSON.parse(text) as unknown;
}

export const GOLDEN_NAMES = [
  'no-samples',
  'one-sample',
  'normal-multi-sample',
  'strategy-window-exclusion',
  'wrong-account-exclusion',
  'missing-external-post-id-exclusion',
  'latest-snapshot-selection',
  'immature-latest-exclusion',
  'mature-snapshot-inclusion',
  'latest-then-immature-drops-post',
  'same-feature-grouped',
  'min-samples-filter',
  'preferred-positive-lift',
  'avoid-negative-lift',
  'zero-lift-excluded',
  'preferred-cap-8',
  'avoid-cap-6',
  'feature-confidence-n-over-6',
  'overall-score-rounding',
  'strategy-confidence-sample-size-over-20',
  'custom-full-confidence-posts',
  'custom-explore-rate',
  'custom-strategy-window-days',
  'custom-mature-checkpoint-minutes',
  'posting-hour-asia-tokyo',
  'custom-timezone',
  'media-decision-existing-preserved',
  'media-decision-fallback-library',
  'media-decision-fallback-none',
  'score-weight-override',
  'tie-stable-sort',
  'history-map-overwrite',
  'scoring-peers-are-window-snapshots',
] as const;
