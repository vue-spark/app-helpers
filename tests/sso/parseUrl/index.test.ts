import { describe, expect, it } from 'vitest'
import { parseUrl } from '../../../src/sso'

describe.concurrent('parse-url', () => {
  const testUrl = 'https://example.com?access_token=abc123&state=true'

  it('解析默认参数组', () => {
    const result = parseUrl({
      url: testUrl,
      paramGroups: ['access_token'],
    })

    expect(result).toBeTruthy()
    expect(result?.data.access_token).toBe('abc123')
    expect(typeof result?.group.key).toBe('symbol')
  })

  it('解析自定义参数组 - 成功匹配', () => {
    const result = parseUrl({
      url: testUrl,
      paramGroups: {
        success: ['access_token', { name: 'state', required: false }],
        error: ['error'],
      },
    })

    expect(result?.group.key).toBe('success')
    expect(result?.data.state).toBe('true')
    expect(result?.cleanUrl).toBe('https://example.com')
  })

  it('解析自定义参数组 - 错误匹配', () => {
    const result = parseUrl({
      url: testUrl.replace('access_token=abc123&state=true', 'error=true'),
      paramGroups: {
        success: ['access_token', { name: 'state', required: false }],
        error: ['error'],
      },
    })

    expect(result?.group.key).toBe('error')
    expect(result?.data.error).toBe('true')
    expect(result?.cleanUrl).toBe('https://example.com')
  })

  it('必填参数验证失败', () => {
    const result = parseUrl({
      url: testUrl.replace('access_token=abc123', ''),
      paramGroups: ['access_token'],
    })

    expect(result).toBeNull()
  })

  it('清理 URL 参数', () => {
    const result = parseUrl({
      url: testUrl,
      paramGroups: ['access_token'],
    })

    expect(result?.cleanUrl).toBe('https://example.com?state=true')
  })

  it('处理空参数情况', () => {
    const result = parseUrl({
      url: 'https://example.com',
      paramGroups: ['access_token'],
    })

    expect(result).toBeNull()
  })
})
