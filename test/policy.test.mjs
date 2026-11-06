import assert from 'node:assert/strict'
import { test } from 'node:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  DEFAULT_ALLOW,
  candidates,
  compileRoots,
  decideRead,
  expandPath,
  expandVars,
  grantKeyFor,
  insideAny,
  rootsForMode,
  shellPaths,
} from '../lib/policy.js'

const WS = 'C:\\work\\demo'
const ALLOW = [
  WS,
  'C:\\work',
  'C:\\Users\\me\\.dsh',
  'C:\\Users\\me\\.ssh',
]

const exec = (name, args) => ({ name, arguments: args })
const decide = ({ exec, ...opts }) =>
  decideRead({ exec, cwd: WS, mode: opts.mode ?? 'list', allow: ALLOW, grants: opts.grants })

test('list mode: allowlist inside passes', () => {
  assert.equal(decide({ exec: exec('read', { file_path: 'C:\\Users\\me\\.ssh\\config' }) }), null)
})

test('list mode: workspace inside passes', () => {
  assert.equal(decide({ exec: exec('read', { file_path: join(WS, 'a.txt') }) }), null)
})

test('list mode: outside asks with marker', () => {
  const d = decide({ exec: exec('read', { file_path: 'C:\\Windows\\win.ini' }) })
  assert.equal(d.kind, 'ask')
  assert.match(d.reason, /^read-guard:/)
  assert.match(d.reason, /win\.ini/)
})

test('workspace mode: allowlisted but outside workspace asks', () => {
  const d = decide({ exec: exec('read', { file_path: 'C:\\Users\\me\\.ssh\\config' }), mode: 'workspace' })
  assert.equal(d.kind, 'ask')
})

test('workspace mode: workspace path passes', () => {
  assert.equal(decide({ exec: exec('read', { file_path: join(WS, 'x.md') }), mode: 'workspace' }), null)
})

test('full mode: everything passes', () => {
  assert.equal(decide({ exec: exec('read', { file_path: 'C:\\Windows\\win.ini' }), mode: 'full' }), null)
})

test('rootsForMode shapes', () => {
  assert.equal(rootsForMode('full', ALLOW, WS), null)
  assert.deepEqual(rootsForMode('workspace', ALLOW, WS).length, 1)
  const roots = rootsForMode('list', ALLOW, WS)
  assert.equal(roots.length, ALLOW.length + 1)
  assert.ok(roots.every((root) => Array.isArray(root.segments) && typeof root.pattern === 'string'))
  assert.equal(roots[roots.length - 1].pattern, WS)
  assert.equal(compileRoots(ALLOW).length, ALLOW.length)
})

test('allowlist supports ~ and environment variables', () => {
  assert.equal(insideAny(join(homedir(), '.dsh', 'config.toml'), ['~/.dsh']), true)
  process.env.READ_GUARD_HOME = homedir()
  assert.equal(insideAny(join(homedir(), '.ssh', 'config'), ['%READ_GUARD_HOME%/.ssh']), true)
  assert.equal(insideAny(join(homedir(), '.ssh', 'config'), ['$READ_GUARD_HOME/.ssh']), true)
  assert.equal(insideAny(join(homedir(), '.ssh', 'config'), ['$env:READ_GUARD_HOME/.ssh']), true)
  delete process.env.READ_GUARD_HOME
  assert.equal(expandPath('~/x'), join(homedir(), 'x'))
})

test('allowlist supports * and ** wildcards', () => {
  // `*` matches one directory level, and everything below it stays allowed.
  assert.equal(insideAny('C:\\proj\\alpha\\notes.md', ['C:\\proj\\*']), true)
  assert.equal(insideAny('C:\\proj\\alpha\\deep\\notes.md', ['C:\\proj\\*']), true)
  assert.equal(insideAny('C:\\other\\alpha\\notes.md', ['C:\\proj\\*']), false)
  // A trailing literal pins the depth.
  assert.equal(insideAny('C:\\proj\\alpha\\data\\x.md', ['C:\\proj\\*\\data']), true)
  assert.equal(insideAny('C:\\proj\\alpha\\deep\\data\\x.md', ['C:\\proj\\*\\data']), false)
  // `**` crosses any number of levels.
  assert.equal(insideAny('C:\\proj\\a\\b\\c\\data\\x.md', ['C:\\proj\\**\\data']), true)
  assert.equal(insideAny('C:\\proj\\a\\data\\x.md', ['C:\\proj\\**\\data']), true)
  // `?` is a single character.
  assert.equal(insideAny('C:\\tmp\\a1\\x', ['C:\\tmp\\a?']), true)
  assert.equal(insideAny('C:\\tmp\\a12\\x', ['C:\\tmp\\a?']), false)
})

test('wildcard entries work through decideRead', () => {
  const allow = ['C:\\proj\\*']
  const inside = decideRead({
    exec: exec('read', { file_path: 'C:\\proj\\alpha\\notes.md' }),
    cwd: WS,
    mode: 'list',
    allow,
  })
  assert.equal(inside, null)
  const outside = decideRead({
    exec: exec('read', { file_path: 'C:\\elsewhere\\notes.md' }),
    cwd: WS,
    mode: 'list',
    allow,
  })
  assert.equal(outside.kind, 'ask')
})

test('turn grant allow suppresses the ask', () => {
  const target = 'C:\\Windows\\win.ini'
  const grants = { allow: new Set([grantKeyFor(target)]), deny: new Set() }
  assert.equal(decide({ exec: exec('read', { file_path: target }), grants }), null)
})

test('turn grant deny rejects without asking', () => {
  const target = 'C:\\Windows\\win.ini'
  const grants = { allow: new Set(), deny: new Set([grantKeyFor(target)]) }
  const d = decide({ exec: exec('read', { file_path: target }), grants })
  assert.equal(d.kind, 'deny')
  assert.match(d.reason, /本任务已拒绝读取/)
})

test('grant only covers its directory', () => {
  const grants = { allow: new Set([grantKeyFor('C:\\Windows\\win.ini')]), deny: new Set() }
  const d = decide({ exec: exec('read', { file_path: 'C:\\Program Files\\a.txt' }), grants })
  assert.equal(d.kind, 'ask')
})

test('shell path outside asks', () => {
  const d = decide({ exec: exec('pwsh', { command: 'Get-Content C:\\Windows\\win.ini' }) })
  assert.equal(d.kind, 'ask')
})

test('shell command without paths passes', () => {
  assert.equal(decide({ exec: exec('pwsh', { command: 'git status' }) }), null)
})

test('present with outside file asks', () => {
  const d = decide({ exec: exec('present', { files: [{ path: 'C:\\Users\\me\\Desktop\\a.png' }] }) })
  assert.equal(d.kind, 'ask')
})

test('ask carries the fixed presentation copy', () => {
  const d = decide({ exec: exec('read', { file_path: 'C:\\Windows\\win.ini' }) })
  assert.match(d.displayReason, /读取允许范围外/)
})

test('candidates resolve file tools, present and shell paths against cwd', () => {
  assert.deepEqual(candidates(exec('read', { file_path: 'a.txt' }), WS), [join(WS, 'a.txt')])
  assert.deepEqual(candidates(exec('grep', { path: 'sub' }), WS), [join(WS, 'sub')])
  assert.deepEqual(candidates(exec('glob', {}), WS), [])
  assert.deepEqual(
    candidates(exec('present', { files: [{ path: 'x.png' }, {}, { path: '  ' }] }), WS),
    [join(WS, 'x.png')],
  )
  assert.deepEqual(candidates(exec('unknown', { anything: 1 }), WS), [])
  assert.deepEqual(
    candidates(exec('pwsh', { command: 'Get-Content "C:\\Windows\\a b.txt"' }), WS),
    ['C:\\Windows\\a b.txt'],
  )
})

test('shellPaths expands variables, ~ and deduplicates', () => {
  process.env.READ_GUARD_DIR = 'C:\\data'
  const paths = shellPaths('cat "$env:READ_GUARD_DIR\\a.txt" %READ_GUARD_DIR%\\a.txt ~\\notes.md', WS)
  assert.deepEqual(paths, ['C:\\data\\a.txt', join(homedir(), 'notes.md')])
  assert.deepEqual(shellPaths('git status', WS), [])
  delete process.env.READ_GUARD_DIR
})

test('expandVars understands every accepted spelling', () => {
  process.env.READ_GUARD_VAR = 'C:\\v'
  assert.equal(expandVars('%READ_GUARD_VAR%\\x'), 'C:\\v\\x')
  assert.equal(expandVars('$READ_GUARD_VAR/x'), 'C:\\v/x')
  assert.equal(expandVars('${READ_GUARD_VAR}/x'), 'C:\\v/x')
  assert.equal(expandVars('$env:READ_GUARD_VAR/x'), 'C:\\v/x')
  assert.equal(expandVars('%READ_GUARD_MISSING%\\x'), '%READ_GUARD_MISSING%\\x')
  delete process.env.READ_GUARD_VAR
})

test('grants are keyed by folder, not by file', () => {
  assert.equal(grantKeyFor('C:\\a\\one.txt'), grantKeyFor('C:\\a\\two.txt'))
  assert.notEqual(grantKeyFor('C:\\a\\one.txt'), grantKeyFor('C:\\b\\one.txt'))
})

test('the built-in defaults are portable and stay under the home directory', () => {
  assert.equal(DEFAULT_ALLOW.length, 3)
  for (const entry of DEFAULT_ALLOW) {
    assert.ok(entry.startsWith('~/'), `${entry} should be written relative to ~`)
    assert.ok(expandPath(entry).startsWith(homedir()), `${entry} should expand under the home directory`)
  }
  assert.equal(insideAny(join(homedir(), '.dsh', 'sessions', 'x.jsonl'), DEFAULT_ALLOW), true)
})
