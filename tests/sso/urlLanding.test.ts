import { describe, expect, it } from 'vitest'
import {
  isHashPath,
  readUrlSearchParams,
  removeUrlSearchParams,
  writeUrlSearchParams,
} from '../../src/sso'

/**
 * URL 参数「落点」核对矩阵
 *
 * 分六节：
 * ① 移除：四类形态，锚点与 hash 路径都不丢
 * ② 解析：生效查询串的定位（仅 `hash` 路径取锚点查询段）
 * ③ 值内含 `?`：不得被误当作分隔符
 * ④ 写入落点：按「锚点是否 hash 路径」分流
 * ⑤ 逐字节稳定性：移除与写入都不重写无关内容
 * ⑥ 复杂形态：hash 路径查询值里带完整 URL
 */

const ORIGIN = 'https://h'

/**
 * 按目标形态取出两类真实读者看到的内容。
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

describe('① 移除参数：四类形态', () => {
  it('无锚点：移除后不残留裸 ?', () => {
    expect(
      removeUrlSearchParams('https://h/orders?tab=1&access_token=x', [
        'access_token',
      ]),
    ).toBe('https://h/orders?tab=1')
  })

  it('无锚点、无参数：原样返回', () => {
    expect(removeUrlSearchParams('https://h/orders', ['access_token'])).toBe(
      'https://h/orders',
    )
  })

  it('普通锚点：锚点逐字节保留，凭据从锚点前的查询串移除', () => {
    expect(
      removeUrlSearchParams('https://h/orders?tab=1&access_token=x#detail', [
        'access_token',
      ]),
    ).toBe('https://h/orders?tab=1#detail')
  })

  it('普通锚点、锚点前无参数：原样返回（不得碰锚点）', () => {
    expect(
      removeUrlSearchParams('https://h/page?from=menu#detail', [
        'access_token',
      ]),
    ).toBe('https://h/page?from=menu#detail')
    expect(
      removeUrlSearchParams('https://h/page#detail', ['access_token']),
    ).toBe('https://h/page#detail')
  })

  it('普通锚点内含 `?` 时，主体 search 里的凭据仍被移除（防漏删）', () => {
    // 旧实现按「锚点内含 `?`」定位生效查询串，会把主体里的 access_token 漏掉，
    // 清理后地址栏仍带着凭据。
    expect(
      removeUrlSearchParams(
        'https://h/orders?access_token=x&tab=1#detail?y=2',
        ['access_token'],
      ),
    ).toBe('https://h/orders?tab=1#detail?y=2')
    expect(
      removeUrlSearchParams(
        'https://h/orders?access_token=x&tab=1#detail?y=2',
        true,
      ),
    ).toBe('https://h/orders#detail?y=2')
  })

  it('普通锚点：全部移除时锚点仍在，且不留裸 ?', () => {
    expect(
      removeUrlSearchParams(
        'https://h/orders?tab=1&access_token=x#detail',
        true,
      ),
    ).toBe('https://h/orders#detail')
  })

  it('空查询串 + 锚点：`?#detail` 归一为 `#detail`', () => {
    expect(removeUrlSearchParams('https://h/orders?#detail', true)).toBe(
      'https://h/orders#detail',
    )
  })

  it('hash 路径：凭据在 fragment 查询段内被移除，锚点路径不动', () => {
    expect(
      removeUrlSearchParams('https://h/#/orders?tab=1&access_token=x', [
        'access_token',
      ]),
    ).toBe('https://h/#/orders?tab=1')
  })

  it('hash 路径：全部移除时保留锚点路径', () => {
    expect(
      removeUrlSearchParams('https://h/#/orders?tab=1&access_token=x', true),
    ).toBe('https://h/#/orders')
  })

  it('hash 路径 + 锚点前有真实 search：只清锚点内的凭据', () => {
    expect(
      removeUrlSearchParams('https://h/?q=1#/orders?tab=1&access_token=x', [
        'access_token',
      ]),
    ).toBe('https://h/?q=1#/orders?tab=1')
  })

  it('hash 路径：只清锚点内的查询段，主体 search 不参与', () => {
    // 严格 hash 优先的取舍：主体 search 里的凭据不在生效查询串内，既不解析也不移除。
    const url =
      'https://h/?access_token=body&q=1#/orders?access_token=hash&tab=1'
    expect(removeUrlSearchParams(url, ['access_token'])).toBe(
      'https://h/?access_token=body&q=1#/orders?tab=1',
    )
    expect(removeUrlSearchParams(url, true)).toBe(
      'https://h/?access_token=body&q=1#/orders',
    )
  })

  it('锚点内有查询段时以它为准，主体 search 不参与读取', () => {
    // 以 hash 路径为主：主体 search 原样保留，既不被读取也不被搬迁。
    const url = 'https://h/?access_token=x&next=/x#/sso/callback?step=2'
    expect(readUrlSearchParams(url).has('access_token')).toBe(false)
    expect(readUrlSearchParams(url).get('step')).toBe('2')
    expect(removeUrlSearchParams(url, ['step'])).toBe(
      'https://h/?access_token=x&next=/x#/sso/callback',
    )
    expect(writeUrlSearchParams(url, [['tab', '3']])).toBe(
      'https://h/?access_token=x&next=/x#/sso/callback?step=2&tab=3',
    )
  })

  it('hash 路径内没有查询段时，主体 search 也不参与', () => {
    const url = 'https://h/?access_token=x#/orders'
    expect(readUrlSearchParams(url).has('access_token')).toBe(false)
    expect(removeUrlSearchParams(url, ['access_token'])).toBe(url)
    // 写入仍落锚点内查询段，此后从 location.hash 读得到
    const written = writeUrlSearchParams(url, [['access_token', 'X']])
    expect(written).toBe('https://h/?access_token=x#/orders?access_token=X')
    expect(readUrlSearchParams(written).get('access_token')).toBe('X')
  })

  it('锚点内的已编码文本不被二次编码', () => {
    expect(
      removeUrlSearchParams('https://h/orders?access_token=x#sec%20tion', [
        'access_token',
      ]),
    ).toBe('https://h/orders#sec%20tion')
  })

  it('接受 URL 对象输入', () => {
    expect(
      removeUrlSearchParams(new URL('https://h/orders?access_token=x#detail'), [
        'access_token',
      ]),
    ).toBe('https://h/orders#detail')
  })

  it('按解码后的参数名匹配（filter[0] / filter%5B0%5D）', () => {
    expect(
      removeUrlSearchParams('https://h/?filter%5B0%5D=v&x=1', ['filter[0]']),
    ).toBe('https://h/?x=1')
  })
})

describe('② 解析：生效查询串的定位', () => {
  it('无锚点：取主体 search', () => {
    expect(
      Object.fromEntries(
        readUrlSearchParams('https://h/orders?tab=1&access_token=x'),
      ),
    ).toEqual({ tab: '1', access_token: 'x' })
  })

  it('普通锚点：锚点不污染锚点前的参数', () => {
    expect(
      Object.fromEntries(
        readUrlSearchParams('https://h/orders?tab=1&access_token=x#detail'),
      ),
    ).toEqual({ tab: '1', access_token: 'x' })
  })

  it('hash 路径：取 fragment 查询段', () => {
    expect(
      Object.fromEntries(
        readUrlSearchParams('https://h/#/orders?tab=1&access_token=x'),
      ),
    ).toEqual({ tab: '1', access_token: 'x' })
  })

  it('hash 路径内没有查询段时生效查询串为空（不看主体 search）', () => {
    expect(
      Object.fromEntries(readUrlSearchParams('https://h/?q=1#/orders')),
    ).toEqual({})
  })

  it('hash 路径优先：锚点内有查询段时主体 search 被忽略', () => {
    // 锚点按路径形式书写时，应用只解析 `location.hash`，主体 search 不参与。
    expect(
      Object.fromEntries(readUrlSearchParams('https://h/?q=1#/orders?tab=1')),
    ).toEqual({ tab: '1' })
    // 锚点内没有查询段时生效查询串为空，同样不看主体 search
    expect(
      Object.fromEntries(readUrlSearchParams('https://h/?q=1#/orders')),
    ).toEqual({})
  })

  it('普通锚点内的 `?` 属于锚点文本，不是生效查询串', () => {
    // 普通锚点整体不承载参数：既不做参数来源，也不遮蔽主体 search。
    expect(
      Object.fromEntries(readUrlSearchParams('https://h/page#detail?x=1')),
    ).toEqual({})
    expect(isHashPath('#detail?x=1')).toBe(false)
    expect(
      Object.fromEntries(
        readUrlSearchParams('https://h/page?body=1#detail?x=1'),
      ),
    ).toEqual({ body: '1' })
  })
})

describe('③ 值内含 `?`：不得被误当作分隔符', () => {
  // 字面 `?` 在查询串值里是合法字符（WHATWG 的 query percent-encode set 不含 `?`）。
  it('解析保住整个 redirect 值', () => {
    expect(
      readUrlSearchParams('https://h/?redirect=/login?from=a').get('redirect'),
    ).toBe('/login?from=a')
  })

  it('解析保住完整参数集', () => {
    expect(
      Object.fromEntries(
        readUrlSearchParams('https://h/?a=1&redirect=/login?from=2'),
      ),
    ).toEqual({ a: '1', redirect: '/login?from=2' })
  })

  it('移除无关参数不破坏其它参数的值', () => {
    expect(
      removeUrlSearchParams('https://h/?redirect=/login?from=a', ['nope']),
    ).toBe('https://h/?redirect=/login?from=a')
  })

  it('移除命中参数时不截断相邻参数的值', () => {
    // 旧实现在此把 redirect 截成 '/login'
    expect(
      removeUrlSearchParams('https://h/?redirect=/login?from=a', ['from']),
    ).toBe('https://h/?redirect=/login?from=a')
  })

  it('解析结果与平台 new URL 一致', () => {
    for (const u of [
      'https://h/?redirect=/login?from=a',
      'https://h/?a=1&redirect=/login?from=2',
      'https://h/?next=/a?b=c#detail',
    ]) {
      expect(Object.fromEntries(readUrlSearchParams(u))).toEqual(
        Object.fromEntries(new URL(u).searchParams),
      )
    }
  })
})

describe('④ 写入落点：按「锚点是否 hash 路径」分流', () => {
  const write = (url: string) =>
    writeUrlSearchParams(url, [['access_token', 'TOKEN']])

  it('无锚点：凭据进真实查询串', () => {
    const r = readers(write('https://h/orders?tab=1'))
    expect(r.search.get('access_token')).toBe('TOKEN')
    expect(r.search.get('tab')).toBe('1')
    expect(r.anchor).toBe('')
  })

  it('普通锚点：凭据进查询串，锚点保留', () => {
    const r = readers(write('https://h/orders?tab=1&access_token=x#detail'))
    expect(r.anchor).toBe('#detail')
    expect(r.search.get('access_token')).toBe('TOKEN')
    expect(r.search.get('tab')).toBe('1')
  })

  it('普通锚点、锚点前无参数：凭据进查询串，不占用锚点', () => {
    const r = readers(write('https://h/page#detail'))
    expect(r.anchor).toBe('#detail')
    expect(r.search.get('access_token')).toBe('TOKEN')
  })

  it('普通锚点：锚点前的既有参数不被搬进 fragment', () => {
    const r = readers(write('https://h/page?from=menu#detail'))
    expect(r.anchor).toBe('#detail')
    expect(r.search.get('from')).toBe('menu')
    expect(r.search.get('access_token')).toBe('TOKEN')
  })

  it('hash 路径：凭据进 fragment 查询段，锚点路径不动', () => {
    const r = readers(write('https://h/#/orders?tab=1'))
    expect(r.hash.get('access_token')).toBe('TOKEN')
    expect(r.hash.get('tab')).toBe('1')
    expect(r.anchor).toBeNull()
  })

  it('hash 路径无查询段：仍写进 fragment', () => {
    expect(write('https://h/#/orders')).toBe(
      'https://h/#/orders?access_token=TOKEN',
    )
  })

  it('hashbang 路径同样识别（`#!/`）', () => {
    expect(write('https://h/#!/orders?tab=1')).toBe(
      'https://h/#!/orders?tab=1&access_token=TOKEN',
    )
  })

  it('写入结果必须能被平台解析器原样读回参数', () => {
    // 以 `new URL` 为第三方基准：写入后的地址，平台解析器必须看到同一个值。
    // 参数落到 `#` 之后时 search 为空，这一条能抓住这种情况。
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

  it('hash 路径 + 真实 search：search 不被搬进 fragment', () => {
    const r = readers(write('https://h/?q=1#/orders?tab=1'))
    expect(r.search.get('q')).toBe('1')
    expect(r.hash.get('access_token')).toBe('TOKEN')
  })

  it('hash 路径 + 真实 search：写入后锚点内查询段成为唯一参数来源', () => {
    const out = write('https://h/?q=1#/orders?tab=1')
    expect(out).toBe('https://h/?q=1#/orders?tab=1&access_token=TOKEN')
    expect(readUrlSearchParams(out).get('access_token')).toBe('TOKEN')
    expect(readUrlSearchParams(out).get('tab')).toBe('1')
    // 主体 search 是另一个读者域，不作为库的参数来源
    expect(readUrlSearchParams(out).has('q')).toBe(false)
  })

  it('已损坏的锚点形态不被误判为路径（防复利式损坏）', () => {
    // `#detail?x=1` 含 `?` 但不是路径；判据锚定 `#/`、`#!` 开头
    const r = readers(write('https://h/page#detail?x=1'))
    expect(r.search.get('access_token')).toBe('TOKEN')
    expect(r.anchor).toBe('#detail?x=1')
    expect(isHashPath('#detail?x=1')).toBe(false)
  })

  it('普通锚点内含 `?`：写入的参数仍能被库内读回（判据统一）', () => {
    // 写入按普通锚点处理（参数进真实查询串），读取用同一判据忽略锚点内的 `?`，
    // 因此 `writeUrlSearchParams` 写出的地址一定读得回来。
    const out = write('https://h/page#detail?x=1')
    expect(out).toBe('https://h/page?access_token=TOKEN#detail?x=1')
    // 平台 `location.search` 读者能读到
    expect(new URL(out).searchParams.get('access_token')).toBe('TOKEN')
    // 库内读者同样能读到；锚点内的 `x=1` 是锚点文本，不是参数
    expect(readUrlSearchParams(out).get('access_token')).toBe('TOKEN')
    expect(readUrlSearchParams(out).has('x')).toBe(false)
    expect(new URL(out).hash).toBe('#detail?x=1')
  })

  it('写入同名参数是替换而非叠加', () => {
    expect(write('https://h/orders?access_token=old')).toBe(
      'https://h/orders?access_token=TOKEN',
    )
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

describe('⑤ 逐字节稳定性：不重写无关内容', () => {
  it('移除未命中的参数时逐字节不变（含 %20 / + / 无值参数）', () => {
    for (const same of [
      'https://h/?a=b%20c',
      'https://h/?a=b+c',
      'https://h/?flag',
      'https://h/?empty=&x=1',
      'https://h/?a=1&b=2&a=3',
      'https://h/?a=%E4%B8%AD',
      'https://h/?sig=abc%2Bdef%3D',
      'https://h/orders?tab=1#detail',
      'https://h/orders?tab=1#detail?x=1',
      'https://h/page#detail?x=1',
      'https://h/?q=1#/orders?tab=1',
      'https://h/%E8%B7%AF%E7%94%B1?a=1#detail',
    ]) {
      expect(removeUrlSearchParams(same, ['nonexistent'])).toBe(same)
    }
  })

  it('空查询串的孤立 `?` 会被去掉（不与上面混为一谈）', () => {
    for (const [input, expected] of [
      ['https://h/a?', 'https://h/a'],
      ['https://h/?', 'https://h/'],
      ['https://h/a?#detail', 'https://h/a#detail'],
    ] as const) {
      expect(removeUrlSearchParams(input, ['nonexistent'])).toBe(expected)
      expect(removeUrlSearchParams(input, [])).toBe(expected)
    }
  })

  it('移除其它参数时不动未被移除参数的值（签名安全边界）', () => {
    expect(removeUrlSearchParams('https://h/?sig=x&a=b%20c', ['sig'])).toBe(
      'https://h/?a=b%20c',
    )
    expect(removeUrlSearchParams('https://h/?a=b%20c&x=1', ['x'])).toBe(
      'https://h/?a=b%20c',
    )
  })

  it('移除保留重复参数的全部出现', () => {
    expect(removeUrlSearchParams('https://h/?a=1&b=2&a=3', ['b'])).toBe(
      'https://h/?a=1&a=3',
    )
  })

  it('移除后参数块为空时不残留裸 ?（同时保留锚点）', () => {
    expect(removeUrlSearchParams('https://h/orders?a=1#detail', ['a'])).toBe(
      'https://h/orders#detail',
    )
    expect(removeUrlSearchParams('https://h/orders?a=1', ['a'])).toBe(
      'https://h/orders',
    )
  })

  it('写入时保留目标上原有的编码写法', () => {
    expect(
      writeUrlSearchParams('https://h/?a=b%20c&sig=abc%2Bdef%3D', [
        ['access_token', 'TOKEN'],
      ]),
    ).toBe('https://h/?a=b%20c&sig=abc%2Bdef%3D&access_token=TOKEN')
  })
})

describe('⑥ 复杂形态：hash 路径查询值里带完整 URL', () => {
  // 主体 `?a=1` 被忽略；锚点部分 `#detail?d=3` 被忽略但保留；
  // `c` 的值是完整 URL，内部还有 `#/cad?e=1`（嵌套路径标记，属于值）。
  const url =
    'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1#detail?d=3'

  it('读写删都只针对 hash 路径查询段 {b:2, c:…}', () => {
    expect(Object.fromEntries(readUrlSearchParams(url))).toEqual({
      b: '2',
      c: 'http://xxxx/asd/#/cad?e=1',
    })
  })

  it('写入插在锚点内查询段末尾，主体 search 与锚点部分逐字节保留', () => {
    expect(writeUrlSearchParams(url, [['access_token', 'T']])).toBe(
      'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1&access_token=T#detail?d=3',
    )
  })

  it('移除只作用于生效查询串，主体 search 原样保留', () => {
    expect(removeUrlSearchParams(url, ['b'])).toBe(
      'http://xxx/a/b/?a=1#/c/d?c=http://xxxx/asd/#/cad?e=1#detail?d=3',
    )
    expect(removeUrlSearchParams(url, true)).toBe(
      'http://xxx/a/b/?a=1#/c/d#detail?d=3',
    )
  })

  it('同名替换、幂等', () => {
    const once = writeUrlSearchParams(url, [['b', '9']])
    expect(once).toBe(
      'http://xxx/a/b/?a=1#/c/d?c=http://xxxx/asd/#/cad?e=1&b=9#detail?d=3',
    )
    expect(writeUrlSearchParams(once, [['b', '9']])).toBe(once)
  })

  it('值按 URLSearchParams 规则编码，读回解码一致（完整 URL 可安全承载）', () => {
    const written = writeUrlSearchParams('http://xxx/#/c/d', [
      ['c', 'http://xxxx/asd/#/cad?e=1'],
    ])
    expect(written).toBe(
      'http://xxx/#/c/d?c=http%3A%2F%2Fxxxx%2Fasd%2F%23%2Fcad%3Fe%3D1',
    )
    expect(readUrlSearchParams(written).get('c')).toBe(
      'http://xxxx/asd/#/cad?e=1',
    )
    // 已编码的输入不被二次编码，原样保留
    expect(removeUrlSearchParams(written, ['nonexistent'])).toBe(written)
  })
})
