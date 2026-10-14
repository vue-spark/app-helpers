import { describe, expect, it } from 'vitest'
import {
  isHashPath,
  joinUrl,
  rawQueryKey,
  splitRawQuery,
  splitUrl,
} from './urlParts'

describe('isHashPath', () => {
  it('只把 `#/`、`#!` 开头的锚点判为 hash 路径', () => {
    expect(isHashPath('#/orders?tab=1')).toBe(true)
    expect(isHashPath('#!/orders?tab=1')).toBe(true)
    expect(isHashPath('#detail?x=1')).toBe(false)
    expect(isHashPath('')).toBe(false)
  })
})

describe('splitUrl', () => {
  it('分段结果能逐字节还原原串', () => {
    for (const url of [
      'https://h/orders?tab=1&access_token=x',
      'https://h/orders?tab=1&access_token=x#detail',
      'https://h/page#detail?x=1',
      'https://h/#/orders?tab=1&access_token=x',
      'https://h/?access_token=body&q=1#/orders?access_token=hash&tab=1',
      'https://h/?redirect=/login?from=a#detail',
      'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1#detail?d=3',
      'https://h/orders',
    ]) {
      const { before, query, after } = splitUrl(url)
      expect(`${before}${query ? `?${query}` : ''}${after}`).toBe(url)
    }
  })

  it('空的生效查询串不参与还原，孤立的 `?` 会被去掉', () => {
    // 逐字节还原只对「查询串非空」成立，空查询串是唯一的例外
    expect(splitUrl('https://h/orders?')).toEqual({
      before: 'https://h/orders',
      query: '',
      after: '',
    })
    expect(splitUrl('https://h/orders?#detail')).toEqual({
      before: 'https://h/orders',
      query: '',
      after: '#detail',
    })
  })

  it('无锚点 / 普通锚点取主体 search，hash 路径取锚点内查询段', () => {
    expect(splitUrl('https://h/orders?tab=1')).toEqual({
      before: 'https://h/orders',
      query: 'tab=1',
      after: '',
    })
    // 普通锚点整体留在 after，重建时插到 `#` 之前
    expect(splitUrl('https://h/orders?access_token=x#detail')).toEqual({
      before: 'https://h/orders',
      query: 'access_token=x',
      after: '#detail',
    })
    // hash 路径优先，且主体 search 完全不参与
    expect(splitUrl('https://h/?access_token=body#/orders?tab=1')).toEqual({
      before: 'https://h/?access_token=body#/orders',
      query: 'tab=1',
      after: '',
    })
    // hash 路径内没有查询段时生效查询串为空
    expect(splitUrl('https://h/?q=1#/orders')).toEqual({
      before: 'https://h/?q=1#/orders',
      query: '',
      after: '',
    })
  })

  it('普通锚点内的 `?` 不算查询串，`#detail?d=3` 整体留在 after', () => {
    expect(splitUrl('https://h/page#detail?x=1')).toEqual({
      before: 'https://h/page',
      query: '',
      after: '#detail?x=1',
    })
    expect(splitUrl('https://h/page?body=1#detail?x=1')).toEqual({
      before: 'https://h/page',
      query: 'body=1',
      after: '#detail?x=1',
    })
  })

  it('值里的 `?` 不被当作分隔符，只认第一个 `?`', () => {
    expect(splitUrl('https://h/?redirect=/login?from=a').query).toBe(
      'redirect=/login?from=a',
    )
  })

  it('锚点部分的 `#/` 属于查询值，不开启新的查询段', () => {
    // `c` 的值是完整 URL，内部还有 `#/cad?e=1`；`#detail?d=3` 是锚点原文
    expect(
      splitUrl(
        'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1#detail?d=3',
      ),
    ).toEqual({
      before: 'http://xxx/a/b/?a=1#/c/d',
      query: 'b=2&c=http://xxxx/asd/#/cad?e=1',
      after: '#detail?d=3',
    })
  })

  it('分段与生效查询串对照表', () => {
    expect(
      [
        'https://h/orders?tab=1',
        'https://h/orders?tab=1#detail',
        'https://h/#/orders?tab=1',
        'https://h/?q=1#/orders',
        'https://h/page#detail?x=1',
        'https://h/?redirect=/login?from=a#detail',
      ].map(url => ({ url, parts: splitUrl(url) })),
    ).toMatchSnapshot()
  })
})

describe('joinUrl', () => {
  it('查询串为空时不保留孤立的 `?`', () => {
    expect(joinUrl({ before: 'https://h/a', query: '', after: '' }, '')).toBe(
      'https://h/a',
    )
    expect(
      joinUrl({ before: 'https://h/orders', query: '', after: '#detail' }, ''),
    ).toBe('https://h/orders#detail')
    expect(
      joinUrl({ before: 'https://h/orders', query: 'tab=1', after: '' }, 'a=1'),
    ).toBe('https://h/orders?a=1')
  })
})

describe('splitRawQuery', () => {
  it('空查询串切出空数组，其余按 `&` 切分并保留原文', () => {
    expect(splitRawQuery('')).toEqual([])
    expect(splitRawQuery('a=1&b=2&a=3')).toEqual(['a=1', 'b=2', 'a=3'])
    expect(splitRawQuery('flag')).toEqual(['flag'])
  })
})

describe('rawQueryKey', () => {
  it('取片段参数名并按 URLSearchParams 规则解码', () => {
    expect(rawQueryKey('a=1')).toBe('a')
    expect(rawQueryKey('filter%5B0%5D=v')).toBe('filter[0]')
    expect(rawQueryKey('flag')).toBe('flag')
    // `+` 视为空格，与读取侧一致
    expect(rawQueryKey('a+b=1')).toBe('a b')
  })
})
