import { PACKAGE_NAME as adaptersMySnsName, PACKAGE_PHASE as adaptersMySnsPhase } from '@sns-growth-bridge/adapters-my-sns';
import { PACKAGE_NAME as adaptersSnsAiName, PACKAGE_PHASE as adaptersSnsAiPhase } from '@sns-growth-bridge/adapters-sns-ai';
import { PACKAGE_NAME as contractsName, PACKAGE_PHASE as contractsPhase } from '@sns-growth-bridge/contracts';
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
    expect(PACKAGE_NAME).toBe('@sns-growth-bridge/testing');
  });

  it('records implemented package phases; adapters and testing remain Phase 1 skeletons', () => {
    expect(contractsPhase).toBe(2);
    expect(scoringPhase).toBe(3);
    expect(strategyPhase).toBe(4);
    expect(adaptersMySnsPhase).toBe(1);
    expect(adaptersSnsAiPhase).toBe(1);
    expect(PACKAGE_PHASE).toBe(1);
  });

  it('lists the expected workspace package names', () => {
    expect(WORKSPACE_PACKAGE_NAMES).toEqual([
      '@sns-growth-bridge/contracts',
      '@sns-growth-bridge/scoring',
      '@sns-growth-bridge/strategy',
      '@sns-growth-bridge/adapters-my-sns',
      '@sns-growth-bridge/adapters-sns-ai',
      '@sns-growth-bridge/testing',
    ]);
  });
});
