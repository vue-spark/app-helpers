import { describe, expect, it } from 'vitest'
import { resolveUrlSearchParams } from '../../src/sso'

describe.concurrent('resolveUrlSearchParams', () => {
  it('解析基础查询参数', () => {
    const result = resolveUrlSearchParams(
      'https://example.com?access_token=abc123&state=true',
    )
    expect(result.get('access_token')).toBe('abc123')
    expect(result.get('state')).toBe('true')
  })

  it('处理 hash 路径锚点中的参数', () => {
    const result = resolveUrlSearchParams(
      'https://example.com#/hash?param=1&key=value',
    )
    expect(result.get('param')).toBe('1')
    expect(result.get('key')).toBe('value')
  })

  it('普通锚点内的 `?` 不是查询串', () => {
    const result = resolveUrlSearchParams(
      'https://example.com#hash?param=1&key=value',
    )
    expect(result.toString()).toBe('')
  })

  it('普通锚点内的 `?` 不遮蔽主体 search', () => {
    const result = resolveUrlSearchParams(
      'https://example.com/page?body=1#detail?x=1',
    )
    expect(Object.fromEntries(result)).toEqual({ body: '1' })
  })

  it('hash 路径内没有查询段时，主体 search 不参与', () => {
    const result = resolveUrlSearchParams(
      'https://example.com/page?access_token=abc123#/dashboard',
    )
    expect(result.has('access_token')).toBe(false)
  })

  it('hash 路径优先 - 锚点内有查询段时主体 search 被忽略', () => {
    const result = resolveUrlSearchParams(
      'https://example.com/page?token=1#/orders?tab=2',
    )
    expect(result.get('tab')).toBe('2')
    expect(result.has('token')).toBe(false)
  })

  it('hash 路径：取锚点内查询段', () => {
    const result = resolveUrlSearchParams(
      'https://example.com/page?token=1#/orders?tab=2',
    )
    expect(result.get('tab')).toBe('2')
    expect(result.has('token')).toBe(false)
  })

  it('无查询参数返回空实例', () => {
    const result = resolveUrlSearchParams('https://example.com')
    expect(result.toString()).toBe('')
  })

  it('仅有锚点、没有任何查询串时返回空实例', () => {
    const result = resolveUrlSearchParams('https://example.com/page#/dashboard')
    expect(result.toString()).toBe('')
  })

  it('解析编码字符', () => {
    const result = resolveUrlSearchParams(
      'https://example.com?filter%5B0%5D=value',
    )
    // 自动解码 `%5B` 为 `[`
    expect(result.get('filter[0]')).toBe('value')
  })

  it('保留重复参数的所有值', () => {
    const result = resolveUrlSearchParams('https://example.com?a=1&a=2&b=3')
    expect(result.getAll('a')).toEqual(['1', '2'])
    expect(result.get('b')).toBe('3')
  })

  it('处理 URL 对象输入', () => {
    const url = new URL('https://example.com?param=1')
    const result = resolveUrlSearchParams(url)
    expect(result.get('param')).toBe('1')
  })

  it('多次调用独立实例', () => {
    const first = resolveUrlSearchParams('https://example.com?a=1')
    const second = resolveUrlSearchParams('https://example.com?b=2')
    expect(first.get('a')).toBe('1')
    expect(second.get('b')).toBe('2')
  })

  it('边缘情况 - 空输入', () => {
    const result = resolveUrlSearchParams('')
    expect(result.toString()).toBe('')
  })

  it('边缘情况 - 无效 URL', () => {
    const result = resolveUrlSearchParams('invalid-url?param=1')
    expect(result.get('param')).toBe('1')
  })
})
