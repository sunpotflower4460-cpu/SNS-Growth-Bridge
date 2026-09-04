import type { MySnsAccountDescriptor, OperatorAccountLinkConfig, SnsAiAccountDescriptor } from './types.js';

export const CONTEXT = {
  producedAt: '2026-09-04T00:00:00.000Z',
  traceId: 'trace_identity_link',
  confirmedAt: '2026-09-04T00:00:00.000Z',
};

export function xConfig(over: Partial<OperatorAccountLinkConfig> = {}): OperatorAccountLinkConfig {
  return {
    workspaceId: 'ws_fixture',
    socialAccountId: 'my_x_fixture',
    snsAiAccountId: 'artist-x-fixture',
    platform: 'x',
    enabled: true,
    ...over,
  };
}

export function igConfig(over: Partial<OperatorAccountLinkConfig> = {}): OperatorAccountLinkConfig {
  return {
    workspaceId: 'ws_fixture',
    socialAccountId: 'my_ig_fixture',
    snsAiAccountId: 'artist-ig-fixture',
    platform: 'instagram',
    enabled: true,
    ...over,
  };
}

export function mySnsX(over: Partial<MySnsAccountDescriptor> = {}): MySnsAccountDescriptor {
  return {
    workspaceId: 'ws_fixture',
    socialAccountId: 'my_x_fixture',
    platform: 'x',
    connected: false,
    handle: 'not-an-identity-key',
    externalAccountId: 'ext_should_not_map',
    ...over,
  };
}

export function mySnsIg(over: Partial<MySnsAccountDescriptor> = {}): MySnsAccountDescriptor {
  return {
    workspaceId: 'ws_fixture',
    socialAccountId: 'my_ig_fixture',
    platform: 'instagram',
    connected: false,
    ...over,
  };
}

export function snsAiX(over: Partial<SnsAiAccountDescriptor> = {}): SnsAiAccountDescriptor {
  return {
    accountId: 'artist-x-fixture',
    platform: 'x',
    enabled: false,
    mode: 'pause',
    ...over,
  };
}

export function snsAiIg(over: Partial<SnsAiAccountDescriptor> = {}): SnsAiAccountDescriptor {
  return {
    accountId: 'artist-ig-fixture',
    platform: 'instagram',
    enabled: false,
    mode: 'pause',
    ...over,
  };
}
