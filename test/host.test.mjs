/**
 * Regression guard for the 2026-11-05 incident: the host half used to persist
 * its read mode with `session.append('read-guard/mode', …)`, which writes an
 * event the persistence read path refuses (no `ignorable: true`), bricking the
 * whole session log on the next open.
 *
 * These tests pin the two properties that keep that from coming back:
 *   1. the host never calls `session.append()` for its own state;
 *   2. the `readPolicy` projection still folds both the new `plugin:` record and
 *      legacy rows already present in old logs.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const home = mkdtempSync(join(tmpdir(), 'read-guard-test-'))
process.env.DSH_HOME = home

const defineModule = () => import('../lib/index.js')

/** Minimal Context stand-in: only the seams `apply()` actually touches. */
function fakeContext(captured) {
  const services = {
    sessionProjections: {
      register(definition) {
        captured.projection = definition
        return () => {}
      },
      stateOf() {
        return undefined
      },
    },
    commands: {
      register(definition) {
        captured.commands.set(definition.name, definition)
        return () => {}
      },
    },
  }
  return {
    on() {},
    get(name) {
      return services[name]
    },
    inject(_names, callback) {
      callback(services)
    },
    effect(callback) {
      return callback()
    },
  }
}

function fakeConfig(overrides = {}) {
  const values = { allow: ['C:\\allowed'], defaultReadMode: 'list', ...overrides }
  // `config.<key>.get()` is how a volatile field is read.
  return new Proxy(values, {
    get(target, key) {
      const value = target[key]
      return { get: () => value }
    },
  })
}

function fakeSession(appended) {
  return {
    id: 'session-test',
    header: { cwd: process.cwd() },
    append(type, data) {
      appended.push({ type, data })
      throw new Error(`session.append() must not be used for plugin state (type "${type}")`)
    },
  }
}

test('host half never appends its own event type', async () => {
  const captured = { commands: new Map(), projection: undefined }
  const appended = []
  const module = await defineModule()
  module.apply(fakeContext(captured), fakeConfig())
  const read = captured.commands.get('read')
  assert.ok(read, '/read command was not registered')

  const result = await read.handler({ agent: { session: fakeSession(appended) }, rawInput: 'workspace' })
  assert.equal(result.kind, 'success')
  assert.deepEqual(appended, [], 'session.append() was called — this is what corrupts the log')
  // The dsh-session mapping is absent outside the harness, so the mode must
  // degrade to "this session only" instead of failing the command.
  assert.match(result.text, /workspace/)
})

test('readPolicy folds the ignorable record and the legacy event type', async () => {
  const captured = { commands: new Map(), projection: undefined }
  const module = await defineModule()
  module.apply(fakeContext(captured), fakeConfig())
  const { apply } = captured.projection
  const initial = { mode: null }
  const empty = { mode: null }

  assert.deepEqual(apply(initial, { type: 'plugin:read-guard/mode', data: { mode: 'full' } }), { mode: 'full' })
  assert.deepEqual(apply(initial, { type: 'read-guard/mode', data: { mode: 'workspace' } }), { mode: 'workspace' })
  assert.equal(apply(empty, { type: 'turn/start', data: { turn: 3 } }), empty, 'unrelated events must reuse the reference')
})

test('invalid mode input is rejected without touching the session', async () => {
  const captured = { commands: new Map(), projection: undefined }
  const appended = []
  const module = await defineModule()
  module.apply(fakeContext(captured), fakeConfig())
  const result = await captured.commands.get('read').handler({
    agent: { session: fakeSession(appended) },
    rawInput: 'everything',
  })
  assert.equal(result.kind, 'error')
  assert.deepEqual(appended, [])
})

test('declares the dsh-session peer so a link: install can resolve it', () => {
  // The host redirects a linked plugin's bare imports only for names the plugin
  // declares as peerDependencies; without that entry the dynamic import falls
  // through to Node's native resolution and fails ("Cannot find package").
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.ok(manifest.peerDependencies?.['@deepseek-ai/dsh-session'], 'package.json must declare @deepseek-ai/dsh-session as a peer')
})

test('an audit line records why persistence degraded', async () => {
  const captured = { commands: new Map(), projection: undefined }
  const module = await defineModule()
  module.apply(fakeContext(captured), fakeConfig())
  await captured.commands.get('read').handler({ agent: { session: fakeSession([]) }, rawInput: 'list' })
  const log = readFileSync(join(home, 'read-guard.log'), 'utf8')
  assert.match(log, /"kind":"plugin-record-api"/)
})

/* ------------------------------------------------------------------ */
/* Tool gate: allow / ask / deny, grants and their turn reset          */
/* ------------------------------------------------------------------ */

const SESSION_ID = 'session-gate'
const CWD = 'C:\\ws'

function gateHarness(state = {}) {
  const captured = { commands: new Map(), projection: undefined, listeners: new Map() }
  const services = {
    sessionProjections: {
      register(definition) {
        captured.projection = definition
        return () => {}
      },
      stateOf(_session, key) {
        return state[key]
      },
    },
    commands: {
      register(definition) {
        captured.commands.set(definition.name, definition)
        return () => {}
      },
    },
    workingDirectory: {
      async ensure() {
        return CWD
      },
    },
  }
  const ctx = {
    on(name, listener) {
      captured.listeners.set(name, listener)
    },
    get(name) {
      return services[name]
    },
    inject(_names, callback) {
      callback(services)
    },
    effect(callback) {
      return callback()
    },
  }
  return { ctx, captured, state }
}

const gateExec = (path, callId) => ({
  name: 'read',
  arguments: { file_path: path },
  callId,
  agent: { session: { id: SESSION_ID, header: { cwd: CWD } } },
})

/** Run the `tools/pre-execute` waterfall for one call. */
const runGate = (captured, exec) => captured.listeners.get('tools/pre-execute')(exec, () => 'next')

const grant = (captured, decision, callId) =>
  captured.commands.get('read-grant').handler({
    agent: { session: { id: SESSION_ID } },
    rawInput: `${decision} ${callId}`,
  })

test('gate: list mode passes allowlisted paths and asks outside', async () => {
  const module = await defineModule()
  const { ctx, captured } = gateHarness()
  module.apply(ctx, fakeConfig({ allow: ['C:\\allowed'], defaultReadMode: 'list' }))

  assert.equal(await runGate(captured, gateExec('C:\\allowed\\note.txt', 'c1')), 'next')
  const outside = await runGate(captured, gateExec('C:\\Windows\\win.ini', 'c2'))
  assert.equal(outside.kind, 'ask')
  assert.match(outside.reason, /^read-guard:/)
})

test('gate: workspace and full modes', async () => {
  const module = await defineModule()
  const { ctx, captured, state } = gateHarness()
  module.apply(ctx, fakeConfig({ allow: ['C:\\allowed'], defaultReadMode: 'list' }))

  state.readPolicy = { mode: 'workspace' }
  assert.equal(await runGate(captured, gateExec(`${CWD}\\in.txt`, 'w1')), 'next')
  assert.equal((await runGate(captured, gateExec('C:\\allowed\\out.txt', 'w2'))).kind, 'ask')

  state.readPolicy = { mode: 'full' }
  assert.equal(await runGate(captured, gateExec('C:\\Windows\\win.ini', 'f1')), 'next')
})

test('gate: a task grant applies to the folder for the rest of the turn', async () => {
  const module = await defineModule()
  const { ctx, captured } = gateHarness()
  module.apply(ctx, fakeConfig({ allow: ['C:\\allowed'], defaultReadMode: 'list' }))

  const first = await runGate(captured, gateExec('C:\\Windows\\win.ini', 'call-allow'))
  assert.equal(first.kind, 'ask')
  assert.equal((await grant(captured, 'allow', 'call-allow')).kind, 'success')

  assert.equal(await runGate(captured, gateExec('C:\\Windows\\other.ini', 'call-2')), 'next')
  // A different folder is still outside.
  assert.equal((await runGate(captured, gateExec('C:\\Program Files\\x.txt', 'call-3'))).kind, 'ask')
})

test('gate: a task deny rejects without asking and resets next turn', async () => {
  const module = await defineModule()
  const { ctx, captured } = gateHarness()
  module.apply(ctx, fakeConfig({ allow: ['C:\\allowed'], defaultReadMode: 'list' }))

  await runGate(captured, gateExec('C:\\Windows\\win.ini', 'call-deny'))
  assert.equal((await grant(captured, 'deny', 'call-deny')).kind, 'success')

  const denied = await runGate(captured, gateExec('C:\\Windows\\other.ini', 'call-2'))
  assert.equal(denied.kind, 'deny')
  assert.match(denied.reason, /本任务已拒绝读取/)

  // New user turn drops the grant.
  captured.listeners.get('session/event')({ id: SESSION_ID }, { type: 'turn/start', data: { turn: 2 } })
  const nextTurn = await runGate(captured, gateExec('C:\\Windows\\other.ini', 'call-3'))
  assert.equal(nextTurn.kind, 'ask')
})

test('read-grant rejects a foreign or unknown call', async () => {
  const module = await defineModule()
  const { ctx, captured } = gateHarness()
  module.apply(ctx, fakeConfig())

  assert.equal((await grant(captured, 'allow', 'nope')).kind, 'error')
  assert.equal((await grant(captured, 'maybe', 'nope')).kind, 'error')
})

test('read status reports the current mode', async () => {
  const module = await defineModule()
  const { ctx, captured } = gateHarness()
  module.apply(ctx, fakeConfig({ defaultReadMode: 'workspace' }))
  const status = await captured.commands.get('read').handler({
    agent: { session: { id: SESSION_ID } },
    rawInput: 'status',
  })
  assert.equal(status.kind, 'success')
  assert.match(status.text, /workspace/)
})
