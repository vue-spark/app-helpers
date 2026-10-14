/**
 * 判断 `#` 锚点是否是 `hash` 路径
 *
 * 锚点以 `#/`、`#!` 开头时按「路径 + 查询串」书写，查询串由锚点内的第一个 `?`
 * 分隔（如 `#/orders?tab=1`）。其余锚点只是一段原文，其中的 `?` 不构成查询串
 * （如 `#detail?d=3`）。判据只看开头两个字符，用「锚点内含 `?`」判定会把
 * `#detail?d=3` 这类原文误当作查询串。
 */
export function isHashPath(hash: string): boolean {
  return hash.startsWith('#/') || hash.startsWith('#!')
}

/**
 * URL 分段结果
 *
 * 三段都是原样文本，查询串非空时精确往返：`before + '?' + query + after === 原串`。
 * 重建位置恒为 `before` 与 `after` 之间，参数不会落到别处，也不会占用锚点原文。
 */
export interface UrlParts {
  /** 生效查询串之前的部分，含路径、主体 `search` 与锚点路径 */
  before: string
  /** 生效查询串，不含 `?` */
  query: string
  /** 生效查询串之后的原文，含锚点与被忽略的锚点部分 */
  after: string
}

/**
 * 定位锚点部分的起点：从 `from` 起第一个非路径形式的 `#`
 *
 * `#/`、`#!` 是嵌套地址里的路径标记（如查询值 `c=http://x/#/cad?e=1`），仍属于值，
 * 因此跳过。它之后的内容不参与参数解析，原样保留。
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

/** `#/`、`#!` 锚点的查询分段；锚点内没有查询分段时 `query` 为空串 */
function splitHashPath(raw: string, hashIndex: number): UrlParts {
  const anchorStart = findAnchorStart(raw, hashIndex + 1)
  const limit = anchorStart === -1 ? raw.length : anchorStart
  const queryIndex = raw.indexOf('?', hashIndex)

  if (queryIndex === -1 || queryIndex > limit) {
    return { before: raw.slice(0, limit), query: '', after: raw.slice(limit) }
  }

  return {
    before: raw.slice(0, queryIndex),
    query: raw.slice(queryIndex + 1, limit),
    after: raw.slice(limit),
  }
}

/** `#/`、`#!` 锚点的分段；锚点不是路径形式时为 `null` */
function splitIfHashPath(raw: string, hashIndex: number): UrlParts | null {
  if (hashIndex === -1 || !isHashPath(raw.slice(hashIndex))) {
    return null
  }

  return splitHashPath(raw, hashIndex)
}

/**
 * 主体 `search` 分段
 *
 * 以第一个 `?` 为界。`?` 可以是查询值的普通字符，用 `lastIndexOf('?')` 定位会把
 * `?redirect=/login?from=a` 在值内部切断。锚点内的 `?` 不属于主体，命中位置必须
 * 落在 `#` 之前才算数。
 */
function splitSearchQuery(raw: string, hashIndex: number): UrlParts {
  const searchQueryIndex = raw.indexOf('?')
  const hasSearchQuery
    = searchQueryIndex !== -1
      && (hashIndex === -1 || searchQueryIndex < hashIndex)

  if (!hasSearchQuery) {
    // 锚点原文留在 `after`，重建时才能插到 `#` 之前
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
 * `#/`、`#!` 锚点优先且互斥：只取锚点内的查询段，主体 `search` 完全不参与，锚点内
 * 没有查询段时生效查询串就是空串（写入仍落锚点内、锚点部分之前，写进去的参数随即
 * 读得回）。其余情况取主体 `search`，`?` 必须落在 `#` 之前。
 *
 * 普通锚点内的 `?`（`#detail?d=3`）与锚点部分（`…#/c/d?b=2#detail?d=3` 里的
 * `#detail?d=3`）都不是查询串。
 */
export function splitUrl(url: string | URL): UrlParts {
  const raw = url.toString()
  const hashIndex = raw.indexOf('#')

  return splitIfHashPath(raw, hashIndex) ?? splitSearchQuery(raw, hashIndex)
}

/** 用分段与查询串重建 URL；查询串为空时不保留孤立的 `?` */
export function joinUrl(parts: UrlParts, query: string): string {
  return `${parts.before}${query ? `?${query}` : ''}${parts.after}`
}

/**
 * 按 `&` 切分查询串，保留每个片段的原始文本
 */
export function splitRawQuery(query: string): string[] {
  return query === '' ? [] : query.split('&')
}

/**
 * 取出查询串片段的参数名并解码
 *
 * 借 `URLSearchParams` 完成解码，与读取侧语义一致：`+` 视为空格，非法编码序列
 * 原样保留，不抛异常。
 */
export function rawQueryKey(segment: string): string {
  return new URLSearchParams(segment).keys().next().value ?? ''
}
