# @vue-spark/app-helpers/permission

轻量级 Vue3 权限管理插件，专注于组件级权限控制。

## 安装

```sh
npm i @vue-spark/app-helpers
```

### 注册

```ts
// main.ts
import { createPermission } from '@vue-spark/app-helpers/permission'
import { createApp } from 'vue'

createApp().use(createPermission())
```

## 类型定义

```ts
declare const PERMISSION_CODE_ALL = '*'
type PermissionCodeAll = typeof PERMISSION_CODE_ALL

type PermissionCode = PermissionCodeAll | (string & {})

type PermissionOperator = 'or' | 'and'

interface Permission {
  /**
   * 全部已添加的权限编码列表
   */
  get codes(): readonly string[]
  /**
   * 添加权限编码
   */
  add: (codes: PermissionCode | PermissionCode[]) => void
  /**
   * 设置权限编码列表，将会完全覆盖已添加的权限编码列表
   */
  set: (codes: PermissionCode | PermissionCode[]) => void
  /**
   * 清空权限编码列表
   */
  clear: () => void
  /**
   * 检查权限编码
   * @param codes 权限编码
   * @param op 操作符，默认为 `or`
   * @returns 检查结果
   */
  check: (
    codes: PermissionCode | PermissionCode[],
    op?: PermissionOperator,
  ) => boolean
}
```

## 使用方式

### PermissionGuard

通过组件 `<PermissionGuard />` 来进行权限控制。

```html
<script setup lang="ts">
  import { usePermission, PermissionGuard } from '@vue-spark/app-helpers/permission'

  const permission = usePermission()
  permission.set(['list:add', 'list:edit', 'list:delete'])
</script>

<template>
  <!-- 仅当用户有权限时，才显示按钮 -->
  <PermissionGuard :codes="['list:delete']" op="or">
    <button>删除</button>
  </PermissionGuard>
</template>
```

### vPermission

通过 `v-permission` 指令来进行权限控制。

```html
<script setup lang="ts">
  import { vPermission, usePermission } from '@vue-spark/app-helpers/permission'

  const permission = usePermission()
  permission.set(['list:add', 'list:edit', 'list:delete'])
</script>

<template>
  <!-- 仅当用户有权限时，才显示按钮 -->
  <button v-permission:or="['list:delete']">删除</button>
</template>
```

### usePermission 或 $permission

```html
<script setup lang="ts">
  import { usePermission } from '@vue-spark/app-helpers/permission'

  const permission = usePermission()
  permission.set(['list:add', 'list:edit', 'list:delete'])
</script>

<template>
  <!-- 仅当用户有权限时，才显示按钮 -->
  <button v-if="permission.check(['list:delete'])">删除</button>

  <!-- 等价于 -->
  <button v-if="$permission.check('list:delete')">删除</button>
</template>
```
