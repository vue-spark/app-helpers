import type { Directive } from 'vue'
import type { Permission, PermissionCode, PermissionOperator } from './core'

/**
 * A permission directive
 * @example
 * ```html
 * <script setup lang="ts">
 * import { vPermission, usePermission } from '@vue-spark/app-helpers/permission'
 *
 * const permission = usePermission()
 * permission.set(['list:add', 'list:edit', 'list:delete'])
 * </script>
 *
 * <template>
 *   <!-- only show when user has permission -->
 *   <button v-permission:or="['list:delete']">Delete</button>
 * </template>
 * ```
 */
export const vPermission: Directive<
  Element,
  PermissionCode | PermissionCode[],
  string,
  PermissionOperator
> = {
  mounted(el, binding) {
    const { value, arg, instance } = binding
    const permission = instance && (instance.$permission as Permission | null)
    if (!permission || !permission.check(value, arg)) {
      el.remove()
    }
  },
}
