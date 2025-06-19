import { describe, expect, it } from 'vitest'
import { watch } from 'vue'
import { createTabsHelper } from '../../src/tabs'

describe.concurrent('tabs', () => {
  interface TabData {
    title?: string
    isFixed?: boolean
    isRemovable?: boolean
  }

  it('addTab 添加新标签并设置为激活状态', () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('tab1', { title: 'A' })
    expect(helper.getTabs()).toEqual([['tab1', { title: 'A' }]])
    expect(helper.activeTab).toBe('tab1')
  })

  it('addTab 更新已存在的标签数据', () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('tab1', { title: 'Old' })
    helper.addTab('tab1', { title: 'New' })
    expect(helper.getTabData('tab1')?.title).toBe('New')
    expect(helper.activeTab).toBe('tab1')
  })

  it('setTabData 更新已存在标签数据', () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('tab1', { title: 'Old' })
    helper.setTabData('tab1', { title: 'New' })
    expect(helper.getTabData('tab1')?.title).toBe('New')
  })

  it('hasTab 返回标签是否存在', () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('tab1', {})
    expect(helper.hasTab('tab1')).toBe(true)
    expect(helper.hasTab('tab2')).toBe(false)
  })

  it('getTabs 返回所有标签和数据', () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('tab1', { title: 'A' })
    helper.addTab('tab2', { title: 'B' })
    expect(helper.getTabs()).toEqual([
      ['tab1', { title: 'A' }],
      ['tab2', { title: 'B' }],
    ])
  })

  it('indexOf 返回标签的索引', () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('tab1', {})
    helper.addTab('tab2', {})
    expect(helper.indexOf('tab1')).toBe(0)
    expect(helper.indexOf('tab2')).toBe(1)
    expect(helper.indexOf('tab3')).toBe(-1)
  })

  it('getSideTabs 返回指定方向侧的标签', () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('a', { title: 'A' })
    helper.addTab('b', { title: 'B' })
    helper.addTab('c', { title: 'C' })

    expect(helper.getSideTabs('b', 'left')).toEqual([['a', { title: 'A' }]])
    expect(helper.getSideTabs('b', 'right')).toEqual([['c', { title: 'C' }]])
  })

  it('canRemoveTab 当只有一个标签时返回 false', () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('tab1', {})
    expect(helper.canRemoveTab('tab1')).toBe(false)
  })

  it('canRemoveTab 尊重 isRemovable 配置', () => {
    const helper = createTabsHelper<TabData>({
      isRemovable: ({ tabData }) => tabData.isFixed !== true,
    })

    helper.addTab('tab1', { isFixed: true })
    helper.addTab('tab2', { isFixed: false })

    expect(helper.canRemoveTab('tab1')).toBe(false)
    expect(helper.canRemoveTab('tab2')).toBe(true)
  })

  it('tryRemoveTabs 当 beforeRemove 抛出错误时返回 false', async () => {
    const helper = createTabsHelper<TabData>({
      beforeRemove: () => Promise.reject(new Error('Cancel')),
    })
    helper.addTab('tab1', {})
    helper.addTab('tab2', {})

    const result = await helper.tryRemoveTabs(['tab1'])
    expect(result).toBe(false)
  })

  it('removeTab 移除当前标签并激活下一个标签', async () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('tab1', {})
    helper.addTab('tab2', {})
    helper.addTab('tab3', {})

    helper.activeTab = 'tab1'
    await helper.removeTab('tab1')

    expect(helper.getTabs()).toEqual([
      ['tab2', {}],
      ['tab3', {}],
    ])
    expect(helper.activeTab).toBe('tab2')
  })

  it('removeTab 当 beforeRemove 返回 false 时不移除标签', async () => {
    const helper = createTabsHelper<TabData>({
      beforeRemove: () => false,
    })
    helper.addTab('tab1', {})
    helper.addTab('tab2', {})
    await helper.removeTab('tab1')
    expect(helper.getTabs()).toEqual([
      ['tab1', {}],
      ['tab2', {}],
    ])
  })

  it('removeOtherTabs 移除其他可移除标签', async () => {
    const helper = createTabsHelper<TabData>({
      isRemovable: ({ tabData }) => !tabData.isFixed,
    })
    helper.addTab('a', { isFixed: false })
    helper.addTab('b', { isFixed: true })
    helper.addTab('c', { isFixed: false })

    helper.activeTab = 'a'
    await helper.removeOtherTabs('c')

    expect(helper.getTabs()).toEqual([
      ['b', { isFixed: true }],
      ['c', { isFixed: false }],
    ])
    expect(helper.activeTab).toBe('c')
  })

  it('removeOtherTabs 当无其他可移除标签时不执行', async () => {
    const helper = createTabsHelper<TabData>({
      isRemovable: ({ tabData }) => !tabData.isFixed,
    })
    helper.addTab('tab1', { isFixed: true })
    helper.addTab('tab2', { isFixed: true })

    await helper.removeOtherTabs('tab1')
    expect(helper.getTabs()).toEqual([
      ['tab1', { isFixed: true }],
      ['tab2', { isFixed: true }],
    ])
  })

  it('removeSideTabs 移除左侧标签', async () => {
    const helper = createTabsHelper<TabData>()
    helper.addTab('a', {})
    helper.addTab('b', {})
    helper.addTab('c', {})

    helper.activeTab = 'a'
    await helper.removeSideTabs('left', 'b')

    expect(helper.getTabs()).toEqual([
      ['b', {}],
      ['c', {}],
    ])
    expect(helper.activeTab).toBe('b')
  })

  it('自定义选项覆盖默认行为', () => {
    const customOptions = {
      isRemovable: ({ tabData }) => tabData.isRemovable,
      beforeRemove: () => Promise.resolve(true),
    }

    const helper = createTabsHelper<TabData>(customOptions)
    helper.addTab('tab1', { isRemovable: false })
    helper.addTab('tab2', { isRemovable: true })

    expect(helper.canRemoveTab('tab1')).toBe(false)
  })

  it('activeTab 响应式更新', () => {
    const helper = createTabsHelper<TabData>()

    let activeTab: string | undefined
    watch(
      () => helper.activeTab,
      () => {
        activeTab = helper.activeTab
      },
      { immediate: true, flush: 'sync' },
    )

    expect(activeTab).toBeUndefined()

    helper.addTab('tab1', {})
    expect(activeTab).toBe('tab1')

    helper.addTab('tab2', {})
    expect(activeTab).toBe('tab2')
  })
})
