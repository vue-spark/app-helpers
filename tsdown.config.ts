import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/*/index.ts', '!src/utils', '!src/types'],
    platform: 'neutral',
    dts: {
      tsconfig: 'tsconfig.lib.json',
    },
  },
])
