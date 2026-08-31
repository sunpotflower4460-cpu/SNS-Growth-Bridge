/**
 * Canonical contract schema major.
 *
 * Why 1 (and not continuing the design-draft required-creatorId shape):
 * the pre-implementation `docs/CONTRACTS.md` required `creatorId` / `workspaceId`
 * / `accountId` as separate fields, but Phase 0 proved neither source repository
 * has a first-class `creatorId`. That requiredness change is a semantic break
 * versus the draft. This is also the first *runtime-validated* schema, so there
 * are no v0 consumers to keep compatible.
 *
 * Policy:
 * - `schemaVersion` is the integer major version.
 * - This package accepts only `CURRENT_SCHEMA_VERSION`.
 * - Unsupported majors fail closed (no coercion).
 * - Additive optional fields within a major: writers should only emit known
 *   fields; this parser strips unknown keys (does not store them) so a newer
 *   writer of the same major does not crash an older reader.
 * - Renames, requiredness changes, enum narrowing, and identity-model changes
 *   require a new major.
 */
export const CURRENT_SCHEMA_VERSION = 1 as const;

export const SUPPORTED_SCHEMA_VERSIONS = [CURRENT_SCHEMA_VERSION] as const;
