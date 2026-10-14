import { describe, expect, it } from 'vitest'
import { readUrlSearchParams, resolveUrlSearchParams } from '../../src/sso'

describe.concurrent('readUrlSearchParams', () => {
  it('解析基础查询参数', () => {
    const result = readUrlSearchParams(
      'https://example.com?access_token=abc123&state=true',
    )
    expect(result.get('access_token')).toBe('abc123')
    expect(result.get('state')).toBe('true')
  })

  it('无查询参数返回空实例', () => {
    const result = readUrlSearchParams('https://example.com')
    expect(result.toString()).toBe('')
  })

  it('仅有锚点、没有任何查询串时返回空实例', () => {
    const result = readUrlSearchParams('https://example.com/page#/dashboard')
    expect(result.toString()).toBe('')
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
    const url = new URL('https://example.com?param=1')
    const result = readUrlSearchParams(url)
    expect(result.get('param')).toBe('1')
  })

  it('多次调用独立实例', () => {
    const first = readUrlSearchParams('https://example.com?a=1')
    const second = readUrlSearchParams('https://example.com?b=2')
    expect(first.get('a')).toBe('1')
    expect(second.get('b')).toBe('2')
  })

  it('边缘情况 - 空输入', () => {
    const result = readUrlSearchParams('')
    expect(result.toString()).toBe('')
  })

  it('边缘情况 - 无效 URL', () => {
    const result = readUrlSearchParams('invalid-url?param=1')
    expect(result.get('param')).toBe('1')
  })
})

describe.concurrent(
  'resolveUrlSearchParams（已废弃，转发到 readUrlSearchParams）',
  () => {
    it('两者读到同一份参数', () => {
      const url = 'https://example.com?access_token=abc#/orders?tab=1'
      expect([...resolveUrlSearchParams(url)]).toEqual([
        ...readUrlSearchParams(url),
      ])
    })

    it('返回值是 URLSearchParams 实例，可继续用 get / has', () => {
      const result = resolveUrlSearchParams('https://example.com?a=1&a=2')
      expect(result).toBeInstanceOf(URLSearchParams)
      expect(result.get('a')).toBe('1')
      expect(result.getAll('a')).toEqual(['1', '2'])
      expect(resolveUrlSearchParams('https://example.com').has('a')).toBe(false)
    })

    it('hash 路径判据与 read 一致', () => {
      const url = 'https://h/?access_token=body#/orders?access_token=hash'
      expect(resolveUrlSearchParams(url).get('access_token')).toBe('hash')
    })
  },
)
