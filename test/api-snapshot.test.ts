// @vitest-environment node
// happy-dom 会替换全局 `URL`，`new URL('..', import.meta.url)` 于是解析到
// happy-dom 的 location 而不是文件路径，`fileURLToPath` 随即报错
import { fileURLToPath } from 'node:url'
import { guardStaleBuild } from 'tsdown-stale-guard'
import { snapshotApiPerEntry } from 'tsnapi/vitest'
import { beforeAll, describe } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

describe('api snapshot', () => {
  beforeAll(async () => {
    await guardStaleBuild({ root })
  })

  snapshotApiPerEntry(root)
})
