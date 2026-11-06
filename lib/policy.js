/**
 * Pure read-policy logic for dsh-read-guard.
 *
 * No Cordis / DSH imports here: the host plugin feeds this module a session,
 * a working directory and the effective mode, and turns the decision into a
 * `tools/pre-execute` answer. Keeping it dependency-free makes it testable
 * with plain `node test/*.mjs`.
 */
import fs from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'

/** Read modes, in UI order. */
export const READ_MODES = ['list', 'workspace', 'full']

/**
 * Default allowlist (used only when Config omits `allow`).
 *
 * Written portably on purpose: `~`, environment variables and wildcards are
 * expanded by {@link compileRoots}, so the same three roots work on Windows,
 * macOS and Linux.
 */
export const DEFAULT_ALLOW = [
  '~/.dsh',
  '~/.ssh',
  '~/Documents/deepseek-harness',
]

/** Tools whose file argument is checked directly. */
const FILE_ARG_TOOLS = {
  read: 'file_path',
  read_image: 'file_path',
  grep: 'path',
  glob: 'path',
}

/** Shell tools whose command text is scanned for paths. */
const SHELL_TOOLS = new Set(['pwsh', 'bash'])

const IS_WINDOWS = process.platform === 'win32'

/** Whether an allowlist entry contains `*` / `?` wildcards. */
export const isGlob = (text) => /[*?]/.test(text)

/** Canonicalize a path, resolving the longest existing ancestor. */
export function canonical(target) {
  const abs = resolve(target)
  try {
    return fs.realpathSync.native(abs)
  } catch {}
  const parent = dirname(abs)
  if (parent === abs) return abs
  const base = canonical(parent)
  if (base === parent) return abs
  return join(base, basename(abs))
}

/** Split a path into comparison segments (`C:` stays the first Windows segment). */
const segmentsOf = (target) =>
  target
    .replace(/[\\/]+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter((part) => part.length > 0)

/**
 * Compile one allowlist entry into comparison segments.
 *
 * Literal entries are canonicalized (symlinks/junctions resolved). Glob entries
 * canonicalize only the prefix before the first wildcard, so `~/proj/*` still
 * follows a symlinked `~/proj` while the pattern itself stays a pattern.
 */
function compileRoot(raw) {
  const expanded = expandPath(raw)
  const absolute = resolve(expanded)
  if (!isGlob(absolute)) {
    const real = canonical(absolute)
    return { pattern: real, segments: segmentsOf(real), glob: false }
  }
  const firstWild = absolute.search(/[*?]/)
  const cut = Math.max(absolute.lastIndexOf('/', firstWild), absolute.lastIndexOf('\\', firstWild))
  if (cut <= 0) return { pattern: absolute, segments: segmentsOf(absolute), glob: true }
  const prefix = canonical(absolute.slice(0, cut))
  const rest = absolute.slice(cut + 1)
  const full = prefix.endsWith(sep) ? prefix + rest : prefix + sep + rest
  return { pattern: full, segments: segmentsOf(full), glob: true }
}

/** Compile a configured root list once per decision. */
export function compileRoots(list) {
  return (Array.isArray(list) ? list : [])
    .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => compileRoot(entry))
}

const escapeSegment = (text) => text.replace(/[.+^${}()|[\]\\]/g, '\\$&')

/** One glob segment as a matcher (`*` and `?` never cross a separator). */
const segmentMatcher = (pattern) => {
  const source = pattern
    .split('')
    .map((char) => (char === '*' ? '[^/]*' : char === '?' ? '[^/]' : escapeSegment(char)))
    .join('')
  const re = new RegExp(`^${source}$`, IS_WINDOWS ? 'i' : '')
  return (segment) => re.test(segment)
}

/** Recursive segment matcher: a shorter pattern still covers a deeper target. */
function matchSegments(pattern, segments, pi = 0, si = 0) {
  if (pi === pattern.length) return true
  const part = pattern[pi]
  if (part === '**') {
    if (pi === pattern.length - 1) return true
    for (let next = si; next <= segments.length; next += 1) {
      if (matchSegments(pattern, segments, pi + 1, next)) return true
    }
    return false
  }
  if (si >= segments.length) return false
  if (!segmentMatcher(part)(segments[si])) return false
  return matchSegments(pattern, segments, pi + 1, si + 1)
}

/** Whether an already-canonical `target` is at or below one of `roots`. */
export function insideCompiled(target, roots) {
  const segments = segmentsOf(target)
  return roots.some((root) => matchSegments(root.segments, segments))
}

/** Convenience wrapper: compile raw entries (strings) and canonicalize `target`. */
export function insideAny(target, roots) {
  const compiled = roots.every((root) => root && Array.isArray(root.segments)) ? roots : compileRoots(roots)
  return insideCompiled(canonical(target), compiled)
}

/** Normalize a path for case-insensitive containment comparison. */
export function norm(p) {
  let s = p.replace(/[\\/]+/g, '/').replace(/\/+$/, '')
  if (/^[a-zA-Z]:$/.test(s)) s += '/'
  return IS_WINDOWS ? s.toLowerCase() : s
}

/**
 * Effective allow roots for one call.
 * - `list`: configured list + the session workspace
 * - `workspace`: the session workspace only
 * - `full`: everything (callers skip the check)
 */
export function rootsForMode(mode, allow, cwd) {
  const workspace = canonical(cwd)
  if (mode === 'workspace') return [{ pattern: workspace, segments: segmentsOf(workspace), glob: false }]
  if (mode === 'full') return null
  return [...compileRoots(allow), { pattern: workspace, segments: segmentsOf(workspace), glob: false }]
}

/** Expand `$env:NAME`, `%NAME%` and `$NAME` for known environment variables. */
export function expandVars(text) {
  let out = text
  out = out.replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/gi, (m, name) => process.env[name] ?? m)
  out = out.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (m, name) => process.env[name] ?? m)
  out = out.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (m, name) => process.env[name] ?? m)
  return out
}

/** Expand variables and a leading `~` in one configured path. */
export function expandPath(text) {
  let out = expandVars(String(text).trim())
  if (out === '~') out = homedir()
  else if (out.startsWith('~/') || out.startsWith('~\\')) out = join(homedir(), out.slice(2))
  return out
}

/** Split a command line into quote-aware segments. */
export function segments(command) {
  const out = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let match
  while ((match = re.exec(command)) !== null) {
    if (match[1] !== undefined) out.push(match[1])
    else if (match[2] !== undefined) out.push(match[2])
    else out.push(match[3])
  }
  return out
}

/** Interpret one token as a filesystem path, or null. */
export function tokenPath(token, cwd) {
  const t = token.replace(/^[("'`]+/, '').replace(/[)"'`,;:]+$/, '')
  if (t.length < 2) return null
  if (/^[A-Za-z]:[\\/]/.test(t)) return t
  if (/^\\\\[^\\]/.test(t)) return t
  if (/^~[\\/]/.test(t)) return join(homedir(), t.slice(2))
  if (/^\.\.[\\/]/.test(t) || /[\\/]\.\.[\\/]/.test(t)) {
    try {
      return resolve(cwd, t)
    } catch {
      return null
    }
  }
  return null
}

/** Paths mentioned by a shell command, deduplicated in order. */
export function shellPaths(command, cwd) {
  const found = []
  const seen = new Set()
  for (const segment of segments(expandVars(command))) {
    const p = tokenPath(segment, cwd)
    if (p === null) continue
    const key = norm(p)
    if (seen.has(key)) continue
    seen.add(key)
    found.push(p)
  }
  return found
}

/** Paths a single tool call would open. */
export function candidates(exec, cwd) {
  const name = exec.name
  const args = exec.arguments ?? {}
  const paths = []

  const fileArg = FILE_ARG_TOOLS[name]
  if (fileArg !== undefined) {
    const value = args[fileArg]
    if (typeof value === 'string' && value.trim().length > 0) paths.push(resolve(cwd, value))
    return paths
  }

  if (name === 'present' && Array.isArray(args.files)) {
    for (const file of args.files) {
      if (file && typeof file.path === 'string' && file.path.trim().length > 0) {
        paths.push(resolve(cwd, file.path))
      }
    }
    return paths
  }

  if (SHELL_TOOLS.has(name) && typeof args.command === 'string') {
    paths.push(...shellPaths(args.command, cwd))
  }
  return paths
}

/** Directory key used for turn-scoped grants. */
export function grantKeyFor(path) {
  return norm(dirname(path))
}

/**
 * Decide one call.
 *
 * `grants` is a per-turn record: `{ allow: Set<dirKey>, deny: Set<dirKey> }`.
 * Returns `null` to run the call, or `{ kind, paths, reason, displayReason }`.
 */
export function decideRead({ exec, cwd, mode, allow, grants }) {
  const roots = rootsForMode(mode, allow, cwd)
  if (roots === null) return null

  const paths = candidates(exec, cwd)
  if (paths.length === 0) return null

  const outside = []
  const denied = []
  for (const raw of paths) {
    const real = canonical(raw)
    if (insideCompiled(real, roots)) continue
    const key = grantKeyFor(real)
    if (grants?.deny?.has(key)) denied.push(real)
    else if (grants?.allow?.has(key)) continue
    else outside.push(real)
  }

  if (denied.length > 0) {
    const deniedText = `本任务已拒绝读取：${denied.join('  ')}`
    return {
      kind: 'deny',
      paths: denied,
      reason: deniedText,
      displayReason: deniedText,
    }
  }
  if (outside.length === 0) return null

  return {
    kind: 'ask',
    paths: outside,
    reason: `read-guard: read outside the allowlist: ${outside.map((p) => `"${p}"`).join(', ')}`,
    displayReason: `读取允许范围外的位置，需要你批准：${outside.join('  ')}`,
  }
}
