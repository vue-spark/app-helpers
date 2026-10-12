import { describe, expect, it } from 'vitest'
import {
  isHashRoute,
  removeUrlSearchParams,
  resolveUrlSearchParams,
  writeUrlSearchParams,
} from '../../src/sso'

/**
 * URL 参数「落点」核对矩阵
 *
 * 分五节：
 * ① 移除：四类形态，锚点与 hash 路由都不丢
 * ② 解析：生效查询串的定位（含 `hash` 优先规则）
 * ③ 值内含 `?`：不得被误当作分隔符
 * ④ 写入落点：按「锚点是否 hash 路由」分流
 * ⑤ 逐字节稳定性：移除与写入都不重写无关内容
 */

const ORIGIN = 'https://h'

/**
 * 按目标形态取出两个真实读者看到的内容。
 *
 * `search` = 只读 `location.search` 的应用
 * `route`  = 读 fragment 查询段的路由应用（`route.query`）
 * `anchor` = 普通锚点；`#/` 或 `#!` 开头视为路由，此时为 `null`
 */
function readers(url: string) {
  const u = new URL(url, ORIGIN)
  const frag = u.hash.slice(1)
  const qi = frag.indexOf('?')
  return {
    search: new URLSearchParams(u.search),
    route: new URLSearchParams(qi === -1 ? '' : frag.slice(qi + 1)),
    anchor: isHashRoute(u.hash) ? null : u.hash,
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

  it('hash 路由：凭据在 fragment 查询段内被移除，路由路径不动', () => {
    expect(
      removeUrlSearchParams('https://h/#/orders?tab=1&access_token=x', [
        'access_token',
      ]),
    ).toBe('https://h/#/orders?tab=1')
  })

  it('hash 路由：全部移除时保留路由路径', () => {
    expect(
      removeUrlSearchParams('https://h/#/orders?tab=1&access_token=x', true),
    ).toBe('https://h/#/orders')
  })

  it('hash 路由 + 锚点前有真实 search：search 与 fragment 两不相犯', () => {
    expect(
      removeUrlSearchParams('https://h/?q=1#/orders?tab=1&access_token=x', [
        'access_token',
      ]),
    ).toBe('https://h/?q=1#/orders?tab=1')
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
        resolveUrlSearchParams('https://h/orders?tab=1&access_token=x'),
      ),
    ).toEqual({ tab: '1', access_token: 'x' })
  })

  it('普通锚点：锚点不污染锚点前的参数', () => {
    expect(
      Object.fromEntries(
        resolveUrlSearchParams('https://h/orders?tab=1&access_token=x#detail'),
      ),
    ).toEqual({ tab: '1', access_token: 'x' })
  })

  it('hash 路由：取 fragment 查询段', () => {
    expect(
      Object.fromEntries(
        resolveUrlSearchParams('https://h/#/orders?tab=1&access_token=x'),
      ),
    ).toEqual({ tab: '1', access_token: 'x' })
  })

  it('hash 路由无查询段时回退到主体 search', () => {
    expect(
      Object.fromEntries(resolveUrlSearchParams('https://h/?q=1#/orders')),
    ).toEqual({ q: '1' })
  })

  it('hash 优先：锚点内含查询串时以锚点内为准，主体 search 被忽略', () => {
    // 这是 `resolveUrlSearchParams` 的既定语义，见 src/sso/README.md。
    expect(
      Object.fromEntries(
        resolveUrlSearchParams('https://h/?q=1#/orders?tab=1'),
      ),
    ).toEqual({ tab: '1' })
  })

  it('锚点内含查询串时不是路由形态，但仍无法与合法路由区分', () => {
    // `#detail?x=1` 与 `#/orders?tab=1` 在解析层都走「hash 优先」分支：
    // 从字符串本身无法判断前者是「锚点 + 误拼的查询串」还是「路由」，
    // 所以写入时按普通锚点处理（见 ④），读取时不猜测、原样交给 hash 优先。
    expect(
      Object.fromEntries(resolveUrlSearchParams('https://h/page#detail?x=1')),
    ).toEqual({ x: '1' })
    expect(isHashRoute('#detail?x=1')).toBe(false)
  })
})

describe('③ 值内含 `?`：不得被误当作分隔符', () => {
  // 字面 `?` 在查询串值里是合法字符（WHATWG 的 query percent-encode set 不含 `?`）。
  it('解析保住整个 redirect 值', () => {
    expect(
      resolveUrlSearchParams('https://h/?redirect=/login?from=a').get(
        'redirect',
      ),
    ).toBe('/login?from=a')
  })

  it('解析保住完整参数集', () => {
    expect(
      Object.fromEntries(
        resolveUrlSearchParams('https://h/?a=1&redirect=/login?from=2'),
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
      expect(Object.fromEntries(resolveUrlSearchParams(u))).toEqual(
        Object.fromEntries(new URL(u).searchParams),
      )
    }
  })
})

describe('④ 写入落点：按「锚点是否 hash 路由」分流', () => {
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

  it('hash 路由：凭据进 fragment 查询段，路由路径不动', () => {
    const r = readers(write('https://h/#/orders?tab=1'))
    expect(r.route.get('access_token')).toBe('TOKEN')
    expect(r.route.get('tab')).toBe('1')
    expect(r.anchor).toBeNull()
  })

  it('hash 路由无查询段：仍写进 fragment', () => {
    expect(write('https://h/#/orders')).toBe(
      'https://h/#/orders?access_token=TOKEN',
    )
  })

  it('hashbang 路由同样识别（`#!/`）', () => {
    expect(write('https://h/#!/orders?tab=1')).toBe(
      'https://h/#!/orders?tab=1&access_token=TOKEN',
    )
  })

  it('写入结果必须能被平台解析器原样读回参数', () => {
    // 以 `new URL` 为第三方基准：写入后的地址，平台解析器必须看到同一个值。
    // 这一条能同时抓住「参数落到 `#` 之后」——那种情况 search 为空。
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
      // 判据用 `location.search`：非路由形态下凭据必须落在这里
      expect(new URLSearchParams(u.search).get('access_token')).toBe('TOKEN')
      expect(u.hash).not.toContain('access_token')
    }
  })

  it('hash 路由 + 真实 search：search 不被搬进 fragment', () => {
    const r = readers(write('https://h/?q=1#/orders?tab=1'))
    expect(r.search.get('q')).toBe('1')
    expect(r.route.get('access_token')).toBe('TOKEN')
  })

  it('已损坏的锚点形态不被误判为路由（防复利式损坏）', () => {
    // `#detail?x=1` 含 `?` 但不是路由；判据锚定 `#/`、`#!` 开头
    const r = readers(write('https://h/page#detail?x=1'))
    expect(r.search.get('access_token')).toBe('TOKEN')
    expect(r.anchor).toBe('#detail?x=1')
    expect(isHashRoute('#detail?x=1')).toBe(false)
  })

  it('已知限制：锚点内已有查询串时，写入与库内读取不一致', () => {
    // 写入按「普通锚点」处理（参数进真实查询串），但 resolveUrlSearchParams
    // 遵循 hash 优先，会去读锚点内的查询串，因此读不到刚写入的参数。
    // 这不是可以就地修掉的分支：该形态与合法 hash 路由在字符串上不可区分。
    const out = write('https://h/page#detail?x=1')
    expect(out).toBe('https://h/page?access_token=TOKEN#detail?x=1')
    // 平台 `location.search` 读者能读到
    expect(new URL(out).searchParams.get('access_token')).toBe('TOKEN')
    // 库内读者读不到（读的是锚点内的 x=1）
    expect(resolveUrlSearchParams(out).get('access_token')).toBeNull()
    expect(resolveUrlSearchParams(out).get('x')).toBe('1')
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

  it('路由路径含已编码文本时不被二次编码', () => {
    expect(write('https://h/#/my%20route?tab=1')).toBe(
      'https://h/#/my%20route?tab=1&access_token=TOKEN',
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
