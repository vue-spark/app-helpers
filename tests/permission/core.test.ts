import { describe, expect, it } from 'vitest'
import { createPermission, PERMISSION_CODE_ALL } from '../../src/permission'

describe.concurrent('core', () => {
  it('初始化权限', () => {
    const permission = createPermission({ initialCodes: ['read'] })
    expect(permission.codes).toEqual(['read'])
  })

  it('添加权限', () => {
    const permission = createPermission()
    permission.add('read')
    permission.add(['write', 'delete'])
    expect(permission.codes).toContain('read')
    expect(permission.codes).toContain('write')
    expect(permission.codes).toContain('delete')
  })

  it('检查权限 - or 操作符', () => {
    const permission = createPermission({ initialCodes: ['read'] })
    expect(permission.check('read')).toBe(true)
    expect(permission.check(['write', 'read'])).toBe(true)
  })

  it('检查权限 - and 操作符', () => {
    const permission = createPermission({ initialCodes: ['read', 'write'] })
    expect(permission.check(['read', 'write'], 'and')).toBe(true)
    expect(permission.check(['read', 'delete'], 'and')).toBe(false)
  })

  it('拥有 ALL 权限时检查任何 code 都为 true', () => {
    const permission = createPermission()
    permission.add(PERMISSION_CODE_ALL)
    expect(permission.check('anyCode')).toBe(true)
  })

  it('替换权限', () => {
    const permission = createPermission()
    permission.set(['a', 'b'])
    expect(permission.codes).toEqual(['a', 'b'])
  })

  it('清除权限', () => {
    const permission = createPermission({ initialCodes: ['a'] })
    permission.clear()
    expect(permission.codes).toEqual([])
  })

  it('处理空权限情况', () => {
    const permission = createPermission()
    expect(permission.check('read')).toBe(false)
    expect(permission.check([])).toBe(false)
  })

  it('重复添加权限去重', () => {
    const permission = createPermission()
    permission.add(['a', 'a'])
    expect(permission.codes.length).toBe(1)
  })
})
