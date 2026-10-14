import { describe, expect, it } from 'vitest'
import { readUrlSearchParams } from './readUrlSearchParams'
import { removeUrlSearchParams } from './removeUrlSearchParams'
import { isHashPath } from './urlParts'
import { writeUrlSearchParams } from './writeUrlSearchParams'

const ORIGIN = 'https://h'

/**
 * 按目标形态取出两类真实读者看到的内容
 *
 * `search` = 只读 `location.search` 的应用
 * `hash`   = 解析 `location.hash` 的应用（`#/`、`#!` 形式的查询段）
 * `anchor` = 普通锚点；`#/` 或 `#!` 开头视为路径形式，此时为 `null`
 */
function readers(url: string) {
  const u = new URL(url, ORIGIN)
  const frag = u.hash.slice(1)
  const qi = frag.indexOf('?')
  return {
    search: new URLSearchParams(u.search),
    hash: new URLSearchParams(qi === -1 ? '' : frag.slice(qi + 1)),
    anchor: isHashPath(u.hash) ? null : u.hash,
  }
}

describe('写入落点：按「锚点是否 hash 路径」分流', () => {
  const write = (url: string) =>
    writeUrlSearchParams(url, [['access_token', 'TOKEN']])

  it('无锚点：凭据进真实查询串', () => {
    const r = readers(write('https://h/orders?tab=1'))
    expect(r.search.get('access_token')).toBe('TOKEN')
    expect(r.search.get('tab')).toBe('1')
    expect(r.anchor).toBe('')
  })

  it('普通锚点：凭据进查询串，锚点与既有参数都不动', () => {
    const r = readers(write('https://h/orders?tab=1&access_token=x#detail'))
    expect(r.anchor).toBe('#detail')
    expect(r.search.get('access_token')).toBe('TOKEN')
    expect(r.search.get('tab')).toBe('1')
    // 锚点前无参数、有参数两种形态，凭据都进查询串，不占用锚点
    for (const [target, from] of [
      ['https://h/page#detail', null],
      ['https://h/page?from=menu#detail', 'menu'],
    ] as const) {
      const plain = readers(write(target))
      expect(plain.anchor).toBe('#detail')
      expect(plain.search.get('access_token')).toBe('TOKEN')
      expect(plain.search.get('from')).toBe(from)
    }
  })

  it('hash 路径：凭据进 fragment 查询段，锚点路径不动', () => {
    const r = readers(write('https://h/#/orders?tab=1'))
    expect(r.hash.get('access_token')).toBe('TOKEN')
    expect(r.hash.get('tab')).toBe('1')
    expect(r.anchor).toBeNull()
    // 原本没有查询段也照样写进 fragment
    expect(write('https://h/#/orders')).toBe(
      'https://h/#/orders?access_token=TOKEN',
    )
    expect(write('https://h/#!/orders?tab=1')).toBe(
      'https://h/#!/orders?tab=1&access_token=TOKEN',
    )
  })

  it('写入结果必须能被平台解析器原样读回参数', () => {
    // 以 `new URL` 为第三方基准：写入后的地址，平台解析器必须看到同一个值
    // 参数落到 `#` 之后时 search 为空，这一条能抓住这种情况
    for (const target of [
      'https://h/orders',
      'https://h/orders?tab=1',
      'https://h/page#detail',
      'https://h/page?from=menu#detail',
      'https://h/orders?tab=1&access_token=x#detail',
      'https://h/?redirect=/login?from=a#detail',
    ]) {
      const out = write(target)
      const u = new URL(out)
      // 判据用 `location.search`：非路径形态下凭据必须落在这里
      expect(new URLSearchParams(u.search).get('access_token')).toBe('TOKEN')
      expect(u.hash).not.toContain('access_token')
    }
  })

  it('hash 路径 + 真实 search：search 不被搬进 fragment，锚点内查询段是唯一参数来源', () => {
    const out = write('https://h/?q=1#/orders?tab=1')
    expect(out).toBe('https://h/?q=1#/orders?tab=1&access_token=TOKEN')
    const r = readers(out)
    expect(r.search.get('q')).toBe('1')
    expect(r.hash.get('access_token')).toBe('TOKEN')
    // 主体 search 是另一个读者域，不作为库的参数来源
    expect(readUrlSearchParams(out).get('access_token')).toBe('TOKEN')
    expect(readUrlSearchParams(out).get('tab')).toBe('1')
    expect(readUrlSearchParams(out).has('q')).toBe(false)
  })

  it('普通锚点内含 `?`：判为锚点文本，写入的参数仍能被库内读回（判据统一）', () => {
    // `#detail?x=1` 含 `?` 但不是路径；判据锚定 `#/`、`#!` 开头，防复利式损坏
    const out = write('https://h/page#detail?x=1')
    expect(out).toBe('https://h/page?access_token=TOKEN#detail?x=1')
    expect(isHashPath('#detail?x=1')).toBe(false)
    expect(readers(out).anchor).toBe('#detail?x=1')
    // 平台 `location.search` 读者与库内读者都能读到；锚点内的 `x=1` 不是参数
    expect(new URL(out).searchParams.get('access_token')).toBe('TOKEN')
    expect(readUrlSearchParams(out).get('access_token')).toBe('TOKEN')
    expect(readUrlSearchParams(out).has('x')).toBe(false)
  })

  it('写入同名参数是替换而非叠加', () => {
    expect(write('https://h/orders?access_token=old')).toBe(
      'https://h/orders?access_token=TOKEN',
    )
  })

  it('主体与锚点内同名参数互不干扰：各写各的读者域', () => {
    // 主体 `access_token=x` 属于另一个读者域，不被替换也不遮蔽锚点内的写入
    expect(
      writeUrlSearchParams('https://h/?access_token=x#/orders', [
        ['access_token', 'X'],
      ]),
    ).toBe('https://h/?access_token=x#/orders?access_token=X')
  })

  it('幂等：重复写入结果不变', () => {
    const once = write('https://h/orders?tab=1&access_token=x#detail')
    expect(write(once)).toBe(once)
    expect(write(write(once))).toBe(once)
  })

  it('锚点路径含已编码文本时不被二次编码', () => {
    expect(write('https://h/#/my%20path?tab=1')).toBe(
      'https://h/#/my%20path?tab=1&access_token=TOKEN',
    )
  })
})

describe('逐字节稳定性：不重写无关内容', () => {
  it('写入时保留目标上原有的编码写法', () => {
    expect(
      writeUrlSearchParams('https://h/?a=b%20c&sig=abc%2Bdef%3D', [
        ['access_token', 'TOKEN'],
      ]),
    ).toBe('https://h/?a=b%20c&sig=abc%2Bdef%3D&access_token=TOKEN')
  })

  it('值按 URLSearchParams 规则编码，读回解码一致', () => {
    const written = writeUrlSearchParams('http://xxx/#/c/d', [
      ['c', 'http://xxxx/asd/#/cad?e=1'],
    ])
    expect(written).toBe(
      'http://xxx/#/c/d?c=http%3A%2F%2Fxxxx%2Fasd%2F%23%2Fcad%3Fe%3D1',
    )
    expect(readUrlSearchParams(written).get('c')).toBe(
      'http://xxxx/asd/#/cad?e=1',
    )
  })
})

describe('复杂形态：hash 路径查询值里带完整 URL', () => {
  // 主体 `?a=1` 被忽略；锚点部分 `#detail?d=3` 被忽略但保留；
  // `c` 的值是完整 URL，内部还有 `#/cad?e=1`（嵌套路径标记，属于值）
  const url =
    'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1#detail?d=3'

  it('写入插在锚点内查询段末尾，同名替换且幂等', () => {
    expect(writeUrlSearchParams(url, [['access_token', 'T']])).toBe(
      'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1&access_token=T#detail?d=3',
    )
    const once = writeUrlSearchParams(url, [['b', '9']])
    expect(once).toBe(
      'http://xxx/a/b/?a=1#/c/d?c=http://xxxx/asd/#/cad?e=1&b=9#detail?d=3',
    )
    expect(writeUrlSearchParams(once, [['b', '9']])).toBe(once)
  })
})

describe('url 参数落点核对矩阵', () => {
  // 六节矩阵固化成文件快照：写入结果、两个读者域看到的参数、锚点原文
  // 值里带完整 URL 的嵌套形态不在这里，`readers` 按第一个 `?` 切分锚点对它不成立，
  // 那一类由上面「复杂形态」的显式断言覆盖
  it('落点矩阵', async () => {
    const matrix = [
      'https://h/orders',
      'https://h/orders?tab=1',
      'https://h/page#detail',
      'https://h/page?from=menu#detail',
      'https://h/orders?tab=1&access_token=x#detail',
      'https://h/#/orders?tab=1',
      'https://h/#/orders',
      'https://h/?q=1#/orders?tab=1',
      'https://h/page#detail?x=1',
      'https://h/?redirect=/login?from=a#detail',
    ].map((url) => {
      const written = writeUrlSearchParams(url, [['access_token', 'TOKEN']])
      const r = readers(written)
      return {
        url,
        written,
        search: Object.fromEntries(r.search),
        hash: Object.fromEntries(r.hash),
        anchor: r.anchor,
      }
    })

    await expect(`${JSON.stringify(matrix, null, 2)}\n`).toMatchFileSnapshot(
      './__snapshots__/urlLanding.json',
    )
  })
})

describe('读、删、写在同一地址上互不越界', () => {
  // 主体 `?access_token=x&next=/x` 是另一个读者域，三个操作都不碰它
  const url = 'https://h/?access_token=x&next=/x#/sso/callback?step=2'

  it('以 hash 路径为主：主体 search 既不被读取，也不被搬迁', () => {
    expect(readUrlSearchParams(url).has('access_token')).toBe(false)
    expect(readUrlSearchParams(url).get('step')).toBe('2')
  })

  it('删除只作用于锚点内查询段', () => {
    expect(removeUrlSearchParams(url, ['step'])).toBe(
      'https://h/?access_token=x&next=/x#/sso/callback',
    )
  })

  it('写入追加到锚点内查询段，主体 search 原样保留', () => {
    expect(writeUrlSearchParams(url, [['tab', '3']])).toBe(
      'https://h/?access_token=x&next=/x#/sso/callback?step=2&tab=3',
    )
  })
})
