import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { fixturesDirectory } from './test-utils.js';

const SECRET_PATTERN =
  /sk_live_|sk_test_|ghp_[A-Za-z0-9]{20,}|github_pat_|xox[baprs]-|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|refresh_token\s*[:=]|access_token\s*[:=]|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./i;

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

describe('contract fixture secret scan', () => {
  it('contains no secret-like strings', () => {
    const files = walkFiles(fixturesDirectory()).filter((path) => path.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(SECRET_PATTERN.test(text), file).toBe(false);
    }
  });
});
