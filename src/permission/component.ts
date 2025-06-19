import type { AllowedComponentProps, ComponentCustomProps, VNodeProps } from 'vue'
import type { PermissionCode, PermissionOperator } from './core'
import { defineComponent } from 'vue'
import { usePermission } from './injection'

export interface PermissionGuardProps {
  codes: PermissionCode | PermissionCode[]
  /**
   * check permission operator
   * @default 'or'
   */
  op?: PermissionOperator
}

const PermissionGuardImpl = /* #__PURE__ */ defineComponent({
  name: 'PermissionGuard',
  props: {
    codes: {
      type: [String, Array],
      required: true,
    },
    op: {
      type: String,
      default: 'or',
    },
  },
  setup(props: PermissionGuardProps, { slots }) {
    const permission = usePermission()
    return () => {
      return slots.default && permission.check(props.codes, props.op) ? slots.default() : null
    }
  },
})

/**
 * A component to guard permission
 * @example
 * ```html
 * <script setup lang="ts">
 * import { usePermission, PermissionGuard } from '@vue-spark/app-helpers/permission'
 *
 * const permission = usePermission()
 * permission.set(['list:add', 'list:edit', 'list:delete'])
 * </script>
 *
 * <template>
 *   <!-- only show when user has permission -->
 *   <PermissionGuard :codes="['list:delete']" op="or">
 *     <button>Delete</button>
 *   </PermissionGuard>
 * </template>
 * ```
 */
export const PermissionGuard = PermissionGuardImpl as unknown as {
  new (): {
    $props: AllowedComponentProps & ComponentCustomProps & VNodeProps & PermissionGuardProps
  }
}
