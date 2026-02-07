import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function log(msg) {
  process.stdout.write(`${msg}\n`)
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  })
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${res.status})`)
  }
}

function runCapture(cmd, args) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  if (res.status !== 0) {
    const out = String(res.stdout || '') + String(res.stderr || '')
    throw new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${res.status})\n${out}`)
  }
  return String(res.stdout || '')
}

function parseArgs(argv) {
  const out = { bump: null, setVersion: null, noPush: false, strictClean: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--bump' && i + 1 < argv.length) {
      const v = String(argv[i + 1] || '').trim().toLowerCase()
      out.bump = v
      i++
      continue
    }
    if (a === '--set-version' && i + 1 < argv.length) {
      out.setVersion = String(argv[i + 1] || '').trim()
      i++
      continue
    }
    if (a === '--no-push') {
      out.noPush = true
      continue
    }
    if (a === '--strict-clean') {
      out.strictClean = true
      continue
    }
  }
  return out
}

async function readPkgVersion() {
  const pkgPath = path.join(repoRoot, 'package.json')
  const raw = await fs.readFile(pkgPath, 'utf8')
  const pkg = JSON.parse(raw)
  const v = typeof pkg?.version === 'string' ? pkg.version.trim() : ''
  if (!v) throw new Error('package.json version is empty')
  return v
}

function ensureGitClean({ strict } = { strict: false }) {
  const s = runCapture('git', ['status', '--porcelain']).trim()
  if (s.length === 0) return

  const lines = s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)

  const hasTrackedChanges = lines.some((l) => !l.startsWith('??'))
  const hasUntracked = lines.some((l) => l.startsWith('??'))

  if (strict ? (hasTrackedChanges || hasUntracked) : hasTrackedChanges) {
    throw new Error(
      [
        'Working tree is not clean. Commit/stash changes first, then rerun release.',
        strict ? '(strict mode: untracked files also block release)' : '(note: untracked files are allowed)',
        '',
        s,
      ].join('\n'),
    )
  }
}

function ensureTagNotExists(tag) {
  const out = runCapture('git', ['tag', '--list', tag]).trim()
  if (out === tag) {
    throw new Error(`Tag already exists: ${tag}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.bump && !args.setVersion) {
    // Default: patch bump (same as strict-release default)
    args.bump = 'patch'
  }

  if (args.bump && !['patch', 'minor', 'major'].includes(args.bump)) {
    throw new Error(`Invalid --bump value: ${args.bump} (expected patch/minor/major)`) 
  }

  ensureGitClean({ strict: args.strictClean })

  log('[release] Running strict release rule (clean + bump + changelog + notes + package)...')
  const strictArgs = []
  if (args.setVersion) {
    strictArgs.push('--set-version', args.setVersion)
  } else if (args.bump) {
    strictArgs.push('--bump', args.bump)
  }
  run('node', ['scripts/strict-release.mjs', ...strictArgs])

  const version = await readPkgVersion()
  const tag = `v${version}`
  ensureTagNotExists(tag)

  // Stage release metadata files.
  const pathsToAdd = ['package.json', 'CHANGELOG.md']
  try {
    await fs.access(path.join(repoRoot, 'package-lock.json'))
    pathsToAdd.push('package-lock.json')
  } catch {
    // ignore
  }
  try {
    await fs.access(path.join(repoRoot, 'release-notes', `v${version}.md`))
    pathsToAdd.push(path.join('release-notes', `v${version}.md`))
  } catch {
    // ignore
  }

  log(`[release] Committing release files for ${tag}...`)
  run('git', ['add', ...pathsToAdd])
  run('git', ['commit', '-m', `release: ${tag}`])

  log(`[release] Creating tag ${tag}...`)
  run('git', ['tag', tag])

  if (args.noPush) {
    log('[release] Done (no push).')
    return
  }

  log('[release] Pushing commit + tag...')
  run('git', ['push', '--follow-tags'])

  log(`[release] Done. GitHub Actions should now build/publish ${tag}.`) 
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err?.message || String(err)}\n`)
  process.exit(1)
})
