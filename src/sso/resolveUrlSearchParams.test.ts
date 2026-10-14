import { describe, expect, it } from 'vitest'
import { readUrlSearchParams } from './readUrlSearchParams'
import { resolveUrlSearchParams } from './resolveUrlSearchParams'

describe('resolveUrlSearchParams（已废弃）', () => {
  it('转发到 readUrlSearchParams，读到同一份参数', () => {
    // hash 路径形态：两者都不看主体 search
    const url = 'https://h/?access_token=body#/orders?access_token=hash&tab=1'
    expect([...resolveUrlSearchParams(url)]).toEqual([
      ...readUrlSearchParams(url),
    ])
    // 转发之外，值本身也要对：与委托对象比较抓不到 read 内部的错误
    expect(resolveUrlSearchParams(url).get('access_token')).toBe('hash')
    expect(resolveUrlSearchParams(url).get('tab')).toBe('1')
  })

  it('返回 URLSearchParams 实例，可继续用 get / has / getAll', () => {
    const result = resolveUrlSearchParams('https://example.com?a=1&a=2')
    expect(result).toBeInstanceOf(URLSearchParams)
    expect(result.get('a')).toBe('1')
    expect(result.getAll('a')).toEqual(['1', '2'])
    expect(resolveUrlSearchParams('https://example.com').has('a')).toBe(false)
  })
})
