import { isObject } from '@antfu/utils'

// eslint-disable-next-line slop/no-trivial-type-aliases
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
  return params.map(p =>
    Object.assign({ required: true }, !isObject(p) ? { name: p } : p),
  )
}
