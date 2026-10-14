import { describe, expect, it } from 'vitest'
import { removeUrlSearchParams } from './removeUrlSearchParams'
import { writeUrlSearchParams } from './writeUrlSearchParams'

describe('removeUrlSearchParams', () => {
  const testUrl = 'https://example.com?access_token=abc123&state=true&error=401'

  it('移除单个参数', () => {
    expect(removeUrlSearchParams(testUrl, ['access_token'])).toBe(
      'https://example.com?state=true&error=401',
    )
  })

  it('移除多个参数', () => {
    expect(removeUrlSearchParams(testUrl, ['access_token', 'error'])).toBe(
      'https://example.com?state=true',
    )
  })

  it('参数不存在时保持原样', () => {
    expect(removeUrlSearchParams(testUrl, ['invalid_param'])).toBe(testUrl)
  })

  it('移除所有参数', () => {
    expect(removeUrlSearchParams(testUrl, true)).toBe('https://example.com')
  })

  it('按解码后的参数名匹配（filter[0] / filter%5B0%5D）', () => {
    expect(
      removeUrlSearchParams('https://h/?filter%5B0%5D=v&x=1', ['filter[0]']),
    ).toBe('https://h/?x=1')
  })

  it('接受 URL 对象输入', () => {
    expect(
      removeUrlSearchParams(new URL('https://h/orders?access_token=x#detail'), [
        'access_token',
      ]),
    ).toBe('https://h/orders#detail')
    // hash 路径形态同样按对象输入处理
    expect(
      removeUrlSearchParams(new URL('https://h/page#/dashboard?token=1'), [
        'token',
      ]),
    ).toBe('https://h/page#/dashboard')
  })
})

describe('移除参数：四类形态', () => {
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
    // 清理后地址栏仍带着凭据
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
    expect(
      removeUrlSearchParams('https://h/#/orders?tab=1&access_token=x', true),
    ).toBe('https://h/#/orders')
  })

  it('hash 路径：只清锚点内的查询段，主体 search 不参与', () => {
    // 严格 hash 优先的取舍：主体 search 里的凭据不在生效查询串内，既不解析也不移除
    const url =
      'https://h/?access_token=body&q=1#/orders?access_token=hash&tab=1'
    expect(removeUrlSearchParams(url, ['access_token'])).toBe(
      'https://h/?access_token=body&q=1#/orders?tab=1',
    )
    expect(removeUrlSearchParams(url, true)).toBe(
      'https://h/?access_token=body&q=1#/orders',
    )
  })

  it('hash 路径内没有查询段时，移除不动原串', () => {
    const url = 'https://h/?access_token=x#/orders'
    expect(removeUrlSearchParams(url, ['access_token'])).toBe(url)
  })

  it('锚点内的已编码文本不被二次编码', () => {
    expect(
      removeUrlSearchParams('https://h/orders?access_token=x#sec%20tion', [
        'access_token',
      ]),
    ).toBe('https://h/orders#sec%20tion')
  })
})

describe('移除时不截断相邻参数的值', () => {
  // 旧实现按子串匹配，在此把 redirect 截成 '/login'；未命中的参数也不得改动其它片段
  it('值里的 `?` 不是分隔符', () => {
    expect(
      removeUrlSearchParams('https://h/?redirect=/login?from=a', ['from']),
    ).toBe('https://h/?redirect=/login?from=a')
    expect(
      removeUrlSearchParams('https://h/?redirect=/login?from=a', ['nope']),
    ).toBe('https://h/?redirect=/login?from=a')
  })
})

describe('逐字节稳定性：不重写无关内容', () => {
  it('移除未命中的参数时逐字节不变（含 %20 / + / 无值参数 / 编码路径）', () => {
    for (const same of [
      'https://h/?a=b%20c',
      'https://h/?a=b+c',
      'https://h/?flag',
      'https://h/?empty=&x=1',
      'https://h/?a=1&b=2&a=3',
      'https://h/?sig=abc%2Bdef%3D',
      'https://h/orders?tab=1#detail?x=1',
      'https://h/page#/dashboard',
      'https://h/?q=1#/orders?tab=1',
      'https://h/%E8%B7%AF%E7%94%B1?a=1#detail',
      'https://h/?a=%E4%B8%AD',
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

  it('移除命中项时不动未被移除项的值（签名安全边界）', () => {
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

  it('移除重复参数名时删掉该名的每一次出现', () => {
    // 只删首次出现是最容易写错的退化实现，两者在这里结果不同
    expect(
      removeUrlSearchParams('https://example.com?a=1&a=2&b=3', ['a']),
    ).toBe('https://example.com?b=3')
    expect(removeUrlSearchParams('https://h/?a=1&a=2&a=3', ['a'])).toBe(
      'https://h/',
    )
    // 中间与末尾的重复项同样要删净，且不动相邻参数
    expect(removeUrlSearchParams('https://h/?x=1&a=1&y=2&a=2', ['a'])).toBe(
      'https://h/?x=1&y=2',
    )
  })

  it('按名移除后查询串变空时不残留裸 ?', () => {
    expect(removeUrlSearchParams('https://h/orders?a=1#detail', ['a'])).toBe(
      'https://h/orders#detail',
    )
    expect(removeUrlSearchParams('https://h/orders?a=1', ['a'])).toBe(
      'https://h/orders',
    )
    // 与 `params` 传 `true` 的结果一致
    expect(removeUrlSearchParams('https://h/orders?a=1#detail', true)).toBe(
      'https://h/orders#detail',
    )
  })
})

describe('复杂形态：hash 路径查询值里带完整 URL', () => {
  // 主体 `?a=1` 被忽略；锚点部分 `#detail?d=3` 被忽略但保留；
  // `c` 的值是完整 URL，内部还有 `#/cad?e=1`（嵌套路径标记，属于值）
  const url =
    'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1#detail?d=3'

  it('移除只针对 hash 路径查询段', () => {
    expect(removeUrlSearchParams(url, ['b'])).toBe(
      'http://xxx/a/b/?a=1#/c/d?c=http://xxxx/asd/#/cad?e=1#detail?d=3',
    )
    expect(removeUrlSearchParams(url, true)).toBe(
      'http://xxx/a/b/?a=1#/c/d#detail?d=3',
    )
  })
})

describe('移除与写入互逆', () => {
  it('写入后移除同名参数回到移除后的原串', () => {
    for (const url of [
      'https://h/orders?tab=1',
      'https://h/orders?tab=1#detail',
      'https://h/#/orders?tab=1',
      'https://h/page?from=menu#detail',
    ]) {
      const written = writeUrlSearchParams(url, [['access_token', 'TOKEN']])
      expect(removeUrlSearchParams(written, ['access_token'])).toBe(url)
    }
  })

  it('成对结果快照', () => {
    expect(
      [
        'https://h/orders?tab=1&access_token=x',
        'https://h/orders?tab=1&access_token=x#detail',
        'https://h/#/orders?tab=1&access_token=x',
        'https://h/?access_token=body&q=1#/orders?access_token=hash&tab=1',
      ].map((url) => ({
        url,
        removed: removeUrlSearchParams(url, ['access_token']),
        removedAll: removeUrlSearchParams(url, true),
      })),
    ).toMatchSnapshot()
  })
})
