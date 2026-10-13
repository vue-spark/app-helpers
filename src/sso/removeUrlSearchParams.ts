import { joinUrl, rawQueryKey, splitRawQuery, splitUrl } from './urlParts'

/**
 * 移除 URL 中指定的参数
 *
 * 只作用于生效查询串（判据同 {@link resolveUrlSearchParams}）：`#/`、`#!` 锚点取
 * 锚点内的查询段，其余取主体 `search`。另一处查询串原样保留，不参与移除。
 *
 * 未被移除的内容按原始文本逐字节保留，不做解码与重编码，因此：
 * - 移除未命中的参数时返回与原串相同的 URL（仅当生效查询串因此变空时，孤立的 `?`
 *   会被去掉）；
 * - 不会改动 `%20`、`+`、无值参数 `?flag` 等写法，避免破坏覆盖原始查询串的签名。
 *
 * 参数名与**解码后**的名称比较，因此 `filter%5B0%5D` 会被 `['filter[0]']` 命中。
 * `params` 传 `true` 表示移除全部参数。
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
