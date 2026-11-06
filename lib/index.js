/**
 * dsh-read-guard — Host half.
 *
 * Adds a read-side fence to DSH: file-reading tools consult a per-session read
 * mode (allowlist / workspace-only / full) and ask for approval when a target
 * falls outside it. This package's browser half renders the approval panel
 * with task-scoped choices; the host records those choices per user turn and
 * answers matching reads without prompting again.
 */
import fs from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import z from '@deepseek-ai/schemastery'

import {
  DEFAULT_ALLOW,
  READ_MODES,
  decideRead,
  grantKeyFor,
} from './policy.js'

export const name = 'read-guard'

const EVENT_MODE = 'plugin:read-guard/mode'
/**
 * The type this plugin wrote before it learned the plugin-record contract.
 * Old logs may still contain it; a projection still folds it so a resumed
 * session keeps its last known mode.
 */
const LEGACY_EVENT_MODE = 'read-guard/mode'
const PROJECTION_KEY = 'readPolicy'

/** Live-editable configuration (all fields volatile → visible in Settings). */
export const Config = z.object({
  allow: z
    .array(z.string())
    .default(DEFAULT_ALLOW)
    .description('Folders readable without approval in “list” mode.')
    .volatile(),
  defaultReadMode: z
    .union(READ_MODES)
    .default('list')
    .description('Read mode for new sessions.')
    .volatile(),
  btnAllowOnce: z
    .string()
    .default('允许一次')
    .description('Label of the “allow once” approval button.')
    .volatile(),
  btnAllowTask: z
    .string()
    .default('本任务都允许')
    .description('Label of the “allow for this task” approval button.')
    .volatile(),
  btnDenyTask: z
    .string()
    .default('本任务都拒绝')
    .description('Label of the “deny for this task” approval button.')
    .volatile(),
  btnRejectOnce: z
    .string()
    .default('拒绝一次')
    .description('Label of the “reject once” approval button.')
    .volatile(),
  writeBg: z.string().default('#FFDAD9').description('Write segment background.').volatile(),
  writeAccent: z.string().default('#A96364').description('Write segment accent.').volatile(),
  readBg: z.string().default('#B3D8FF').description('Read segment background.').volatile(),
  readAccent: z.string().default('#426296').description('Read segment accent.').volatile(),
})

const clampMode = (value) => (READ_MODES.includes(value) ? value : null)

export const apply = (ctx, config) => {
  const auditFile = join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'read-guard.log')
  const audit = (entry) => {
    try {
      fs.appendFileSync(auditFile, JSON.stringify({ at: new Date().toISOString(), pid: process.pid, ...entry }) + '\n', 'utf8')
    } catch {}
  }

  const allowList = () => {
    try {
      const value = config.allow.get()
      return Array.isArray(value) ? value : DEFAULT_ALLOW
    } catch {
      return DEFAULT_ALLOW
    }
  }
  const defaultMode = () => {
    try {
      return clampMode(config.defaultReadMode.get()) ?? 'list'
    } catch {
      return 'list'
    }
  }

  /** sessionId -> current turn number (from `turn/start`). */
  const turns = new Map()
  /** sessionId -> { turn, allow: Set, deny: Set } */
  const grants = new Map()
  /** callId -> { sessionId, turn, paths } for approvals awaiting a choice. */
  const pending = new Map()

  ctx.on('session/event', (session, event) => {
    if (event?.type === 'turn/start') {
      const turn = event.data?.turn
      if (typeof turn === 'number') {
        turns.set(session.id, turn)
        grants.delete(session.id)
      }
    }
    if (event?.type === 'turn/start' || event?.type === 'turn/end' || event?.type === 'user/message') {
      audit({ kind: 'session-event', sessionId: session?.id, type: event?.type, turn: event?.data?.turn })
    }
  }, { global: true })

  const turnOf = (session) => {
    const projections = ctx.get('sessionProjections')
    if (projections !== undefined) {
      try {
        const boundary = projections.stateOf(session, 'turnBoundary')
        if (typeof boundary?.lastTurn === 'number') return boundary.lastTurn
      } catch {}
    }
    return turns.get(session.id) ?? 0
  }

  const grantsFor = (session) => {
    const turn = turnOf(session)
    const existing = grants.get(session.id)
    if (existing !== undefined && existing.turn === turn) return existing
    const fresh = { turn, allow: new Set(), deny: new Set() }
    grants.set(session.id, fresh)
    return fresh
  }

  /**
   * `plugin:` records are the only log entries a third-party plugin may add.
   * A plain `session.append()` of a new type writes an event the persistence
   * read path refuses unless it carries `ignorable: true`, which only
   * `appendPluginRecord()` sets. Resolve it once; if the mapping is absent the
   * plugin stays usable and keeps the mode in process memory instead of
   * corrupting the log.
   */
  let appendRecord
  const recordApi = import('@deepseek-ai/dsh-session')
    .then((module) => {
      appendRecord = typeof module.appendPluginRecord === 'function' ? module.appendPluginRecord : undefined
      audit({ kind: 'plugin-record-api', available: appendRecord !== undefined })
    })
    .catch((error) => {
      audit({ kind: 'plugin-record-api', available: false, message: String(error?.message ?? error) })
    })
  /** sessionId -> mode for the fallback path (no `dsh-session` mapping). */
  const memoryModes = new Map()

  const modeOf = (session) => {
    const projections = ctx.get('sessionProjections')
    if (projections !== undefined) {
      try {
        const state = projections.stateOf(session, PROJECTION_KEY)
        const mode = clampMode(state?.mode)
        if (mode !== null) return mode
      } catch {}
    }
    const memory = memoryModes.get(session.id)
    if (memory !== undefined) return memory
    return defaultMode()
  }

  const cwdOf = async (exec) => {
    const workingDirectory = ctx.get('workingDirectory')
    if (workingDirectory !== undefined && exec.agent !== undefined) {
      try {
        return await workingDirectory.ensure(exec.agent, exec.signal)
      } catch {}
    }
    return exec.agent?.session?.header?.cwd ?? process.cwd()
  }

  /**
   * Persist the mode as an ignorable `plugin:` record.
   * @returns whether the record reached the log.
   */
  const setMode = async (session, mode) => {
    await recordApi
    if (appendRecord === undefined) {
      memoryModes.set(session.id, mode)
      audit({ kind: 'mode-unpersisted', sessionId: session.id, mode })
      return false
    }
    try {
      appendRecord(session, EVENT_MODE, { mode })
      return true
    } catch (error) {
      memoryModes.set(session.id, mode)
      audit({ kind: 'mode-unpersisted', sessionId: session.id, mode, message: String(error?.message ?? error) })
      return false
    }
  }

  ctx.inject(['sessionProjections'], (projectionCtx) => {
    try {
      projectionCtx.sessionProjections.register({
        key: PROJECTION_KEY,
        stateVersion: 1,
        stateSchema: {
          parse(value) {
            return { mode: clampMode(value?.mode) }
          },
        },
        init: () => ({ mode: null }),
        apply: (state, event) => (event?.type === EVENT_MODE || event?.type === LEGACY_EVENT_MODE
          ? { mode: clampMode(event.data?.mode) }
          : state),
        wire: {
          viewSchema: {
            parse(value) {
              const mode = clampMode(value?.currentValue)
              if (mode === null) throw new Error('readPolicy: invalid wire value')
              return { currentValue: mode }
            },
          },
          view: (state) => ({ currentValue: state.mode ?? defaultMode() }),
        },
      })
    } catch (error) {
      audit({ kind: 'projection-error', message: String(error?.message ?? error) })
    }
  })

  ctx.inject(['commands'], (commandCtx) => {
    try {
      commandCtx.commands.register({
        definitionId: 'dsh-read-guard',
        name: 'read',
        description: 'Switch the read permission mode (list / workspace / full)',
        input: { hint: '<list|workspace|full>' },
        handler: async ({ agent, rawInput }) => {
          const wanted = String(rawInput ?? '').trim()
          const session = agent.session
          const current = modeOf(session)
          if (wanted === '' || wanted === 'status') {
            return {
              kind: 'success',
              text: `current read mode ${current} (available: ${READ_MODES.join(', ')})`,
            }
          }
          const mode = clampMode(wanted)
          if (mode === null) {
            return { kind: 'error', text: `unknown read mode "${wanted}" (available: ${READ_MODES.join(', ')})` }
          }
          const persisted = await setMode(session, mode)
          audit({ kind: 'mode', sessionId: session.id, mode, persisted })
          return {
            kind: 'success',
            text: persisted ? `read mode ${mode}` : `read mode ${mode} (this session only; the dsh-session record API is unavailable)`,
          }
        },
      })

      // Records the panel's task-scoped choice before the approval is answered,
      // so later reads of the same directory in this turn skip the prompt.
      commandCtx.commands.register({
        definitionId: 'dsh-read-guard/grant',
        name: 'read-grant',
        description: 'Record the read approval choice for this turn',
        input: { hint: '<allow|deny> <callId>' },
        handler: ({ agent, rawInput }) => {
          const [decision, callId] = String(rawInput ?? '').trim().split(/\s+/)
          if (decision !== 'allow' && decision !== 'deny') {
            return { kind: 'error', text: 'read-grant expects allow or deny' }
          }
          const entry = callId === undefined ? undefined : pending.get(callId)
          const sessionId = agent?.session?.id
          if (entry === undefined || entry.sessionId !== sessionId) {
            return { kind: 'error', text: 'read-grant: unknown or foreign call' }
          }
          const record = grantsFor(agent.session)
          const bucket = decision === 'allow' ? record.allow : record.deny
          for (const path of entry.paths) bucket.add(grantKeyFor(path))
          pending.delete(callId)
          audit({ kind: 'grant', sessionId, decision, callId, paths: entry.paths })
          return { kind: 'success', text: `read-grant ${decision} recorded` }
        },
      })
    } catch (error) {
      audit({ kind: 'commands-error', message: String(error?.message ?? error) })
    }
  })

  ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.agent === undefined) return next()
    const session = exec.agent.session
    const mode = modeOf(session)
    if (mode === 'full') return next()
    const cwd = await cwdOf(exec)
    const decision = decideRead({
      exec,
      cwd,
      mode,
      allow: allowList(),
      grants: grantsFor(session),
    })
    if (decision === null) return next()
    if (decision.kind === 'deny') {
      audit({ kind: 'deny', tool: exec.name, callId: exec.callId, mode, paths: decision.paths })
      return { kind: 'deny', reason: decision.reason }
    }
    if (exec.callId !== undefined) {
      pending.set(exec.callId, {
        sessionId: session.id,
        turn: turnOf(session),
        paths: decision.paths,
      })
    }
    audit({ kind: 'ask', tool: exec.name, callId: exec.callId, mode, paths: decision.paths })
    return { kind: 'ask', reason: decision.reason, displayReason: decision.displayReason }
  })

  audit({ kind: 'applied', defaultReadMode: defaultMode(), allow: allowList().length })
}
