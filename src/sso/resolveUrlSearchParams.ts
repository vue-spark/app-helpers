import { splitUrl } from './urlParts'

/**
 * 根据 URL 获取 {@link URLSearchParams} 实例
 *
 * 兼容 `hash` 路由模式，且 `hash` 优先：`#` 锚点内出现 `?` 时以锚点内的查询串为准，
 * 主体的 `search` 会被丢弃；否则解析主体的 `search`。
 * @param url URL
 */
export function resolveUrlSearchParams(url: string | URL): URLSearchParams {
  return new URLSearchParams(splitUrl(url).query)
}
