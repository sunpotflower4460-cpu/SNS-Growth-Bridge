import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isContractValidationError } from './errors.js';
import type { ContractValidationError } from './errors.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export function fixturesDirectory(): string {
  return fixturesRoot;
}

export function listJsonFixtures(kind: 'positive' | 'negative'): string[] {
  return readdirSync(join(fixturesRoot, kind))
    .filter((name) => name.endsWith('.json'))
    .sort();
}

export function loadJsonFixture(kind: 'positive' | 'negative', filename: string): unknown {
  const text = readFileSync(join(fixturesRoot, kind, filename), 'utf8');
  return parseUnknownJson(text);
}

export function expectContractError(run: () => unknown): ContractValidationError {
  try {
    run();
  } catch (error) {
    if (isContractValidationError(error)) {
      return error;
    }
    throw error;
  }
  throw new Error('expected ContractValidationError');
}

function parseUnknownJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}
