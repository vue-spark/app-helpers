export const isArray: typeof Array.isArray = Array.isArray

export function ensureArray<T>(val: T | T[]): T[] {
  return isArray(val) ? val : [val]
}

export const assign: typeof Object.assign = Object.assign

export function isObject(val: any): val is Record<any, any> {
  return val !== null && typeof val === 'object'
}
