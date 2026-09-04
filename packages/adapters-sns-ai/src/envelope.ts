import { CURRENT_SCHEMA_VERSION, type EnvelopeMeta } from '@sns-growth-bridge/contracts';

import type { SnsAiAdapterContext } from './source-types.js';

export function buildSnsAiEnvelope(context: SnsAiAdapterContext): EnvelopeMeta {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    producer: 'sns-ai',
    producedAt: context.producedAt,
    traceId: context.traceId,
  };
}
