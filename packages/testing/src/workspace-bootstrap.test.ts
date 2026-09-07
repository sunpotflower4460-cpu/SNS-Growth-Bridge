import { PACKAGE_NAME as adaptersMySnsName, PACKAGE_PHASE as adaptersMySnsPhase } from '@sns-growth-bridge/adapters-my-sns';
import { PACKAGE_NAME as adaptersSnsAiName, PACKAGE_PHASE as adaptersSnsAiPhase } from '@sns-growth-bridge/adapters-sns-ai';
import { PACKAGE_NAME as contractsName, PACKAGE_PHASE as contractsPhase } from '@sns-growth-bridge/contracts';
import { PACKAGE_NAME as identityLinksName, PACKAGE_PHASE as identityLinksPhase } from '@sns-growth-bridge/identity-links';
import { PACKAGE_NAME as runtimeTransportName, PACKAGE_PHASE as runtimeTransportPhase } from '@sns-growth-bridge/runtime-transport';
import { PACKAGE_NAME as scoringName, PACKAGE_PHASE as scoringPhase } from '@sns-growth-bridge/scoring';
import { PACKAGE_NAME as strategyName, PACKAGE_PHASE as strategyPhase } from '@sns-growth-bridge/strategy';
import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME, PACKAGE_PHASE, WORKSPACE_PACKAGE_NAMES } from './index.js';

describe('workspace bootstrap', () => {
  it('resolves every workspace package entry point', () => {
    expect(contractsName).toBe('@sns-growth-bridge/contracts');
    expect(scoringName).toBe('@sns-growth-bridge/scoring');
    expect(strategyName).toBe('@sns-growth-bridge/strategy');
    expect(adaptersMySnsName).toBe('@sns-growth-bridge/adapters-my-sns');
    expect(adaptersSnsAiName).toBe('@sns-growth-bridge/adapters-sns-ai');
    expect(identityLinksName).toBe('@sns-growth-bridge/identity-links');
    expect(runtimeTransportName).toBe('@sns-growth-bridge/runtime-transport');
    expect(PACKAGE_NAME).toBe('@sns-growth-bridge/testing');
  });

  it('records implemented package phases; testing remains a Phase 1 skeleton', () => {
    expect(contractsPhase).toBe(2);
    expect(scoringPhase).toBe(3);
    expect(strategyPhase).toBe(4);
    expect(adaptersMySnsPhase).toBe(5);
    expect(adaptersSnsAiPhase).toBe(6);
    expect(identityLinksPhase).toBe(7);
    expect(runtimeTransportPhase).toBe(7);
    expect(PACKAGE_PHASE).toBe(1);
  });

  it('lists the expected workspace package names', () => {
    expect(WORKSPACE_PACKAGE_NAMES).toEqual([
      '@sns-growth-bridge/contracts',
      '@sns-growth-bridge/scoring',
      '@sns-growth-bridge/strategy',
      '@sns-growth-bridge/adapters-my-sns',
      '@sns-growth-bridge/adapters-sns-ai',
      '@sns-growth-bridge/identity-links',
      '@sns-growth-bridge/runtime-transport',
      '@sns-growth-bridge/testing',
    ]);
  });
});
