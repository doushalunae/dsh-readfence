# DSH Host-plugin cheat-sheet (third-party, plain ESM, no build)

Runtime = DSH 0.2.1-rc.5 (all first-party manifests in `asar-dump/pkgs/*/package.json`); all `file:line`
refs are under `asar-dump/pkgs/` unless stated.

## 0. What actually resolves from the profile — verified

`%USERPROFILE%\.dsh\profiles\desktop\node_modules\@deepseek-ai\` contains **only**
`cosmokit` and `schemastery` (directory listing + `node_modules\.modules.yaml` hoistedLocations).
No `dsh-session`, `dsh-commands`, `dsh-session-projection`, `zod`, `cordis` are installed there.

Yet `dsh-better-sidebar` (installed, running) imports `@deepseek-ai/dsh-settings`,
`dsh-session/surface`, `dsh-agent`, `dsh-tools`, `dsh-llm`, `dsh-subagent` (its `lib/index.js:14-19`)
while the profile has none of them, and it installed with `[WARN] Issues with peer dependencies found`
(`.plugin-manager/logs/operation-xtc8vS/pnpm.log`). ⇒ **the host maps first-party packages at import
time; unmet peers do not block load.** The mapping lives in `dsh-app-boot`, which is *not* in the
extracted dump → **unverified** which extra specifiers (e.g. `zod`) are mapped.

**Rule for this plugin:** import `@deepseek-ai/schemastery` directly (a copy exists in this package's
`node_modules/`), and import anything else first-party **only after declaring it in
`peerDependencies`**. Everything else through `ctx` (`ctx.sessionProjections`, `ctx.commands`,
`ctx.workingDirectory`, `ctx.sessions`, `ctx.settings`).
Projection schemas: duck-typed `{ parse }` (§3), no zod needed. `CommandDefinitionId` is optional —
inline `const id = (s) => s` (`dsh-commands/lib/types/brand.js:16-18` does no validation).

### Why the peer declaration is mandatory (verified 2026-11-05)

The resolver routes a module by its filesystem layer. A `link:`-installed plugin (junction whose real
path sits in the workspace) lands on the `linked` route, and `routeLinked` intercepts a bare request
**only when some ancestor `package.json` lists that name in `peerDependencies`**
(`readPeerNames(...).has(name)`); otherwise it falls through to native resolution, which cannot see
the packages inside `app.asar` → `Cannot find package '@deepseek-ai/dsh-session' imported from …`.
`dsh-better-sidebar` gets away with its first-party imports precisely because it declares ~20 of them
as peers. Declare `"*"` to stay clear of the `incompatible-version` gate.

## 1. Module shape (this decides whether `Config` is seen)

Loader normalizes `module.default ?? module` (`cordis-plugin-loader/lib/index.js:667-671`) and then reads
`plugin.Config` / `plugin.apply` / `plugin.inject` (`cordis/lib/index.js:1619-1635`).

```js
// GOOD: named exports, no default -> namespace object is the plugin
export const name = 'read-guard'
export const Config = z.object({ /* §2 */ })
export const inject = ['sessionProjections']      // hard deps; optional ones via ctx.inject
export function apply(ctx, config) { /* ... */ }
```

Gotcha: `export default { name, apply }` **plus** a separate `export const Config` silently loses
`Config` (the default wins, named exports are dropped) → no settings form. Either put `Config`
inside the default object or export no default.
First-party precedent: `dsh-tool-present/lib/index.js:127`, `dsh-better-sidebar/lib/index.js:9804`.

## 2. Config with volatile fields (drives the Settings form)

```js
import z from '@deepseek-ai/schemastery'

export const Config = z.object({
  folders: z.array(z.string()).default([]).volatile(),        // folder list
  mode: z.union(['ask', 'allow', 'deny']).default('ask').volatile(), // string enum
  template: z.string().default('Read {path}?').volatile(),    // string template
})
// read live values (never cache a snapshot):
const folders = config.folders.get() ?? []
const mode = config.mode.get() ?? 'ask'
```

* Only `.volatile()` leaves appear in Settings: `volatileForm()` returns `undefined` when no field is volatile, and `describe()` then skips the entry entirely (`dsh-settings/lib/index.js:413-419`, `:122-133`).
* A volatile value is a frozen `{ get() }` ref (`cosmokit/lib/index.js:102-118`); reads are **`.get()`**,
  never `config.mode` directly. The loader writes into the same ref on live edits, so calling `.get()`
  at use time is what makes edits take effect without a remount (`cordis-plugin-loader/lib/index.js:382-427`).
* `.volatile()` must sit at a **fixed object path**: nested volatile under a volatile node, or inside a
  dict/array element, throws “volatile fields require a fixed object path…” (`schemastery/lib/index.mjs:241-252`).
  So `z.array(...)` is fine, `z.dict(...)` with volatile values is not.
* Optional live-update hook `ctx.on('loader/volatile-update', (paths) => {...})` (`cordis-plugin-loader/lib/index.js:422`).
  Nothing else to register with Settings; to suppress the auto page:
  `ctx.inject(['settings'], (s) => s.settings.configure({ auto: false }, ctx.fiber))` (`dsh-settings/lib/index.js:370-381`).

## 3. Session projection + custom event + wire view

First-party schemas use **zod** (`dsh-sandbox-policy/lib/index.js:3,85-89`,
`dsh-user-questions/lib/types/projection.js:2,72-75,281-297`), but the registry only calls `.parse()`
(`dsh-session-projection/lib/index.js:254,258,296,421,432`) and validates only `stateVersion` (`:81`),
so a passthrough is sufficient for a dependency-free plugin (mechanically verified; you lose validation):

```js
const anySchema = { parse: (v) => v }   // stands in for a zod schema

const definition = {
  key: 'readGuard',                     // camelCase, unique process-wide
  stateVersion: 1,                      // non-negative safe integer; bump when state/fold changes
  stateSchema: anySchema,               // parses host state + restored checkpoints
  // init(header, inheritedEventCount); header = session.header
  init: (_header, _inherited) => ({ mode: null }),
  // MUST be sync and MUST return the same reference for unrelated events
  apply: (state, event) => event.type === 'plugin:read-guard/mode'
    ? (state.mode === event.data.mode ? state : { ...state, mode: event.data.mode })
    : state,
  wire: { viewSchema: anySchema, view: (state) => ({ mode: state.mode }) }, // omit wire = host-only
}
ctx.sessionProjections.register(definition)   // effect on the calling fiber; returns disposer
```

Append the driving event. **Only `plugin:` records are safe**: the persistence
read path refuses any stored type outside `KNOWN_SESSION_EVENT_TYPES` unless the
envelope carries `ignorable: true`, and `Session.append()` cannot set that marker
(its `opts` is surface-only). `appendPluginRecord()` — exported by
`@deepseek-ai/dsh-session` — is the only writer that sets it:

```js
const { appendPluginRecord } = await import('@deepseek-ai/dsh-session')
appendPluginRecord(session, 'plugin:read-guard/mode', { mode: 'allow' })  // session, not session.id
// read back in-process:
const state = ctx.sessionProjections.stateOf(session, 'readGuard')  // -> { mode } | undefined
```

Never do `session.append('read-guard/mode', …)` — that is exactly how this plugin
bricked two sessions on 2026-11-05 (the harness then refuses to reopen the log:
`contains event type "read-guard/mode" … not marked ignorable`).
The record type must match `/^plugin:[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/`.
The projection's `apply` sees these records like any other event, so a `plugin:`
prefix only changes persistence, not the fold.

`stateVersion`/`key` mismatch against a live registration throws (`dsh-session-projection/lib/index.js:91`);
wire views republish on `Object.is` change (`:415-423`), so reuse the reference when nothing changed.

## 4. `/read` slash command

```js
import { CommandDefinitionId } from '@deepseek-ai/dsh-commands/brand' // optional; mirrors to (s)=>s

ctx.inject(['commands'], (commandsCtx) => {                 // optional service, like presets:206
  commandsCtx.commands.register({
    definitionId: CommandDefinitionId('dsh-readfence'),    // optional, stable id for adapters
    name: 'read',                                           // /^[a-z][a-z0-9_-]*$/
    description: 'Set the read mode for this session',
    input: { hint: '<ask|allow|deny>' },                    // hint non-empty; attachments?: boolean
    handler: ({ agent, rawInput, signal }) => {
      const mode = rawInput.trim() || 'ask'
      if (!['ask', 'allow', 'deny'].includes(mode)) return { kind: 'error', text: `unknown mode "${mode}"` }
      // plugin: record, never a bare session.append() — see §3.
      appendPluginRecord(agent.session, 'plugin:read-guard/mode', { mode })
      return { kind: 'success', text: `read mode ${mode}` }  // text optional on success
    },
  })
})
```

Handler receives `{ commandId, agent, rawInput, attachments, signal }` and returns (or resolves)
`{ kind: 'success', text?, sourceEventSeq? }` or `{ kind: 'error', text }` (non-empty); anything else throws
at the registry boundary (`dsh-commands/lib/index.js:149-204`). `recordInput` defaults true.

## 5. Consumer values: cwd, turn boundary, grant store

```js
const cwd = await ctx.workingDirectory.ensure(agent, exec.signal)   // -> absolute path
const fallback = agent.session.header.cwd                            // sync alternative
```
(`dsh-tool-present/lib/index.js:83`, `dsh-sandbox-policy/lib/index.js:145`.)

Turn boundaries are session events, observed host-wide with `{ global: true }`
(`dsh-user-questions/lib/index.js:515-524`, `dsh-tools/lib/index.js:899-902`):

```js
const grants = new Map()   // sessionId -> turn number that owns the grant
ctx.on('session/event', (session, event) => {
  if (event.type === 'turn/start') grants.delete(session.id)   // new user turn => reset
}, { global: true })
```

`turn/start: { turn }`, `turn/end: { turn, reason }`, `user/message: UserMessage`
(`SessionEventMap`, `dsh-commands/lib/typert.host.js:704`). Prefer `turn/start`: `user/message` also
carries non-user sources (`source.kind`, e.g. `user-question-reply`,
`dsh-user-questions/lib/types/projection.js:261-267`). The host's own `turnBoundary` projection reads as
`stateOf(session,'turnBoundary') -> { openTurnStartSeq, lastTurn }`; its definition is not in the dump
(only its consumer, `dsh-tool-present/lib/index.js:80-81`) → **unverified internals**.
A durable grant appended between turns is at risk: such an event “is indistinguishable from a crash tail
and silently dropped on reload” (`dsh-user-approval/lib/index.js:44-56`).

## 6. Bundle manifest

```json
{
  "name": "dsh-readfence",
  "version": "0.1.0",
  "type": "module",
  "main": "lib/index.js",
  "exports": { ".": "./lib/index.js", "./package.json": "./package.json" },
  "dsh": { "manifestVersion": 1, "bundle": { "patch": "./cordis.patch.yml" } }
}
```

```yaml
# cordis.patch.yml — top-level array of patch entries
- insert:
    - id: read-guard
      name: 'dsh-readfence'      # must equal the package name (Loader imports it as a bare specifier)
```

| Field | Status | Evidence |
|---|---|---|
| `dsh.bundle.patch` | **required** to be a bundle; absence ⇒ `not-a-bundle` | `dsh-plugin-manager/lib/index.js:311-314`; README §Version compatibility |
| `dsh.manifestVersion` | optional (both hand-written and better-sidebar use `1`); no validation found in the dump | `dsh-base/package.json` omits it entirely |
| `dsh.client` | **omit** for Host-only; if present, `platform` is mandatory, `inject`/`external`/`immediately` optional | `dsh-client-modules/lib/index.js:64-72` |
| `peerDependencies` | **not required** | better-sidebar installed with unmet peers and still loads (pnpm log above) |

Compatibility check (README §“Version compatibility”): requirements are `engines.dsh` plus DSH peer
names, keyed per package; only *declared but unsatisfied* ranges refuse with `incompatible-version`,
so no declaration ⇒ nothing to refuse. `evaluatePluginCompatibility` lives in `dsh-app-boot` (not
extracted) → **inferred, not source-verified**. Safe choice: omit peers, or pin `0.2.1-rc.5` exactly.
Enabling also needs the name in the profile's `dsh.profile.bundles` (`profiles/desktop/package.json`).

## 7. Gotchas recap

1. `Config` not on the plugin object (default-export shadowing) ⇒ plugin runs, Settings row absent.
2. `config.folders` instead of `config.folders.get()` ⇒ stale/undefined; volatile under a dict ⇒ load error.
3. `apply()` must return the **same** state object for unrelated events; unknown `stateVersion` for an
   existing key throws at registration.
4. Bundle `name` in the patch must match `package.json.name`; list the patch file in `files`.
5. `zod`/`@deepseek-ai/dsh-*` imports from the profile are *probably* mapped but not provable from the
   dump — treat `ctx` as the only guaranteed seam.
