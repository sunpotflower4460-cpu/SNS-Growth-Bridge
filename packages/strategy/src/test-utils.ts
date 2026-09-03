import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const goldenRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'golden');

export function loadGolden(name: string): unknown {
  const text = readFileSync(join(goldenRoot, `${name}.json`), 'utf8');
  return JSON.parse(text) as unknown;
}
