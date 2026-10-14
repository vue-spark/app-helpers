import { defineConfig } from 'tsdown'
import { StaleGuardRecorder } from 'tsdown-stale-guard'

export default defineConfig([
  {
    entry: ['src/*/index.ts', '!src/utils', '!src/types'],
    platform: 'neutral',
    exports: true,
    dts: {
      tsconfig: 'tsconfig.lib.json',
    },
    plugins: [StaleGuardRecorder()],
  },
])
