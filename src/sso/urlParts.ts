/**
 * URL 分段结果。
 *
 * 以「生效的查询串」为界切分为三段。`before` 与 `after` 均为原样文本，
 * 因此重建时可以完整保留 `#` 锚点（含 `hash` 路由模式下的锚点路径）。
 *
 * 查询串非空时，三段精确往返：
 * `before + '?' + query + after === 原串`。
 * 因此重建时的插入位置恒为 `before` 与 `after` 之间：查询串在锚点内时，
 * `before` 已包含锚点路径与 `#`，插入点落在锚点内部；查询串在主体 `search` 时，
 * 插入点落在 `#` 之前。两种情况下参数都不会被追加到 `#` 之后。
 *
 * 查询串为空时不保留孤立的 `?` 分隔符（如 `…/a?` 归一为 `…/a`），
 * 因为此时它不承载任何内容。
 */
export interface UrlParts {
  /**
   * 生效查询串之前的部分
   *
   * 当查询串位于锚点内时，包含锚点路径（如 `https://h/#/orders`）。
   */
  before: string
  /**
   * 生效的查询串（不含 `?`）
   */
  query: string
  /**
   * 生效查询串之后的部分
   *
   * 查询串位于锚点内时为空串；否则为 `#` 及其之后的原文（无锚点时为 `''`）。
   */
  after: string
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

  // `hash` 优先：锚点内出现 `?` 时查询串位于锚点内，锚点内不再有剩余部分
  if (hashQueryIndex !== -1) {
    return {
      before: raw.slice(0, hashQueryIndex),
      query: raw.slice(hashQueryIndex + 1),
      after: '',
    }
  }

  // 否则取主体的 `search`：以**第一个** `?` 为界。
  // `?` 允许作为查询串值的普通字符，故不能用 `lastIndexOf('?')` 定位分隔符，
  // 否则 `?redirect=/login?from=a` 会在值内部的 `?` 处被切断。
  // 上面的分支已保证锚点内不存在 `?`，因此这里找到的 `?` 必然位于 `#` 之前。
  const searchQueryIndex = raw.indexOf('?')

  if (searchQueryIndex === -1) {
    // 没有查询串时，`#` 及其之后的部分仍是锚点，必须留在 `after`，
    // 这样重建（写入查询串）时才能插到 `#` 之前而不是拼到锚点里。
    return {
      before: hashIndex === -1 ? raw : raw.slice(0, hashIndex),
      query: '',
      after: hashIndex === -1 ? '' : raw.slice(hashIndex),
    }
  }

  const queryEnd = hashIndex === -1 ? raw.length : hashIndex

  return {
    before: raw.slice(0, searchQueryIndex),
    query: raw.slice(searchQueryIndex + 1, queryEnd),
    after: hashIndex === -1 ? '' : raw.slice(hashIndex),
  }
}

/**
 * 使用给定的查询串重建 URL
 *
 * @param parts {@link splitUrl} 的结果
 * @param query 查询串（不含 `?`），传空串表示不保留 `?`
 */
export function joinUrl(parts: UrlParts, query: string): string {
  return `${parts.before}${query ? `?${query}` : ''}${parts.after}`
}

/**
 * 按 `&` 切分查询串，保留每个片段的原始文本（不做解码与重编码）
 * @param query 查询串（不含 `?`）
 */
export function splitRawQuery(query: string): string[] {
  return query === '' ? [] : query.split('&')
}

/**
 * 取出查询串片段的参数名并解码
 *
 * 借 `URLSearchParams` 完成解码，保证与 `resolveUrlSearchParams` 的语义完全一致：
 * `+` 视为空格，非法编码序列原样保留（不抛异常）。
 *
 * @param segment 查询串片段（如 `filter%5B0%5D=value`）
 */
export function rawQueryKey(segment: string): string {
  return new URLSearchParams(segment).keys().next().value ?? ''
}
