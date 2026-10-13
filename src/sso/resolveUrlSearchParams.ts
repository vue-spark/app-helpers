import { splitUrl } from './urlParts'

/**
 * 根据 URL 获取 {@link URLSearchParams} 实例
 *
 * 生效查询串的定位与 {@link writeUrlSearchParams}、{@link removeUrlSearchParams}
 * 完全一致（`hash` 路径优先且互斥）：
 * - `#/`、`#!` 开头的锚点：取锚点内的查询段，主体 `search` **不参与**
 *   （锚点内没有查询段时生效查询串为空）；
 * - 其余情况：取主体的 `search`。
 *
 * 普通锚点内的 `?`（如 `#detail?d=3`）以及 `hash` 路径查询段之后的锚点部分
 * （如 `…/#/c/d?b=2#detail?d=3` 里的 `#detail?d=3`）都不是查询串，不参与解析。
 *
 * 查询值支持传入完整 URL（含 `#`、`?`，如 `c=http://x/#/cad?e=1`）：
 * 编码形式按 `URLSearchParams` 规则解码，`%23` 会还原成 `#`。
 * @param url URL
 */
export function resolveUrlSearchParams(url: string | URL): URLSearchParams {
  return new URLSearchParams(splitUrl(url).query)
}
