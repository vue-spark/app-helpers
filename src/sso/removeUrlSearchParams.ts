import { isArray } from '@/utils'
import { resolveUrlSearchParams } from './resolveUrlSearchParams'

/**
 * 移除 URL 中指定的参数
 * @param url URL
 * @param params 需要移除的参数名列表，设为 `true` 表示移除所有参数
 */
export function removeUrlSearchParams(
  url: string | URL,
  params: true | string[],
): string {
  const searchParams = resolveUrlSearchParams(url)

  url = url.toString()
  if (url.includes('?')) {
    // 兼容 `hash` 模式
    url = url.slice(0, url.lastIndexOf('?'))
  }

  if (searchParams.size && isArray(params)) {
    params.forEach((param) => searchParams.delete(param))

    if (searchParams.size) {
      url += `?${searchParams}`
    }
  }

  return url
}
