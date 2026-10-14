import { readUrlSearchParams } from './readUrlSearchParams'

/**
 * 根据 URL 获取 {@link URLSearchParams} 实例
 *
 * @deprecated 改用 {@link readUrlSearchParams}，行为完全一致。`resolve` 在 JS 里的
 * 惯用义是把描述符解析成具体值（`Promise.resolve`、`path.resolve`），而本函数只是
 * 把地址里的查询串取出来，与 {@link writeUrlSearchParams}、
 * {@link removeUrlSearchParams} 构成读、写、删一组，动词应统一为 `read`。
 *
 * 保留此名只为让既有调用方不必在同一版本内被迫修改，下个次版本会移除。迁移期按下
 * 面改写即可：
 *
 * ```diff
 * - import { resolveUrlSearchParams } from '@vue-spark/app-helpers/sso'
 * + import { readUrlSearchParams } from '@vue-spark/app-helpers/sso'
 * ```
 */
export function resolveUrlSearchParams(url: string | URL): URLSearchParams {
  return readUrlSearchParams(url)
}
