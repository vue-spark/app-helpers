# @vue-spark/app-helpers/tabs

为 Vue3 应用开发页面标签栏功能提供基础能力，可以适配任意格式的数据模型。

## 安装

```sh
npm i @vue-spark/app-helpers
```

## 使用方式

### 初始化

```ts
// src/modules/tabs.ts
import { createTabsHelper, type TabsHelper } from '@vue-spark/app-helpers/tabs'

// 可自由扩展标签关联数据
interface TabData {
  id: string
  name: string
  isFixed?: boolean
}

// 可自由扩展相关功能
interface Tabs extends TabsHelper<TabData> {
}

const tabs: Tabs = createTabsHelper<TabData>({
  // 判断标签是否可删除
  isRemovable: ({ tabData }) => !tabData.isFixed,
})

export { tabs }
```

### 布局组件

```html
<!-- Layout.vue -->
<script setup lang="ts">
  import { tabs } from '@/modules/tabs'
  import { watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'

  const router = useRouter()
  const route = useRoute()

  watch(
    () => route.fullPath,
    () => {
      if (!route.meta.id) {
        return
      }

      // 路由跳转时添加标签，内部会自动去重，并更新关联数据
      tabs.addTab(route.fullPath, {
        id: route.meta.id,
        name: route.meta.name,
        isFixed: route.meta.isFixed,
      })
    },
    { immediate: true },
  )

  watch(
    () => tabs.activeTab,
    () => {
      // 标签切换时，跳转路由
      route.fullPath !== tabs.activeTab && router.push(route.fullPath)
    },
  )
</script>

<template>
  <Tabs v-model="tabs.activeTab">
    <TabsItem v-for="[tab, tabData] in tabs.getTabs()" :key="tab">{{ tabData.name }}</TabsItem>
  </Tabs>
</template>
```

## 类型定义

````ts
type TabsSideType = 'left' | 'right'

interface TabsHelperOptions<TabData extends {}> {
  /**
   * 判断标签是否可移除，返回假值时，标签将不可移除
   * @example
   * ```ts
   * createTabsHelper({
   *   // 固定标签不可以移除
   *   isRemovable: ({ tabData }) => !tabData.isFixed
   * })
   * ```
   */
  isRemovable?: (ctx: { tab: TabType, tabData: TabData }) => boolean
  /**
   * 移除标签前触发，返回假值时阻止移除，返回 {@link Promise} 时若被 `reject` 也可以阻止移除，
   * 但是 `resolve` 时仍需返回真值
   * @example
   * ```ts
   * createTabsHelper({
   *   beforeRemove: ({ tabData }) => {
   *     return Modal.confirm(`确定要移除标签【${tabData.title}】吗？`).then(() => true)
   *   }
   * })
   * ```
   */
  beforeRemove?: (ctx: {
    tab: TabType
    tabData: TabData
  }) => boolean | Promise<boolean>
}

interface TabsHelper<TabData extends {}> {
  /**
   * 配置项
   */
  options: TabsHelperOptions<TabData>

  /**
   * 当前激活的标签
   */
  get activeTab(): TabType | undefined
  set activeTab(tab: TabType)

  /**
   * 获取标签数据
   * @param tab 标签
   */
  getTabData: (tab: TabType) => TabData | undefined
  /**
   * 设置标签数据，若标签不存在则跳过
   * @param tab 标签
   * @param tabData 标签数据
   */
  setTabData: (tab: TabType, tabData: TabData) => void

  /**
   * 获取所有标签和标签数据
   */
  getTabs: () => [tab: TabType, tabData: TabData][]
  /**
   * 设置所有标签和标签数据
   * @param tabs 标签和标签数据
   */
  setTabs: (tabs: [tab: TabType, tabData: TabData][]) => void

  /**
   * 获取指定标签的索引
   * @param tab 指定标签
   */
  indexOf: (tab: TabType) => number

  /**
   * 获取指定标签的指定方向侧所有标签和标签数据
   * @param tab 指定标签
   * @param side 指定方向侧
   */
  getSideTabs: (
    tab: TabType,
    side: TabsSideType,
  ) => [tab: TabType, tabData: TabData][]

  /**
   * 添加标签和标签数据，遇到重复的标签仅更新标签数据
   * @param tab 标签
   * @param tabData 标签数据
   */
  addTab: (tab: TabType, tabData: TabData) => void
  /**
   * 判断是否存在指定标签
   * @param tab 标签
   */
  hasTab: (tab: TabType) => boolean

  /**
   * 判断指定标签是否可以移除
   * @param tab 指定标签，默认为当前激活的标签
   */
  canRemoveTab: (tab?: TabType) => boolean
  /**
   * 判断除过指定标签的其他标签是否有可移除的标签
   * @param tab 指定标签，默认为当前激活的标签
   */
  canRemoveOtherTabs: (tab?: TabType) => boolean
  /**
   * 判断指定标签的指定方向侧是否有可移除的标签
   * @param tab 指定标签，默认为当前激活的标签
   */
  canRemoveSideTabs: (side: TabsSideType, tab?: TabType) => boolean

  /**
   * 尝试移除指定标签列表，只有返回真值才可以真正移除
   * @param tabs 标签列表
   */
  tryRemoveTabs: (
    tabs: (TabType | [tab: TabType, tabData: TabData])[],
  ) => Promise<boolean>

  /**
   * 移除指定标签
   * @param tab 指定标签，默认为当前激活的标签
   */
  removeTab: (tab?: TabType) => Promise<void>
  /**
   * 移除除过指定标签的其他可移除的标签
   * @param tab 指定标签，默认为当前激活的标签
   */
  removeOtherTabs: (tab?: TabType) => Promise<void>
  /**
   * 移除指定标签的指定方向侧的所有可移除的标签
   * @param tab 指定标签，默认为当前激活的标签
   */
  removeSideTabs: (side: TabsSideType, tab?: TabType) => Promise<void>
}
````
