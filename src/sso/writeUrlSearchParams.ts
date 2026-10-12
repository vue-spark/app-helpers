import { rawQueryKey, splitRawQuery } from './urlParts'

/**
 * 判断 `#` 锚点是否是 `hash` 路由
 *
 * 判据锚定锚点开头的两个字符（`#/` 或 `#!`），不能写成「锚点内含 `?`」——
 * 已损坏的地址（如 `#detail?access_token=…`）同样含 `?`，
 * 用「含 `?`」判定会把锚点误判为路由，导致参数继续写入锚点。
 *
 * @param hash `#` 锚点原文（含 `#`），无锚点传空串
 */
export function isHashRoute(hash: string): boolean {
  return hash.startsWith('#/') || hash.startsWith('#!')
}

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
 * **落点规则**（按「`#` 锚点是否是 `hash` 路由」分流）：
 *
 * | 目标形态 | 落点 | 结果 |
 * | --- | --- | --- |
 * | 无锚点 `/orders` | 查询串 | `/orders?a=1` |
 * | 普通锚点 `/page#detail` | 查询串，锚点不动 | `/page?a=1#detail` |
 * | `hash` 路由 `/#/orders` | 锚点内的查询段 | `/#/orders?a=1` |
 *
 * 这样写入的参数对**目标形态对应的读者**可达：无锚点与普通锚点写入真实查询串
 * （`location.search` 可读），`hash` 路由写入锚点内查询段（`route.query` 可读）；
 * 并且普通锚点 `#detail` 不会被参数占用，页面内跳转保持有效。
 *
 * 除写入的键以外，其余参数与锚点按**原始文本**保留，不做解码与重编码，
 * 因此不会被搬到别的分段，也不会改写 `%20`、`+` 等既有写法。
 *
 * 注意：若目标带普通锚点且锚点内**已有**查询串（如 `#detail?x=1`，通常由历史
 * 错误拼接产生），写入仍按普通锚点处理、把参数放进真实查询串；但
 * {@link resolveUrlSearchParams} 遵循 `hash` 优先，会读锚点内的查询串而读不到
 * 这些参数。该形态与合法 `hash` 路由在语法上不可区分，故不做自动纠正。
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
  const raw = url.toString()
  const pairs = [...entries]
  const hashIndex = raw.indexOf('#')
  const hash = hashIndex === -1 ? '' : raw.slice(hashIndex)

  if (isHashRoute(hash)) {
    // 落点 = 锚点内的查询段，主体 search 完全不碰
    const queryIndex = hash.indexOf('?')
    const routePath =
      queryIndex === -1 ? hash.slice(1) : hash.slice(1, queryIndex)
    const rawQuery = queryIndex === -1 ? '' : hash.slice(queryIndex + 1)
    const query = mergeRawQuery(rawQuery, pairs)

    return `${raw.slice(0, hashIndex)}#${routePath}${query ? `?${query}` : ''}`
  }

  // 落点 = 查询串；锚点原样保留在末尾，不会被参数占用
  const body = hashIndex === -1 ? raw : raw.slice(0, hashIndex)
  const queryIndex = body.indexOf('?')
  const path = queryIndex === -1 ? body : body.slice(0, queryIndex)
  const rawQuery = queryIndex === -1 ? '' : body.slice(queryIndex + 1)
  const query = mergeRawQuery(rawQuery, pairs)

  return `${path}${query ? `?${query}` : ''}${hash}`
}
