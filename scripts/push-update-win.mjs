#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function die(msg) {
  process.stderr.write(`${msg}\n`)
  process.exit(1)
}

async function main() {
  const pkgPath = path.join(repoRoot, 'package.json')
  const raw = await fs.readFile(pkgPath, 'utf8')
  const pkg = JSON.parse(raw)
  const version = typeof pkg?.version === 'string' ? pkg.version.trim() : ''
  if (!version) die('[push-update] Cannot read package.json version')

  const env = { ...process.env, WCE_RELEASE_VERSION: version, WCE_PUBLISH: '1' }

  const ps = process.platform === 'win32' ? 'powershell' : 'pwsh'
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/dist-win.ps1']

  const res = spawnSync(ps, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env,
  })

  process.exit(res.status ?? 1)
}

main().catch((e) => {
  die(`[push-update] FAILED: ${e?.message || e}`)
})
