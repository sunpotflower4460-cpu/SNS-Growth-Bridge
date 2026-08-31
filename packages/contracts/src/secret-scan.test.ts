import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { fixturesDirectory } from './test-utils.js';

const SECRET_VALUE_PATTERN =
  /sk_live_|sk_test_|ghp_[A-Za-z0-9]{20,}|github_pat_|xox[baprs]-|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./i;

const SECRET_KEY_PATTERN = /^(access_token|refresh_token|api_key|apikey|client_secret|webhook_secret)$/i;

const SECRET_KEY_IN_TEXT = /"(?:access_token|refresh_token|api_key|client_secret|webhook_secret)"\s*:/i;

function walkFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function secretKeysInJson(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => secretKeysInJson(item, `${path}[${String(index)}]`));
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const hits: string[] = [];
    for (const key of Object.keys(record)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        hits.push(`${path}.${key}`);
      }
      hits.push(...secretKeysInJson(record[key], `${path}.${key}`));
    }
    return hits;
  }
  return [];
}

function parseUnknownJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

function fixtureLooksSecret(text: string): boolean {
  if (SECRET_VALUE_PATTERN.test(text) || SECRET_KEY_IN_TEXT.test(text)) {
    return true;
  }
  try {
    return secretKeysInJson(parseUnknownJson(text)).length > 0;
  } catch {
    return true;
  }
}

describe('contract fixture secret scan', () => {
  it('contains no secret-like strings or credential keys', () => {
    const files = walkFiles(fixturesDirectory()).filter((path) => path.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(fixtureLooksSecret(text), file).toBe(false);
    }
  });

  it('detects quoted JSON credential keys', () => {
    expect(fixtureLooksSecret('{"access_token":"not-a-real-secret"}')).toBe(true);
    expect(fixtureLooksSecret('{"refresh_token":"not-a-real-secret"}')).toBe(true);
    expect(fixtureLooksSecret('{"workspaceId":"ws_fixture_1"}')).toBe(false);
  });
});
