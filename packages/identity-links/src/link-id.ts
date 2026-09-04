import { createHash } from 'node:crypto';

import type { Platform } from '@sns-growth-bridge/contracts';

export function accountLinkId(input: {
  workspaceId: string;
  socialAccountId: string;
  snsAiAccountId: string;
  platform: Platform;
}): string {
  const digest = createHash('sha256')
    .update(
      `${input.workspaceId}\0${input.socialAccountId}\0${input.snsAiAccountId}\0${input.platform}`,
      'utf8',
    )
    .digest('hex');
  return `bridge-account-link:${digest}`;
}
