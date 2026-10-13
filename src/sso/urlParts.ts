/**
 * 判断 `#` 锚点是否是 `hash` 路径
 *
 * 锚点以 `#/`、`#!` 开头时，锚点原文按「路径 + 查询串」的形式书写，查询串由锚点内
 * 的第一个 `?` 分隔（如 `#/orders?tab=1`）；否则锚点整体只是一段原文，其中的 `?`
 * 不构成查询串（如 `#detail?d=3`）。
 *
 * 判据锚定开头两个字符，不能写成「锚点内含 `?`」——普通锚点里的 `?` 同样含 `?`，
 * 用「含 `?`」判定会把锚点原文误当作查询串。
 *
 * @param hash `#` 锚点原文（含 `#`），无锚点传空串
 */
export function isHashPath(hash: string): boolean {
  return hash.startsWith('#/') || hash.startsWith('#!')
}

/**
 * URL 分段结果
 *
 * 三段均为**原样文本**，查询串非空时精确往返：
 * `before + '?' + query + after === 原串`。
 * 因此重建时的插入位置恒为 `before` 与 `after` 之间，参数不会被追加到别处，
 * 也不会占用锚点原文。
 */
export interface UrlParts {
  /** 生效查询串之前的部分（含路径、主体 search、锚点路径） */
  before: string
  /** 生效查询串（不含 `?`），无则为空串 */
  query: string
  /** 生效查询串之后的原文（含锚点与被忽略的锚点部分） */
  after: string
}

/**
 * 定位「锚点部分」的起点：从 `from` 起第一个**非路径形式**的 `#`
 *
 * `#/`、`#!` 是嵌套地址（如查询值 `c=http://x/#/cad?e=1`）里的路径标记，仍属于值；
 * 只有后面既不是 `/` 也不是 `!` 的 `#` 才是锚点起点 —— 它之后的内容（含其中的
 * `?query`）不参与参数解析，但原样保留。
 *
 * @param raw URL 原文
 * @param from 起始扫描位置
 */
function findAnchorStart(raw: string, from: number): number {
  let index = raw.indexOf('#', from)

  while (index !== -1) {
    const next = raw[index + 1]
    if (next !== '/' && next !== '!') {
      return index
    }
    index = raw.indexOf('#', index + 1)
  }

  return -1
}

/**
 * `hash` 路径锚点内的查询段
 *
 * 查询段之后若出现锚点部分（非路径形式的 `#`），锚点部分落在 `after` 里。
 * 锚点内没有查询段时返回 `null`。
 *
 * @param raw URL 原文
 * @param hashIndex 第一个 `#` 的位置
 */
function splitHashPathQuery(raw: string, hashIndex: number): UrlParts | null {
  const hashQueryIndex = raw.indexOf('?', hashIndex)

  if (hashQueryIndex === -1) {
    return null
  }

  const anchorStart = findAnchorStart(raw, hashIndex + 1)

  if (anchorStart !== -1 && anchorStart < hashQueryIndex) {
    return null
  }

  const queryEnd = anchorStart === -1 ? raw.length : anchorStart

  return {
    before: raw.slice(0, hashQueryIndex),
    query: raw.slice(hashQueryIndex + 1, queryEnd),
    after: raw.slice(queryEnd),
  }
}

/**
 * `hash` 路径锚点内没有查询段时的插入位置：锚点部分之前
 *
 * 写入的参数落在这里，目标应用从 `location.hash` 解析即可读到。
 *
 * @param raw URL 原文
 * @param hashIndex 第一个 `#` 的位置
 */
function splitHashPathInsert(raw: string, hashIndex: number): UrlParts {
  const anchorStart = findAnchorStart(raw, hashIndex + 1)
  const insertAt = anchorStart === -1 ? raw.length : anchorStart

  return {
    before: raw.slice(0, insertAt),
    query: '',
    after: raw.slice(insertAt),
  }
}

/**
 * 主体 `search` 查询串
 *
 * 以**第一个** `?` 为界：`?` 允许作为查询串值的普通字符，故不能用
 * `lastIndexOf('?')` 定位分隔符，否则 `?redirect=/login?from=a` 会在值内部的
 * `?` 处被切断。锚点内的 `?` 不属于主体，因此命中位置必须落在 `#` 之前才算数。
 *
 * @param raw URL 原文
 * @param hashIndex 第一个 `#` 的位置（无锚点传 -1）
 */
function splitSearchQuery(raw: string, hashIndex: number): UrlParts {
  const searchQueryIndex = raw.indexOf('?')
  const hasSearchQuery =
    searchQueryIndex !== -1 &&
    (hashIndex === -1 || searchQueryIndex < hashIndex)

  if (!hasSearchQuery) {
    // 没有生效查询串时，`#` 及其之后的部分（含普通锚点内的 `?`）仍是锚点原文，
    // 必须留在 `after`，这样重建（写入查询串）时才能插到 `#` 之前而不是拼到锚点里。
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
 * 定位生效查询串（读取、写入、移除共用）
 *
 * **`hash` 路径优先且互斥**：`#/`、`#!` 开头的锚点一律以锚点内的查询段为准，
 * 主体 `search` **完全不参与** —— 锚点内没有查询段时生效查询串就是空串
 * （写入时插入点在锚点内、锚点部分之前，参数写进去后即可被读取）。
 *
 * 其余情况取主体 `search`（`?` 必须位于 `#` 之前）。
 *
 * 普通锚点内的 `?`（如 `#detail?d=3`）与 `hash` 路径查询段之后的锚点部分
 * （如 `…#/c/d?b=2#detail?d=3` 里的 `#detail?d=3`）都不是查询串，原样留在 `after`。
 *
 * @param url URL
 */
export function splitUrl(url: string | URL): UrlParts {
  const raw = url.toString()
  const hashIndex = raw.indexOf('#')

  if (hashIndex !== -1 && isHashPath(raw.slice(hashIndex))) {
    return (
      splitHashPathQuery(raw, hashIndex) ?? splitHashPathInsert(raw, hashIndex)
    )
  }

  return splitSearchQuery(raw, hashIndex)
}

/**
 * 用分段重建 URL；查询串为空时不保留孤立的 `?` 分隔符
 *
 * @param parts {@link splitUrl} 的结果
 */
export function joinUrl(parts: UrlParts): string {
  return `${parts.before}${parts.query ? `?${parts.query}` : ''}${parts.after}`
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
 * 借 `URLSearchParams` 完成解码，保证与读取侧的语义完全一致：
 * `+` 视为空格，非法编码序列原样保留（不抛异常）。
 *
 * @param segment 查询串片段（如 `filter%5B0%5D=value`）
 */
export function rawQueryKey(segment: string): string {
  return new URLSearchParams(segment).keys().next().value ?? ''
}
