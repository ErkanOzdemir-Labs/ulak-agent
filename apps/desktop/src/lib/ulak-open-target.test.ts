import { describe, expect, it } from 'vitest'

import {
  normalizeUlakOpenString,
  pathFromUlakDeepLink,
  pathFromOpenDeepLink,
  resolveUlakOpenPath
} from './ulak-open-target'

describe('normalizeUlakOpenString', () => {
  it('accepts hash-router paths and strips a leading hash', () => {
    expect(normalizeUlakOpenString('/index-network/intent/1')).toBe('/index-network/intent/1')
    expect(normalizeUlakOpenString('#/index-network/intent/1')).toBe('/index-network/intent/1')
  })

  it('maps plugin-scoped ulak:// deep links to the same path', () => {
    expect(normalizeUlakOpenString('ulak://index-network/intent/1')).toBe('/index-network/intent/1')
    expect(normalizeUlakOpenString('ulak://index-network/intent/1?focus=true')).toBe(
      '/index-network/intent/1?focus=true'
    )
  })

  it('maps ulak://open/… deep links by stripping the open host', () => {
    expect(normalizeUlakOpenString('ulak://open/index-network/intent/1')).toBe('/index-network/intent/1')
    expect(normalizeUlakOpenString('ulak://open/settings/plugins')).toBe('/settings/plugins')
  })

  it('rejects reserved ulak kinds and unsafe paths', () => {
    expect(normalizeUlakOpenString('ulak://blueprint/morning-brief')).toBeNull()
    expect(normalizeUlakOpenString('ulak://plugin/install')).toBeNull()
    expect(normalizeUlakOpenString('https://example.com/x')).toBeNull()
    expect(normalizeUlakOpenString('/../etc/passwd')).toBeNull()
    expect(normalizeUlakOpenString('index-network')).toBeNull()
  })
})

describe('resolveUlakOpenPath', () => {
  it('merges structured path + params', () => {
    expect(resolveUlakOpenPath({ path: '/index-network/intent/1', params: { focus: 'true' } })).toBe(
      '/index-network/intent/1?focus=true'
    )
  })

  it('resolves href the same as a bare string', () => {
    expect(resolveUlakOpenPath({ href: 'ulak://index-network/intent/1' })).toBe('/index-network/intent/1')
  })
})

describe('pathFromUlakDeepLink', () => {
  it('builds the navigate path from a plugin-scoped deep-link payload', () => {
    expect(pathFromUlakDeepLink('index-network', 'intent/1')).toBe('/index-network/intent/1')
  })

  it('builds the navigate path from ulak://open/… payloads', () => {
    expect(pathFromOpenDeepLink('index-network/intent/1')).toBe('/index-network/intent/1')
    expect(pathFromUlakDeepLink('open', 'agent/42')).toBe('/agent/42')
  })

  it('ignores reserved kinds', () => {
    expect(pathFromUlakDeepLink('blueprint', 'morning-brief')).toBeNull()
    expect(pathFromUlakDeepLink('plugin', 'install')).toBeNull()
  })
})
