import { describe, expect, it } from 'vitest'
import { readUrlSearchParams } from './readUrlSearchParams'
import { isHashPath } from './urlParts'

describe('readUrlSearchParams', () => {
  it('解析基础查询参数', () => {
    const result = readUrlSearchParams(
      'https://example.com?access_token=abc123&state=true',
    )
    expect(result.get('access_token')).toBe('abc123')
    expect(result.get('state')).toBe('true')
  })

  it('没有生效查询串时返回空实例（无参数 / 仅锚点 / 空输入）', () => {
    expect(readUrlSearchParams('https://example.com').toString()).toBe('')
    expect(
      readUrlSearchParams('https://example.com/page#/dashboard').toString(),
    ).toBe('')
    expect(readUrlSearchParams('').toString()).toBe('')
  })

  it('解析编码字符', () => {
    const result = readUrlSearchParams(
      'https://example.com?filter%5B0%5D=value',
    )
    // 自动解码 `%5B` 为 `[`
    expect(result.get('filter[0]')).toBe('value')
  })

  it('保留重复参数的所有值', () => {
    const result = readUrlSearchParams('https://example.com?a=1&a=2&b=3')
    expect(result.getAll('a')).toEqual(['1', '2'])
    expect(result.get('b')).toBe('3')
  })

  it('处理 URL 对象输入', () => {
    const result = readUrlSearchParams(new URL('https://example.com?param=1'))
    expect(result.get('param')).toBe('1')
  })

  it('非 URL 字符串仍按查询串解析', () => {
    expect(readUrlSearchParams('invalid-url?param=1').get('param')).toBe('1')
  })

  it('多次调用返回互相独立的实例', () => {
    const first = readUrlSearchParams('https://example.com?a=1')
    const second = readUrlSearchParams('https://example.com?b=2')
    expect(first.get('a')).toBe('1')
    expect(first.has('b')).toBe(false)
    expect(second.get('b')).toBe('2')
    expect(second.has('a')).toBe(false)
    expect(first).not.toBe(second)
  })
})

describe('生效查询串的定位', () => {
  it('无锚点 / 普通锚点取主体 search', () => {
    expect(
      Object.fromEntries(
        readUrlSearchParams('https://h/orders?tab=1&access_token=x'),
      ),
    ).toEqual({ tab: '1', access_token: 'x' })
    // 普通锚点不污染锚点前的参数
    expect(
      Object.fromEntries(
        readUrlSearchParams('https://h/orders?tab=1&access_token=x#detail'),
      ),
    ).toEqual({ tab: '1', access_token: 'x' })
  })

  it('hash 路径优先：取 fragment 查询段，主体 search 完全不参与', () => {
    expect(
      Object.fromEntries(
        readUrlSearchParams('https://h/#/orders?tab=1&access_token=x'),
      ),
    ).toEqual({ tab: '1', access_token: 'x' })
    // 锚点内有查询段时主体 search 被忽略
    expect(
      Object.fromEntries(readUrlSearchParams('https://h/?q=1#/orders?tab=1')),
    ).toEqual({ tab: '1' })
    // 锚点内没有查询段时生效查询串为空，同样不看主体 search
    expect(
      Object.fromEntries(readUrlSearchParams('https://h/?q=1#/orders')),
    ).toEqual({})
  })

  it('普通锚点内的 `?` 属于锚点文本，不是生效查询串', () => {
    // 普通锚点整体不承载参数：既不做参数来源，也不遮蔽主体 search
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

describe('值内含 `?`：不得被误当作分隔符', () => {
  // 字面 `?` 在查询串值里是合法字符（WHATWG 的 query percent-encode set 不含 `?`）
  it('保住整个 redirect 值', () => {
    expect(
      readUrlSearchParams('https://h/?redirect=/login?from=a').get('redirect'),
    ).toBe('/login?from=a')
    expect(
      Object.fromEntries(
        readUrlSearchParams('https://h/?a=1&redirect=/login?from=2'),
      ),
    ).toEqual({ a: '1', redirect: '/login?from=2' })
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

describe('复杂形态：hash 路径查询值里带完整 URL', () => {
  // 主体 `?a=1` 被忽略；锚点部分 `#detail?d=3` 被忽略但保留；
  // `c` 的值是完整 URL，内部还有 `#/cad?e=1`（嵌套路径标记，属于值）
  const url
    = 'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1#detail?d=3'

  it('只读取 hash 路径查询段', () => {
    expect(Object.fromEntries(readUrlSearchParams(url))).toEqual({
      b: '2',
      c: 'http://xxxx/asd/#/cad?e=1',
    })
  })

  it('读取结果快照', () => {
    expect([...readUrlSearchParams(url).entries()]).toMatchSnapshot()
  })
})
