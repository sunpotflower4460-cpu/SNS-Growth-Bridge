import type {
  MySnsAdapterContext,
  MySnsBrandProfileSource,
  MySnsDraftRevisionSource,
  MySnsPublishAttemptSource,
  MySnsPublishJobSource,
} from './source-types.js';

export const CONTEXT: MySnsAdapterContext = {
  producedAt: '2026-09-04T00:00:00.000Z',
  traceId: 'trace_adapter_fixture',
};

export function brandProfile(over: Partial<MySnsBrandProfileSource> = {}): MySnsBrandProfileSource {
  return {
    id: 'bp_123',
    workspaceId: 'ws_fixture_1',
    name: 'Aquarium Studio',
    description: 'This description must not appear on Canonical output.',
    audience: 'listeners who like late-night experiments',
    voiceTraits: ['calm', 'first-person'],
    values: ['honesty'],
    preferredTerms: ['listen'],
    avoidedTerms: ['buy now'],
    defaultCallToAction: 'よかったら聴いてみてください',
    language: 'ja',
    updatedAt: '2026-09-03T10:00:00.000Z',
    ...over,
  };
}

export function revision(over: Partial<MySnsDraftRevisionSource> = {}): MySnsDraftRevisionSource {
  return {
    id: 'rev_1',
    workspaceId: 'ws_fixture_1',
    seedId: 'seed_1',
    socialDraftId: 'draft_1',
    aiGenerationId: 'gen_1',
    channel: 'x',
    title: 'Hello',
    body: 'Approved body',
    hashtags: ['music'],
    cta: 'Listen',
    source: 'ai',
    createdAt: '2026-09-02T12:00:00.000Z',
    aiOriginalSnapshot: {
      title: 'Hello',
      body: 'AI original body',
      hashtags: ['music'],
      cta: 'Listen',
    },
    ...over,
  };
}

export function job(over: Partial<MySnsPublishJobSource> = {}): MySnsPublishJobSource {
  return {
    id: 'job_1',
    workspaceId: 'ws_fixture_1',
    seedId: 'seed_1',
    draftId: 'draft_1',
    revisionId: 'rev_1',
    channel: 'x',
    status: 'published',
    publishedAt: '2026-09-03T08:00:00.000Z',
    socialAccountId: 'social_acct_should_not_map',
    ...over,
  };
}

export function attempt(over: Partial<MySnsPublishAttemptSource> = {}): MySnsPublishAttemptSource {
  return {
    id: 'att_1',
    workspaceId: 'ws_fixture_1',
    publishJobId: 'job_1',
    attemptNumber: 1,
    status: 'success',
    externalPostId: 'ext_123',
    externalUrl: 'https://example.invalid/status/ext_123',
    createdAt: '2026-09-03T08:00:00.000Z',
    ...over,
  };
}

export function publishedRevision(over: Partial<MySnsDraftRevisionSource> = {}): MySnsDraftRevisionSource {
  return revision({
    body: 'Published body only',
    aiOriginalSnapshot: undefined,
    ...over,
  });
}
