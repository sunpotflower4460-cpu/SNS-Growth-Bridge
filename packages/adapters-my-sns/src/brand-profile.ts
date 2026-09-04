import {
  isContractValidationError,
  parseCreatorProfileSnapshot,
  type CreatorProfileSnapshot,
} from '@sns-growth-bridge/contracts';

import { buildMySnsEnvelope } from './envelope.js';
import { copyStringArray } from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import {
  blockedInvalidSourceDatetime,
  blockedInvalidSourceIdentity,
  isIsoDateTimeSource,
  isNonEmptySourceId,
} from './source-identity.js';
import type { MySnsAdapterContext, MySnsBrandProfileSource } from './source-types.js';

export function adaptMySnsBrandProfile(
  source: MySnsBrandProfileSource,
  context: MySnsAdapterContext,
): AdapterResult<CreatorProfileSnapshot> {
  if (!isNonEmptySourceId(source.id)) {
    return blockedInvalidSourceIdentity('BrandProfile.id');
  }
  if (!isIsoDateTimeSource(source.updatedAt)) {
    return blockedInvalidSourceDatetime('BrandProfile.updatedAt');
  }
  try {
    const value = parseCreatorProfileSnapshot({
      meta: buildMySnsEnvelope(context),
      subject: { workspaceId: source.workspaceId },
      profileVersion: `my-sns:${source.id}:${source.updatedAt}`,
      name: source.name,
      audience: source.audience,
      language: source.language,
      voiceTraits: copyStringArray(source.voiceTraits),
      values: copyStringArray(source.values),
      preferredTerms: copyStringArray(source.preferredTerms),
      avoidedTerms: copyStringArray(source.avoidedTerms),
      defaultCallToAction: source.defaultCallToAction,
      hardRules: [],
    });
    return { status: 'mapped', value };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${AdapterReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
