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

  it('兼容 hash 模式 URL', () => {
    const result = removeUrlSearchParams('https://example.com#hash?param=1', [
      'param',
    ])
    expect(result).toBe('https://example.com#hash')
  })

  it('移除参数时保留 search 之后的锚点', () => {
    const result = removeUrlSearchParams(
      'https://example.com/page?access_token=abc123#/dashboard',
      ['access_token'],
    )
    expect(result).toBe('https://example.com/page#/dashboard')
  })

  it('保留锚点及剩余参数', () => {
    const result = removeUrlSearchParams(
      'https://example.com/?access_token=abc123&state=1#/dashboard',
      ['access_token'],
    )
    expect(result).toBe('https://example.com/?state=1#/dashboard')
  })

  it('移除所有参数时保留锚点', () => {
    const result = removeUrlSearchParams(
      'https://example.com/?access_token=abc123#/dashboard',
      true,
    )
    expect(result).toBe('https://example.com/#/dashboard')
  })

  it('hash 优先 - 保留锚点外的 search，仅移除锚点内参数', () => {
    const result = removeUrlSearchParams(
      'https://example.com/page?token=1#/route?tab=2',
      ['tab'],
    )
    expect(result).toBe('https://example.com/page?token=1#/route')
  })

  it('处理 URL 对象输入并保留锚点', () => {
    const result = removeUrlSearchParams(
      new URL('https://example.com/page?token=1#/dashboard'),
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
