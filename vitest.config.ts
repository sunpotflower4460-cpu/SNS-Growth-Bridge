import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const packageSrc = (name: string): string =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@sns-growth-bridge/contracts': packageSrc('contracts'),
      '@sns-growth-bridge/scoring': packageSrc('scoring'),
      '@sns-growth-bridge/strategy': packageSrc('strategy'),
      '@sns-growth-bridge/adapters-my-sns': packageSrc('adapters-my-sns'),
      '@sns-growth-bridge/adapters-sns-ai': packageSrc('adapters-sns-ai'),
      '@sns-growth-bridge/identity-links': packageSrc('identity-links'),
      '@sns-growth-bridge/runtime-transport': packageSrc('runtime-transport'),
      '@sns-growth-bridge/testing': packageSrc('testing'),
    },
  },
});
