import assert from 'node:assert/strict'

import { test } from 'vitest'

import { hasWindowsPathPrefix, isUlakOwnedVenvDaemon } from './venv-holder-select'

const SCRIPTS = 'C:\\Ulak\\venv\\Scripts'

test('matches the hindsight daemon shim (exe under venv Scripts + hindsight cmdline)', () => {
  assert.equal(
    isUlakOwnedVenvDaemon(
      'C:\\Ulak\\venv\\Scripts\\pythonw.exe',
      'C:\\Ulak\\venv\\Scripts\\pythonw.exe -m hindsight_api.main --daemon --idle-timeout 300 --port 9177',
      SCRIPTS
    ),
    true
  )
})

test('Windows path prefix match is ordinal case-insensitive', () => {
  assert.equal(
    isUlakOwnedVenvDaemon(
      'c:\\ulak\\venv\\scripts\\python.exe',
      'python.exe -m hindsight_api.main --daemon',
      'C:\\Ulak\\venv\\Scripts'
    ),
    true
  )
})

test('excludes external venv holders that are not the hindsight daemon', () => {
  // a user terminal running the ulak CLI from the venv — must NOT be killed
  assert.equal(isUlakOwnedVenvDaemon('C:\\Ulak\\venv\\Scripts\\ulak.exe', 'ulak chat -q "hi"', SCRIPTS), false)
  // an unrelated python script using the venv interpreter
  assert.equal(
    isUlakOwnedVenvDaemon('C:\\Ulak\\venv\\Scripts\\python.exe', 'python C:\\tools\\import.py', SCRIPTS),
    false
  )
})

test('excludes exes outside the venv even when the cmdline mentions hindsight', () => {
  assert.equal(
    isUlakOwnedVenvDaemon('C:\\Other\\pythonw.exe', 'pythonw -m hindsight_api.main --daemon', SCRIPTS),
    false
  )
})

test('prefix boundary: sibling dirs (ScriptsX) do not match', () => {
  assert.equal(hasWindowsPathPrefix('C:\\Ulak\\venv\\ScriptsX\\python.exe', SCRIPTS), false)
  assert.equal(hasWindowsPathPrefix('C:\\Ulak\\venv\\Scripts\\python.exe', SCRIPTS), true)
})

test('null/undefined fields never match', () => {
  assert.equal(isUlakOwnedVenvDaemon(null, 'x', SCRIPTS), false)
  assert.equal(isUlakOwnedVenvDaemon('C:\\Ulak\\venv\\Scripts\\pythonw.exe', null, SCRIPTS), false)
  assert.equal(isUlakOwnedVenvDaemon(undefined, undefined, SCRIPTS), false)
})
