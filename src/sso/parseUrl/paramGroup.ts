import type { Param, ParamRaw } from './param'
import { normalizeParams } from './param'

export type ParamGroupKey = PropertyKey

export interface ParamGroup {
  /**
   * 参数组标识
   */
  key: ParamGroupKey
  /**
   * 参数组的参数配置列表
   */
  params: Param[]
}

export type ParamGroupsRaw = Record<ParamGroupKey, ParamRaw[]>

export function normalizeParamGroups(groups: ParamGroupsRaw): ParamGroup[] {
  return Reflect.ownKeys(groups).map((key) => ({
    key,
    params: normalizeParams(groups[key]),
  }))
}
