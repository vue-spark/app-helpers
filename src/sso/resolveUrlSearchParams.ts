/**
 * 根据 URL 获取 {@link URLSearchParams} 实例
 * @param url URL
 */
export function resolveUrlSearchParams(url: string | URL): URLSearchParams {
  const urlString = url.toString()
  // 兼容 `hash` 模式
  return new URLSearchParams(
    urlString.includes('?') ? urlString.slice(urlString.lastIndexOf('?')) : '',
  )
}
