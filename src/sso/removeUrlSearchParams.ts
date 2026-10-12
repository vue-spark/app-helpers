import { joinUrl, rawQueryKey, splitRawQuery, splitUrl } from './urlParts'

/**
 * 移除 URL 中指定的参数
 *
 * 会完整保留 `#` 锚点（含 `hash` 路由模式下的锚点路径与剩余参数）。
 *
 * 未被移除的参数按**原始文本**逐字节保留，不做解码与重编码，因此：
 * - 移除未命中的参数时返回与原串相同的 URL（除空查询串的孤立 `?` 会被归一）；
 * - 不会改动 `%20`、`+`、无值参数 `?flag` 等写法，避免破坏覆盖原始查询串的签名。
 *
 * 参数名与**解码后**的名称比较，因此 `filter%5B0%5D` 会被 `['filter[0]']` 命中。
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

  const target = new Set(params)
  const kept = splitRawQuery(parts.query).filter(
    (segment) => !target.has(rawQueryKey(segment)),
  )

  return joinUrl(parts, kept.join('&'))
}
