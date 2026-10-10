/**
 * URL 分段结果。
 *
 * 仅以「生效的查询串」为界切分为三段，`before` 与 `after` 均为原样文本，
 * 因此重建时可以完整保留 `#` 锚点（含 `hash` 路由模式下的锚点路径）。
 */
export interface UrlParts {
  /**
   * 生效查询串之前的部分（`hash` 模式下包含锚点路径）
   */
  before: string
  /**
   * 生效查询串之后的部分（通常为 `#` 锚点）
   */
  after: string
  /**
   * 生效的查询串（不含 `?`）
   */
  query: string
}

/**
 * 切分 URL 并定位生效的查询串。
 *
 * 兼容 `hash` 路由模式，且以 `hash` 优先：
 * 当 `#` 锚点内出现 `?` 时，以锚点内的查询串为准，主体的 `search` 会被丢弃；
 * 锚点内没有查询串时，才使用主体的 `search`。
 *
 * @param url URL
 */
export function splitUrl(url: string | URL): UrlParts {
  const raw = url.toString()
  const hashIndex = raw.indexOf('#')
  // `#` 锚点内的第一个 `?`
  const hashQueryIndex = hashIndex === -1 ? -1 : raw.indexOf('?', hashIndex)

  // `hash` 优先
  const useHash = hashQueryIndex !== -1
  const queryIndex = useHash ? hashQueryIndex : raw.lastIndexOf('?')
  // 主体的 `search` 在 `#` 之前结束
  const queryEnd = useHash || hashIndex === -1 ? raw.length : hashIndex

  if (queryIndex === -1 || queryIndex >= queryEnd) {
    return { before: raw, after: '', query: '' }
  }

  return {
    before: raw.slice(0, queryIndex),
    after: raw.slice(queryEnd),
    query: raw.slice(queryIndex + 1, queryEnd),
  }
}

/**
 * 使用给定的查询串重建 URL
 * @param parts {@link splitUrl} 的结果
 * @param query 查询串（不含 `?`），传空串表示不保留 `?`
 */
export function joinUrl(parts: UrlParts, query: string): string {
  return `${parts.before}${query ? `?${query}` : ''}${parts.after}`
}
