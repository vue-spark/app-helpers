import type { Permission } from './core'
import { inject, type InjectionKey } from 'vue'

export const permissionKey: InjectionKey<Permission> = Symbol('permission key')

/**
 * Inject permission instance
 */
export function usePermission(): Permission {
  return inject(permissionKey)!
}
