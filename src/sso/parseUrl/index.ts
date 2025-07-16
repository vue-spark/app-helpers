import type { ParamRaw } from './param'
import type { ParamGroup, ParamGroupKey, ParamGroupsRaw } from './paramGroup'
import { isArray } from '@/utils'
import { removeUrlSearchParams } from '../removeUrlSearchParams'
import { resolveUrlSearchParams } from '../resolveUrlSearchParams'
import { normalizeParamGroups } from './paramGroup'

export * from './param'
export * from './paramGroup'

export interface ParseUrlOptions {
  /**
   * 被解析的 URL
   * @default window.location.href
   */
  url?: string | URL
  /**
   * 需要解析的参数组，数组时为默认组
   * @example
   * ```ts
   * // 使用默认分组
   * ['access_token', 'domain']
   *
   * // 自定义分组
   * {
   *   success: ['access_token', { name: 'domain', required: false }],
   *   error: ['error']
   * }
   * ```
   */
  paramGroups: ParamRaw[] | ParamGroupsRaw
}

export interface ParseUrlResult {
  /**
   * 验证成功的参数组
   */
  group: ParamGroup
  /**
   * 根据参数组提取的数据
   */
  data: Record<string, string | null>
  /**
   * 被解析的 URL
   */
  rawUrl: string | URL
  /**
   * 清理参数后的 URL
   */
  cleanUrl: string
}

const defaultGroupKey: ParamGroupKey = Symbol('default group')

/**
 * 根据参数组解析 URL 并返回结果
 * @param options 配置项
 *
 * @example
 * ```ts
 * const parsed = parseUrl({ paramGroups: ['access_token'] })
 * if (parsed) {
 *   localStorage.setItem('access_token', parsed.data.access_token)
 *   history.replaceState(null, '', parsed.cleanUrl)
 * }
 * ```
 */
export function parseUrl(options: ParseUrlOptions): ParseUrlResult | null {
  const { url = window.location.href, paramGroups: paramGroupsRaw } = options
  const searchParams = resolveUrlSearchParams(url)

  // If there are no parameters, return null
  if (!searchParams.size) {
    return null
  }

  const paramGroups = normalizeParamGroups(
    isArray(paramGroupsRaw)
      ? { [defaultGroupKey]: paramGroupsRaw }
      : paramGroupsRaw,
  )
  for (const group of paramGroups) {
    if (validateGroup(searchParams, group)) {
      return {
        group,
        data: pickGroupData(searchParams, group),
        rawUrl: url,
        cleanUrl: removeUrlSearchParams(
          url,
          group.params.map((p) => p.name),
        ),
      }
    }
  }

  return null
}

function pickGroupData(
  searchParams: URLSearchParams,
  group: ParamGroup,
): Record<string, string | null> {
  return group.params.reduce(
    (acc, param) => {
      acc[param.name] = searchParams.get(param.name)
      return acc
    },
    {} as Record<string, string | null>,
  )
}

function validateGroup(
  searchParams: URLSearchParams,
  group: ParamGroup,
): boolean {
  return (
    group.params.length > 0 &&
    group.params.every((param) => {
      if (!param.required) {
        return true
      }
      return searchParams.has(param.name)
    })
  )
}
