import { joinUrl, rawQueryKey, splitRawQuery, splitUrl } from './urlParts'

/**
 * 合并查询串：只覆盖 `entries` 中的参数名，其余片段按原始文本逐字节保留
 */
function mergeRawQuery(
  rawQuery: string,
  entries: Iterable<readonly [string, string]>,
): string {
  const owned = new Map(entries)
  const kept = splitRawQuery(rawQuery).filter(
    (segment) => !owned.has(rawQueryKey(segment)),
  )
  // 交给 `URLSearchParams` 序列化，编码规则与其它 API 完全一致
  const added = [...owned].map(([key, value]) =>
    new URLSearchParams([[key, value]]).toString(),
  )

  return [...kept, ...added].join('&')
}

/**
 * 将参数写入 URL 并返回新地址
 *
 * 落点按「`#` 锚点是否以 `#/`、`#!` 开头」分流：
 *
 * | 目标形态 | 落点 | 结果 |
 * | --- | --- | --- |
 * | 无锚点 `/orders` | 主体 `search` | `/orders?a=1` |
 * | 普通锚点 `/page#detail` | 主体 `search`，锚点不动 | `/page?a=1#detail` |
 * | `hash` 路径 `/#/orders` | 锚点内的查询段 | `/#/orders?a=1` |
 *
 * `hash` 路径恒写进锚点内的查询段，因此写进去的参数一定读得回
 * （{@link resolveUrlSearchParams}），即便地址上原本有主体 `search`。同名的已有
 * 参数会被替换，其余内容按原始文本保留，不改写 `%20`、`+` 等既有写法。
 *
 * 写入的值按 `URLSearchParams` 规则编码，`#`、`?`、`&` 分别写成 `%23`、`%3F`、
 * `%26`，读回时按同一规则解码。
 *
 * @example
 * ```ts
 * writeUrlSearchParams('https://h/page?from=menu#detail', [['access_token', t]])
 * // => 'https://h/page?from=menu&access_token=t#detail'
 * ```
 */
export function writeUrlSearchParams(
  url: string | URL,
  entries: Iterable<readonly [string, string]>,
): string {
  const parts = splitUrl(url)

  return joinUrl(parts, mergeRawQuery(parts.query, entries))
}
