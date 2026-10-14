import { splitUrl } from './urlParts'

/**
 * 根据 URL 获取 {@link URLSearchParams} 实例
 *
 * `#/`、`#!` 锚点优先且互斥：取锚点内的查询段，主体 `search` 完全不参与，锚点内
 * 没有查询段时生效查询串为空（此时应用只解析 `location.hash`，主体 `search` 对它
 * 不可见）。其余情况取主体 `search`。
 *
 * 普通锚点内的 `?`（如 `#detail?d=3`）与锚点部分（如 `…/#/c/d?b=2#detail?d=3`
 * 里的 `#detail?d=3`）都不是查询串。写入落点与清理范围同此判据，见
 * {@link writeUrlSearchParams} 与 {@link removeUrlSearchParams}。
 */
export function readUrlSearchParams(url: string | URL): URLSearchParams {
  return new URLSearchParams(splitUrl(url).query)
}
