import { type App, type ShallowReactive, shallowRef, triggerRef } from 'vue'
import { ensureArray } from '@/utils'
import { permissionKey } from './injection'

export const PERMISSION_CODE_ALL = '*'

export type PermissionCodeAll = typeof PERMISSION_CODE_ALL
export type PermissionCode = PermissionCodeAll | (string & {})

export type PermissionOperator = 'or' | 'and'

export interface Permission {
  get codes(): ShallowReactive<readonly string[]>
  add: (codes: PermissionCode | PermissionCode[]) => void
  set: (codes: PermissionCode | PermissionCode[]) => void
  clear: () => void
  /**
   * check permission
   * @param codes permission codes
   * @param op check permission operator, default is 'or'
   * @returns whether the user has permission
   */
  check: (codes: PermissionCode | PermissionCode[], op?: PermissionOperator) => boolean
  install: (app: App) => void
}

export interface PermissionOptions {
  /**
   * initial permission codes
   */
  initialCodes?: PermissionCode | PermissionCode[]
}

/**
 * Create permission instance
 * @param options permission options
 */
export function createPermission(options: PermissionOptions = {}): Permission {
  const codeSet = shallowRef(new Set(ensureArray(options.initialCodes ?? [])))
  const permission: Permission = {
    get codes() {
      return [...codeSet.value]
    },
    add(codes) {
      ensureArray(codes).forEach(code => codeSet.value.add(code))
      triggerRef(codeSet)
    },
    set(codes) {
      codeSet.value = new Set(ensureArray(codes))
    },
    clear() {
      codeSet.value = new Set()
    },
    check(codes, op = 'or') {
      if (codeSet.value.has(PERMISSION_CODE_ALL))
        return true

      if (codeSet.value.size === 0)
        return false

      return ensureArray(codes)[op === 'and' ? 'every' : 'some'](code => codeSet.value.has(code))
    },
    install(app) {
      app.config.globalProperties.$permission = permission
      app.provide(permissionKey, permission)
      app.onUnmount(() => permission.clear())
    },
  }
  return permission
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $permission: Permission
  }
}
