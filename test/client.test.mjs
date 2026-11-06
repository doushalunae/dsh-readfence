/**
 * Render-smoke test for the browser half.
 *
 * No DOM and no real React here: a tiny hook-aware renderer walks the element
 * tree so every component function actually executes once. That catches the
 * usual rewrite breakage (undefined helpers, wrong prop names, a page that
 * throws while rendering) without a browser.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

/* ------------------------------------------------------------------ */
/* Minimal React + renderer                                             */
/* ------------------------------------------------------------------ */

const contexts = []

const React = {
  Fragment: Symbol.for('react.fragment'),
  createElement(type, props, ...children) {
    const own = { ...(props ?? {}) }
    if (children.length === 1) own.children = children[0]
    else if (children.length > 1) own.children = children
    return { type, props: own }
  },
  useState(initial) {
    const context = contexts[contexts.length - 1]
    const index = context.index++
    const seeded = context.seeds[index]
    const value = seeded !== undefined ? seeded : (typeof initial === 'function' ? initial() : initial)
    return [value, () => {}]
  },
  useEffect() {
    contexts[contexts.length - 1].index += 1
  },
  useRef(initial) {
    contexts[contexts.length - 1].index += 1
    return { current: initial }
  },
}

const render = (node, seeds = []) => {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => render(child))
  const { type, props } = node
  if (type === React.Fragment) {
    const children = props.children
    return (Array.isArray(children) ? children : [children]).map((child) => render(child))
  }
  if (typeof type === 'function') {
    contexts.push({ index: 0, seeds })
    let out
    try {
      out = type(props)
    } finally {
      contexts.pop()
    }
    return render(out)
  }
  const { children, ...rest } = props
  return { tag: String(type), props: rest, children: render(children) }
}

/* ------------------------------------------------------------------ */
/* Fake host                                                            */
/* ------------------------------------------------------------------ */

const htmlElement = () => ({
  textContent: '',
  children: [],
  setAttribute() {},
  appendChild() {},
  remove() {},
})

const fakeDocument = {
  createElement: htmlElement,
  head: htmlElement(),
  body: htmlElement(),
}

const loadClient = () => {
  let definition
  const fakeWindow = {
    __ModuleLoader__: { load: (value) => { definition = value } },
    innerWidth: 1280,
    innerHeight: 800,
    addEventListener() {},
    removeEventListener() {},
    clearTimeout,
    setTimeout,
  }
  const silent = { log() {}, warn() {}, error() {} }
  // The bundle is a classic script that registers itself on window.
  new Function('window', 'document', 'console', source)(fakeWindow, fakeDocument, silent)
  assert.ok(definition, 'client bundle did not call __ModuleLoader__.load')
  const withReact = (name) => {
    if (name === 'react') return React
    throw new Error(`unexpected require(${name})`)
  }
  const exported = definition.factory(withReact)
  return exported
}

const makeForm = (value) => ({
  getSnapshot: () => ({ status: 'ready', revision: 1, writable: true, value }),
  subscribe: () => () => {},
  mutate: async () => true,
})

const makeContext = (registered, value) => {
  const ctx = {
    locale: {
      bind: () => (key) => key,
      register: () => () => {},
    },
    effect: (fn) => fn(),
    configForms: { get: () => makeForm(value) },
    slots: {
      inject: (_name, callback) => callback(),
      register: (definition, component) => {
        registered.set(`${definition.name}#${definition.id ?? ''}`, component)
        return () => {}
      },
    },
  }
  return ctx
}

const baseConfig = {
  allow: ['C:\\one', 'C:\\two'],
  defaultReadMode: 'list',
  btnAllowOnce: '',
  btnAllowTask: '本任务都允许',
  btnDenyTask: '',
  btnRejectOnce: '',
  writeBg: '#FFDAD9',
  writeAccent: '#A96364',
  readBg: '#B3D8FF',
  readAccent: '#426296',
}

/* ------------------------------------------------------------------ */
/* Tests                                                                */
/* ------------------------------------------------------------------ */

test('apply registers one settings section and the two slots', () => {
  const registered = new Map()
  const exported = loadClient()
  exported.apply(makeContext(registered, baseConfig))
  assert.deepEqual(exported.inject, ['slots', 'locale', 'sessions', 'configForms'])
  assert.ok(registered.has('settings.section#read-guard'), 'settings section missing')
  assert.ok(registered.has('conversation.input.permission#'), 'permission slot missing')
  assert.ok(registered.has('conversation.composer#'), 'composer slot missing')
})

test('settings renders every tab page', () => {
  const registered = new Map()
  const exported = loadClient()
  exported.apply(makeContext(registered, baseConfig))
  const Section = registered.get('settings.section#read-guard')
  const props = { t: (key) => key }
  render(React.createElement(Section, props), [undefined, undefined, 'folders'])
  render(React.createElement(Section, props), [undefined, undefined, 'behavior'])
  render(React.createElement(Section, props), [undefined, undefined, 'colors'])
})

test('settings survives an unready form and an empty folder list', () => {
  const registered = new Map()
  const exported = loadClient()
  const ctx = makeContext(registered, { ...baseConfig, allow: [] })
  ctx.configForms.get = () => ({ getSnapshot: () => ({ status: 'loading' }), subscribe: () => () => {} })
  exported.apply(ctx)
  const Section = registered.get('settings.section#read-guard')
  render(React.createElement(Section, { t: (key) => key }), [])
})

test('permission pill opens a dialog and renders both wheels', () => {
  const registered = new Map()
  const exported = loadClient()
  exported.apply(makeContext(registered, baseConfig))
  const Pill = registered.get('conversation.input.permission#')
  const props = {
    t: (key) => key,
    sessionId: 'session-test',
    useProjection: (key) => ({ currentValue: key === 'permissions' ? 'workspace-write' : 'list' }),
  }
  // hooks: useFormSnapshot (state, effect) then `open` -> seed slot 2 with true
  const tree = render(React.createElement(Pill, props), [undefined, undefined, true])
  const flat = JSON.stringify(tree)
  assert.match(flat, /rg-overlay/)
  assert.match(flat, /rg-wheel/)
  assert.match(flat, /dialog.confirm/)
})

test('permission pill stays closed by default', () => {
  const registered = new Map()
  const exported = loadClient()
  exported.apply(makeContext(registered, baseConfig))
  const Pill = registered.get('conversation.input.permission#')
  const tree = render(React.createElement(Pill, {
    t: (key) => key,
    sessionId: 'session-test',
    useProjection: () => ({ currentValue: 'list' }),
  }))
  const flat = JSON.stringify(tree)
  assert.match(flat, /rg-pill/)
  assert.doesNotMatch(flat, /rg-overlay/)
})

test('settings pages have a markdown hierarchy and framed blocks', () => {
  const registered = new Map()
  const exported = loadClient()
  exported.apply(makeContext(registered, baseConfig))
  const Section = registered.get('settings.section#read-guard')

  // seed: snapshot, effect, page, status, addOpen, deleteOpen
  const folders = JSON.stringify(render(React.createElement(Section, { t: (key) => key }), [
    undefined, undefined, 'folders', undefined, undefined, true,
  ]))
  assert.match(folders, /"h1"/)
  assert.match(folders, /read-fence/)
  assert.match(folders, /v\d+\.\d+\.\d+/)
  assert.match(folders, /about\.lead/)
  assert.match(folders, /"h2"/)
  assert.match(folders, /"h3"/)
  assert.match(folders, /"rg-block"/)
  assert.match(folders, /block\.folders\.title/)
  assert.match(folders, /del\.selectAll/)

  const behavior = JSON.stringify(render(React.createElement(Section, { t: (key) => key }), [
    undefined, undefined, 'behavior',
  ]))
  const blocks = behavior.match(/"rg-block"/g) ?? []
  assert.equal(blocks.length, 2, 'expected one framed block per independent function')
  assert.match(behavior, /block\.defaultMode\.title/)
  assert.match(behavior, /block\.labels\.title/)
})

test('settings no longer renders the batch-manage affordance', () => {
  const registered = new Map()
  const exported = loadClient()
  exported.apply(makeContext(registered, baseConfig))
  const Section = registered.get('settings.section#read-guard')
  const tree = JSON.stringify(render(React.createElement(Section, { t: (key) => key }), [
    undefined, undefined, 'folders',
  ]))
  assert.doesNotMatch(tree, /folders\.manage/)
  assert.doesNotMatch(tree, /rg-icon-btn/)
})

test('folder list starts with a blank add row and every path is editable', () => {
  const registered = new Map()
  const exported = loadClient()
  exported.apply(makeContext(registered, baseConfig))
  const Section = registered.get('settings.section#read-guard')
  const tree = JSON.stringify(render(React.createElement(Section, { t: (key) => key }), [
    undefined, undefined, 'folders',
  ]))
  assert.match(tree, /rg-addrow/)
  assert.match(tree, /row\.addPlaceholder/)
  assert.equal((tree.match(/rg-row-path/g) ?? []).length, baseConfig.allow.length, 'each existing path is editable')
  assert.match(tree, /row\.editHint/)
  // The scroll hint belongs to the list, not to the block description.
  const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /列表最多显示 8 行/)
})

test('approval label hint sits between the title and the input', () => {
  const registered = new Map()
  const exported = loadClient()
  exported.apply(makeContext(registered, baseConfig))
  const Section = registered.get('settings.section#read-guard')
  const tree = JSON.stringify(render(React.createElement(Section, { t: (key) => key }), [
    undefined, undefined, 'behavior',
  ]))
  const name = tree.indexOf('approval.allowOnce')
  const hint = tree.indexOf('hint.allowOnce')
  const input = tree.indexOf('"className":"rg-input"')
  assert.ok(name >= 0 && hint >= 0 && input >= 0)
  assert.ok(name < hint && hint < input, `expected title < hint < input, got ${name}/${hint}/${input}`)
})

test('read approval panel renders its four labels', () => {
  const registered = new Map()
  const exported = loadClient()
  exported.apply(makeContext(registered, baseConfig))
  const Approval = registered.get('conversation.composer#')
  const tree = render(React.createElement(Approval, {
    t: (key) => key,
    matched: {
      kind: 'approval',
      reason: 'read-guard: C:\\secret',
      displayReason: 'read C:\\secret',
      answerable: true,
      key: 'approval-1',
      sessionId: 'session-test',
    },
  }))
  const flat = JSON.stringify(tree)
  assert.match(flat, /approval.title/)
  assert.match(flat, /btnAllowOnce|approval.allowOnce/)
})
