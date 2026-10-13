import { joinUrl, rawQueryKey, splitRawQuery, splitUrl } from './urlParts'

/**
 * 合并查询串：只覆盖 `entries` 中的参数名，其余片段按原始文本逐字节保留
 *
 * @param rawQuery 现有查询串（不含 `?`）
 * @param entries 需要写入的键值对
 */
function mergeRawQuery(
  rawQuery: string,
  entries: readonly (readonly [string, string])[],
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
 * **落点规则**（按「`#` 锚点是否以 `#/`、`#!` 开头」分流）：
 *
 * | 目标形态 | 目标应用读者 | 落点 | 结果 |
 * | --- | --- | --- | --- |
 * | 无锚点 `/orders` | `location.search` | 查询串 | `/orders?a=1` |
 * | 普通锚点 `/page#detail` | `location.search` | 查询串，锚点不动 | `/page?a=1#detail` |
 * | `hash` 路径 `/#/orders` | `location.hash` | 锚点内的查询段 | `/#/orders?a=1` |
 *
 * `hash` 路径查询段之后若还有锚点部分（如 `…/#/c/d?b=2#detail?d=3`），
 * 参数插在查询段末尾、锚点部分之前，锚点原文逐字节保留。
 *
 * 除写入的键以外，其余内容按**原始文本**保留，不做解码与重编码，因此不会被搬到
 * 别的分段，也不会改写 `%20`、`+` 等既有写法。写入的值按 `URLSearchParams` 规则
 * 编码（`#`、`?`、`&` 会写成 `%23`、`%3F`、`%26`），读回时按同一规则解码，
 * 因此值里可以安全地放完整 URL。
 *
 * 读取（{@link resolveUrlSearchParams}）与移除（{@link removeUrlSearchParams}）
 * 使用同一判据，写入的参数一定读得回、也删得掉：`hash` 路径内原本没有查询段时，
 * 参数写进锚点内的查询段，读取与移除随即作用于同一处。
 *
 * @param url URL
 * @param entries 需要写入的键值对（同名的已有参数会被替换）
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

  return joinUrl({ ...parts, query: mergeRawQuery(parts.query, [...entries]) })
}
