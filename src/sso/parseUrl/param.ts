import { assign, isObject } from '@/utils'

export type ParamName = string

export interface Param {
  /**
   * 参数名称
   */
  name: ParamName
  /**
   * 该参数是否必填
   * @default true
   */
  required?: boolean
}

export type ParamRaw = ParamName | Param

export function normalizeParams(params: ParamRaw[]): Param[] {
  return params.map(p => assign({ required: true }, !isObject(p) ? { name: p } : p))
}
