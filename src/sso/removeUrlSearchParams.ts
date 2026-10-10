import { joinUrl, splitUrl } from './urlParts'

/**
 * 移除 URL 中指定的参数
 *
 * 会完整保留 `#` 锚点（含 `hash` 路由模式下的锚点路径与剩余参数）。
 * @param url URL
 * @param params 需要移除的参数名列表，设为 `true` 表示移除所有参数
 */
export function removeUrlSearchParams(
  url: string | URL,
  params: true | string[],
): string {
  const parts = splitUrl(url)

  if (params === true) {
    return joinUrl(parts, '')
  }

  const searchParams = new URLSearchParams(parts.query)
  params.forEach((param) => searchParams.delete(param))

  return joinUrl(parts, searchParams.toString())
}
