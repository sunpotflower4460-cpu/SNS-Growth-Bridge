/**
 * Minimal My-SNS-shaped DTOs for Phase 5.
 * Fields follow current My-SNS `src/lib/domain/types.ts` at
 * cafde5995b80e9054fb4780a10e02db9c3c033ff. Not a copy of the full domain.
 */

export interface MySnsAdapterContext {
  producedAt: string;
  traceId: string;
}

export interface MySnsBrandProfileSource {
  id: string;
  workspaceId: string;
  name: string;
  /** Present on My-SNS; Canonical CreatorProfileSnapshot has no matching field. */
  description?: string;
  audience?: string;
  voiceTraits: string[];
  values: string[];
  preferredTerms: string[];
  avoidedTerms: string[];
  defaultCallToAction?: string;
  language: string;
  updatedAt: string;
}

export interface MySnsDraftContentSource {
  title?: string | null;
  body: string;
  hashtags?: string[] | null;
  cta?: string | null;
}

export interface MySnsDraftRevisionSource {
  id: string;
  workspaceId: string;
  seedId: string;
  socialDraftId: string;
  aiGenerationId?: string;
  channel: string;
  title?: string;
  body: string;
  hashtags: string[];
  cta?: string;
  source: 'template' | 'ai';
  createdAt: string;
  aiOriginalSnapshot?: MySnsDraftContentSource;
}

export interface MySnsPublishJobSource {
  id: string;
  workspaceId: string;
  seedId: string;
  draftId: string;
  revisionId: string;
  channel: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  publishedAt?: string;
  /** Must never be copied onto Canonical `subject.accountId`. */
  socialAccountId?: string;
}

export interface MySnsPublishAttemptSource {
  id: string;
  workspaceId: string;
  publishJobId: string;
  attemptNumber: number;
  status: 'success' | 'failed';
  externalPostId?: string;
  externalUrl?: string;
  createdAt: string;
}

export interface MySnsPublishedPostInput {
  job: MySnsPublishJobSource;
  attempts: readonly MySnsPublishAttemptSource[];
  revision?: MySnsDraftRevisionSource;
}
