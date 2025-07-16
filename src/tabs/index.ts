import { shallowRef, triggerRef } from 'vue'
import { assign, isArray } from '@/utils'

type TabType = string
export type TabsSideType = 'left' | 'right'

export interface TabsHelperOptions<TabData extends {}> {
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

export interface TabsHelper<TabData extends {}> {
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
   * 添加标签和标签数据，遇到重复的标签将会跳过，否则会在添加后更新激活标签
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
   * 判断指定标签是否可以移除，若列表长度小于等于 `1` 则永久返回 `false`
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
   * 移除指定标签，若移除的是当前激活标签则移除前会自动激活下一个标签
   * @param tab 指定标签，默认为当前激活的标签
   */
  removeTab: (tab?: TabType) => Promise<void>
  /**
   * 移除除过指定标签的其他可移除的标签，并将指定标签设置为激活标签
   * @param tab 指定标签，默认为当前激活的标签
   */
  removeOtherTabs: (tab?: TabType) => Promise<void>
  /**
   * 移除指定标签的指定方向侧的所有可移除的标签，若当前激活的标签存在被移除的标签内，则将指定标签设置为激活标签
   * @param tab 指定标签，默认为当前激活的标签
   */
  removeSideTabs: (side: TabsSideType, tab?: TabType) => Promise<void>
}

const defaultOptions = {
  isRemovable: () => true,
  beforeRemove: () => true,
} satisfies TabsHelperOptions<{}>

export function createTabsHelper<TabData extends {}>(
  userOptions: TabsHelperOptions<TabData> = {},
): TabsHelper<TabData> {
  const options = assign({}, defaultOptions, userOptions)
  const activeTab = shallowRef<TabType>()
  const tabMap = shallowRef(new Map<TabType, TabData>())

  type _TabType = TabType | [tab: TabType, tabData: TabData]
  const getRealTab = (targetTab: _TabType): TabType => {
    return isArray(targetTab) ? targetTab[0] : targetTab
  }

  const canRemoveTab = (targetTab: _TabType): boolean => {
    if (tabMap.value.size <= 1) {
      return false
    }

    targetTab = getRealTab(targetTab)
    const tabData = tabMap.value.get(targetTab)
    return !tabData || options.isRemovable({ tab: targetTab, tabData })
  }

  const setTab = (targetTab: TabType, tabData: TabData): void => {
    tabMap.value.set(targetTab, assign({}, tabData))
    triggerRef(tabMap)
  }

  const removeTabs = (targetTabs: _TabType[]): void => {
    targetTabs.forEach((tab) => tabMap.value.delete(getRealTab(tab)))
    triggerRef(tabMap)
  }

  const setActiveTab = (targetTab: _TabType): void => {
    activeTab.value = getRealTab(targetTab)
  }

  const helper: TabsHelper<TabData> = {
    options,

    get activeTab() {
      return activeTab.value
    },
    set activeTab(targetTab) {
      setActiveTab(targetTab!)
    },

    getTabData(targetTab) {
      return tabMap.value.get(targetTab)
    },

    setTabData(targetTab, tabData) {
      helper.hasTab(targetTab) && setTab(targetTab, tabData)
    },

    getTabs() {
      return [...tabMap.value]
    },

    indexOf(targetTab) {
      return [...tabMap.value.keys()].indexOf(targetTab)
    },

    getSideTabs(targetTab, side) {
      const tabs = helper.getTabs()
      const index = helper.indexOf(targetTab)
      return side === 'left' ? tabs.slice(0, index) : tabs.slice(index + 1)
    },

    setTabs(tabs) {
      tabMap.value = new Map(tabs)
    },

    addTab(targetTab, tabData) {
      if (!helper.hasTab(targetTab)) {
        setTab(targetTab, tabData)
        setActiveTab(targetTab)
      }
    },

    hasTab(targetTab) {
      return tabMap.value.has(targetTab)
    },

    canRemoveTab(targetTab = helper.activeTab) {
      return !!targetTab && canRemoveTab(targetTab)
    },

    canRemoveOtherTabs(targetTab = helper.activeTab) {
      return (
        !!targetTab &&
        helper.getTabs().some(([tab]) => tab !== targetTab && canRemoveTab(tab))
      )
    },

    canRemoveSideTabs(side, targetTab = helper.activeTab) {
      return (
        !!targetTab && helper.getSideTabs(targetTab, side).some(canRemoveTab)
      )
    },

    async tryRemoveTabs(targetTabs) {
      let valid = tabMap.value.size > 0 && targetTabs.length > 0
      for (const targetTab of targetTabs) {
        const realTab = getRealTab(targetTab)
        try {
          const allowRemove = await options.beforeRemove({
            tab: realTab,
            // tabData 这里不能为空
            tabData: helper.getTabData(realTab)!,
          })
          valid = valid && !!allowRemove
        }
        catch {
          valid = false
        }

        if (!valid) {
          break
        }
      }
      return valid
    },

    async removeTab(targetTab = helper.activeTab) {
      if (
        tabMap.value.size <= 1 ||
        !targetTab ||
        !canRemoveTab(targetTab) ||
        !(await helper.tryRemoveTabs([targetTab]))
      ) {
        return
      }

      const tabs = helper.getTabs()
      const index = helper.indexOf(targetTab)
      const isActive = targetTab === helper.activeTab
      const nextTab = isActive ? tabs[index - 1] || tabs[index + 1] : null

      // 如果移除的是当前激活的，则设置下一个需要激活的标签
      nextTab && setActiveTab(nextTab)

      removeTabs([targetTab])
    },

    async removeOtherTabs(targetTab = helper.activeTab) {
      if (!targetTab) {
        return
      }

      const otherTabs = helper
        .getTabs()
        .filter(([tab]) => tab !== targetTab && canRemoveTab(tab))
      if (!(await helper.tryRemoveTabs(otherTabs))) {
        return
      }

      // 如果移除的不是当前激活的标签，则设置当前激活的标签为该标签
      targetTab !== helper.activeTab && setActiveTab(targetTab)

      removeTabs(otherTabs)
    },

    async removeSideTabs(side, targetTab = helper.activeTab) {
      if (!targetTab) {
        return
      }

      const sideTabs = helper.getSideTabs(targetTab, side).filter(canRemoveTab)
      if (!(await helper.tryRemoveTabs(sideTabs))) {
        return
      }

      const activeInSide =
        targetTab !== helper.activeTab &&
        sideTabs.some(([tab]) => tab === helper.activeTab)

      // 如果当前激活标签在该移除侧的标签中，则设置当前激活的标签为该标签
      activeInSide && setActiveTab(targetTab)

      removeTabs(sideTabs)
    },
  }

  return helper
}
