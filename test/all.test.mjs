/**
 * One entry point for the whole plugin: `node test/all.test.mjs`.
 *
 * Each suite is a plain node:test file, so it also runs on its own:
 *   node test/policy.test.mjs
 *   node test/host.test.mjs
 *   node test/client.test.mjs
 *
 * (Avoid `node --test test/`: the runner spawns child processes, which the
 * Windows harness sandbox denies with EPERM.)
 */
import './policy.test.mjs'
import './host.test.mjs'
import './client.test.mjs'
