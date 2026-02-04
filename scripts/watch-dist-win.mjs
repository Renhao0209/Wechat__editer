#!/usr/bin/env node

import chokidar from 'chokidar'
import { spawn } from 'node:child_process'

const WATCH_GLOBS = [
  'src/**/*',
  'electron/**/*',
  'public/**/*',
  'index.html',
  'vite.config.*',
  'tsconfig*.json',
]

const IGNORED = [
  '**/node_modules/**',
  '**/.git/**',
  'dist/**',
  'release/**',
  'release-notes/**',
  'CHANGELOG.md',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]

const args = new Set(process.argv.slice(2))
const runOnStart = args.has('--run-on-start')

let debounceTimer = null
let running = false
let rerunRequested = false

function log(msg) {
  const t = new Date().toLocaleTimeString()
  console.log(`[dist:win:watch ${t}] ${msg}`)
}

function runDistWin() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const child = spawn(cmd, ['run', 'dist:win'], { stdio: 'inherit' })
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

async function trigger() {
  if (running) {
    rerunRequested = true
    return
  }

  running = true
  rerunRequested = false

  log('Change detected → running `npm run dist:win`...')
  const code = await runDistWin()
  if (code === 0) log('Done.')
  else log(`Failed (exit ${code}). Watching continues...`)

  running = false
  if (rerunRequested) {
    log('Queued changes detected → rerun.')
    schedule()
  }
}

function schedule() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void trigger()
  }, 1200)
}

log('Watching for changes...')
log('Tip: 单击“刷”=单次格式刷；双击“刷”=锁定连续刷；Esc 退出。')
log('Tip: 退出监听请按 Ctrl+C。')

const watcher = chokidar.watch(WATCH_GLOBS, {
  ignored: IGNORED,
  ignoreInitial: !runOnStart,
})

watcher.on('all', (_event, filePath) => {
  // chokidar may emit paths with backslashes on Windows.
  const p = String(filePath || '')
  if (!p) return
  schedule()
})

async function shutdown() {
  try {
    await watcher.close()
  } catch {
    // ignore
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
