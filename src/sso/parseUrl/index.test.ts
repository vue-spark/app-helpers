import { describe, expect, it } from 'vitest'
import { parseUrl } from './index'

describe.concurrent('parse-url', () => {
  const testUrl = 'https://example.com?access_token=abc123&state=true'

  it('解析默认参数组，并清理 URL 中的参数', () => {
    const result = parseUrl({
      url: testUrl,
      paramGroups: ['access_token'],
    })

    expect(result).toBeTruthy()
    expect(result?.data.access_token).toBe('abc123')
    expect(typeof result?.group.key).toBe('symbol')
    expect(result?.cleanUrl).toBe('https://example.com?state=true')
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

  it('清理参数时保留锚点', () => {
    const result = parseUrl({
      url: 'https://example.com/?from=menu#/dashboard?access_token=abc123',
      paramGroups: ['access_token'],
    })

    expect(result?.data.access_token).toBe('abc123')
    expect(result?.cleanUrl).toBe('https://example.com/?from=menu#/dashboard')
  })

  it('hash 路径形态 - 解析锚点内参数并保留锚点', () => {
    const result = parseUrl({
      url: 'https://example.com/#/dashboard?access_token=abc123',
      paramGroups: ['access_token'],
    })

    expect(result?.data.access_token).toBe('abc123')
    expect(result?.cleanUrl).toBe('https://example.com/#/dashboard')
  })

  it('没有可解析的参数时返回 null', () => {
    // 无参数
    expect(
      parseUrl({ url: 'https://example.com', paramGroups: ['access_token'] }),
    ).toBeNull()
    // hash 路径内没有查询段时，主体 search 不作为参数来源
    expect(
      parseUrl({
        url: 'https://example.com/?access_token=abc123#/dashboard',
        paramGroups: ['access_token'],
      }),
    ).toBeNull()
  })

  it('返回完整解析结果快照', () => {
    expect(
      parseUrl({
        url: testUrl,
        paramGroups: {
          success: ['access_token', { name: 'state', required: false }],
          error: ['error'],
        },
      }),
    ).toMatchSnapshot()
  })
})
