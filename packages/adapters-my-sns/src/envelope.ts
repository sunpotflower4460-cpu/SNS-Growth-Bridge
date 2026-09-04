import { CURRENT_SCHEMA_VERSION, type EnvelopeMeta } from '@sns-growth-bridge/contracts';

import type { MySnsAdapterContext } from './source-types.js';

export function buildMySnsEnvelope(context: MySnsAdapterContext): EnvelopeMeta {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    producer: 'my-sns',
    producedAt: context.producedAt,
    traceId: context.traceId,
  };
}
