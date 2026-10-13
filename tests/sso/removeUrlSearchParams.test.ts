import { describe, expect, it } from 'vitest'
import { removeUrlSearchParams } from '../../src/sso'

describe.concurrent('removeUrlSearchParams', () => {
  const testUrl = 'https://example.com?access_token=abc123&state=true&error=401'

  it('移除单个参数', () => {
    const result = removeUrlSearchParams(testUrl, ['access_token'])
    expect(result).toBe('https://example.com?state=true&error=401')
  })

  it('移除多个参数', () => {
    const result = removeUrlSearchParams(testUrl, ['access_token', 'error'])
    expect(result).toBe('https://example.com?state=true')
  })

  it('参数不存在时保持原样', () => {
    const result = removeUrlSearchParams(testUrl, ['invalid_param'])
    expect(result).toBe(testUrl)
  })

  it('移除所有参数', () => {
    const result = removeUrlSearchParams(testUrl, true)
    expect(result).toBe('https://example.com')
  })

  it('处理空查询参数', () => {
    const result = removeUrlSearchParams('https://example.com', ['param'])
    expect(result).toBe('https://example.com')
  })

  it('兼容 hash 路径 URL', () => {
    const result = removeUrlSearchParams('https://example.com#/hash?param=1', [
      'param',
    ])
    expect(result).toBe('https://example.com#/hash')
  })

  it('普通锚点内的 `?` 不是查询串，不参与移除', () => {
    expect(
      removeUrlSearchParams('https://example.com#hash?param=1', ['param']),
    ).toBe('https://example.com#hash?param=1')
  })

  it('主体 search 与普通锚点内的 `?` 并存时，移除作用于主体', () => {
    expect(
      removeUrlSearchParams(
        'https://example.com/page?access_token=x&state=1#detail?x=1',
        ['access_token'],
      ),
    ).toBe('https://example.com/page?state=1#detail?x=1')
  })

  it('hash 路径内没有查询段时，主体 search 不参与移除', () => {
    const url = 'https://example.com/page?access_token=abc123#/dashboard'
    expect(removeUrlSearchParams(url, ['access_token'])).toBe(url)
    expect(removeUrlSearchParams(url, true)).toBe(url)
  })

  it('移除参数时保留 search 之后的锚点（hash 路径）', () => {
    const result = removeUrlSearchParams(
      'https://example.com/page?from=menu#/dashboard?access_token=abc123',
      ['access_token'],
    )
    expect(result).toBe('https://example.com/page?from=menu#/dashboard')
  })

  it('保留锚点及剩余参数（hash 路径）', () => {
    const result = removeUrlSearchParams(
      'https://example.com/?from=menu#/dashboard?access_token=abc123&state=1',
      ['access_token'],
    )
    expect(result).toBe('https://example.com/?from=menu#/dashboard?state=1')
  })

  it('移除所有参数时保留锚点（hash 路径）', () => {
    const result = removeUrlSearchParams(
      'https://example.com/?from=menu#/dashboard?access_token=abc123',
      true,
    )
    expect(result).toBe('https://example.com/?from=menu#/dashboard')
  })

  it('hash 优先 - 保留锚点外的 search，仅移除锚点内参数', () => {
    const result = removeUrlSearchParams(
      'https://example.com/page?token=1#/orders?tab=2',
      ['tab'],
    )
    expect(result).toBe('https://example.com/page?token=1#/orders')
  })

  it('处理 URL 对象输入并保留锚点', () => {
    const result = removeUrlSearchParams(
      new URL('https://example.com/page#/dashboard?token=1'),
      ['token'],
    )
    expect(result).toBe('https://example.com/page#/dashboard')
  })

  it('仅存在锚点时保持原样', () => {
    const result = removeUrlSearchParams(
      'https://example.com/page#/dashboard',
      ['param'],
    )
    expect(result).toBe('https://example.com/page#/dashboard')
  })

  it('处理重复参数', () => {
    const result = removeUrlSearchParams('https://example.com?a=1&a=2&b=3', [
      'a',
    ])
    expect(result).toBe('https://example.com?b=3')
  })

  it('处理特殊字符参数', () => {
    const result = removeUrlSearchParams(
      'https://example.com?filter%5B0%5D=value',
      ['filter[0]'],
    )
    expect(result).toBe('https://example.com')
  })

  it('多次调用一致性', () => {
    const intermediate = removeUrlSearchParams(testUrl, ['access_token'])
    const finalResult = removeUrlSearchParams(intermediate, ['state'])
    expect(finalResult).toBe('https://example.com?error=401')
  })
})
