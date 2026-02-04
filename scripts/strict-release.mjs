import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

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

function parseArgs(argv) {
  const out = { setVersion: null, bump: 'patch' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--set-version' && i + 1 < argv.length) {
      out.setVersion = String(argv[i + 1] || '').trim()
      i++
      continue
    }
    if (a === '--bump' && i + 1 < argv.length) {
      const v = String(argv[i + 1] || '').trim().toLowerCase()
      if (v === 'patch' || v === 'minor' || v === 'major') out.bump = v
      i++
      continue
    }
  }
  return out
}

async function safeRm(p) {
  try {
    await fs.rm(p, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

async function cleanLastBuild() {
  log('[strict-release] Cleaning last build artifacts...')
  await safeRm(path.join(repoRoot, 'dist'))

  const releaseDir = path.join(repoRoot, 'release')
  await safeRm(path.join(releaseDir, 'win-unpacked'))

  const patterns = [
    /^WeChat Editor-.*\.exe$/i,
    /^WeChat Editor-.*\.exe\.blockmap$/i,
    /\.blockmap$/i,
    /^latest\.yml$/i,
    /^builder-debug\.yml$/i,
    /^builder-effective-config\.yaml$/i,
  ]

  let entries = []
  try {
    entries = await fs.readdir(releaseDir, { withFileTypes: true })
  } catch {
    return
  }

  await Promise.all(
    entries
      .filter((e) => e.isFile())
      .map(async (e) => {
        const name = e.name
        if (!patterns.some((re) => re.test(name))) return
        await safeRm(path.join(releaseDir, name))
      }),
  )
}

async function readCurrentVersion() {
  const pkgPath = path.join(repoRoot, 'package.json')
  const raw = await fs.readFile(pkgPath, 'utf8')
  const pkg = JSON.parse(raw)
  const v = typeof pkg?.version === 'string' ? pkg.version.trim() : ''
  return v
}

function npmVersion(argsLabel, versionArgs) {
  log(`[strict-release] Bumping version (${argsLabel})...`)
  const res = spawnSync('npm', ['version', ...versionArgs, '--no-git-tag-version'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })

  if (res.status !== 0) {
    process.stdout.write(res.stdout || '')
    process.stderr.write(res.stderr || '')
    throw new Error(`npm version failed (exit ${res.status})`)
  }

  const out = String(res.stdout || '').trim().split(/\r?\n/)[0]?.trim() ?? ''
  const v = out.startsWith('v') ? out.slice(1) : out
  if (!v) throw new Error(`Unexpected npm version output: ${JSON.stringify(out)}`)
  log(`[strict-release] New version: ${v}`)
  return v
}

function todayISO() {
  const d = new Date()
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseUnreleasedBullets(lines) {
  const categories = ['Added', 'Changed', 'Fixed', 'Removed']
  const bullets = Object.fromEntries(categories.map((c) => [c, []]))

  const start = lines.findIndex((l) => /^##\s+\[Unreleased\]\s*$/.test(l))
  if (start < 0) return bullets

  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+\[/.test(lines[i])) {
      end = i
      break
    }
  }

  let current = null
  for (let i = start + 1; i < end; i++) {
    const line = lines[i]
    const m = line.match(/^###\s+(Added|Changed|Fixed|Removed)\s*$/)
    if (m) {
      current = m[1]
      continue
    }
    if (!current) continue
    const b = line.match(/^\s*-\s*(.*)\s*$/)
    if (!b) continue
    const text = (b[1] || '').trim()
    if (!text) continue
    bullets[current].push(`- ${text}`)
  }

  return bullets
}

function buildUnreleasedTemplate() {
  return [
    '## [Unreleased]',
    '',
    '### Added',
    '',
    '- ',
    '',
    '### Changed',
    '',
    '- ',
    '',
    '### Fixed',
    '',
    '- ',
    '',
    '### Removed',
    '',
    '- ',
  ]
}

function buildVersionSection(version, date, bullets) {
  const categories = ['Added', 'Changed', 'Fixed', 'Removed']
  const hasAny = categories.some((c) => bullets[c]?.length)
  const b = { ...bullets }
  if (!hasAny) {
    b.Changed = [...(b.Changed || []), '- 例行构建（未填写 Unreleased 变更条目）。']
  }

  const out = [`## [${version}] - ${date}`, '']
  for (const c of categories) {
    const list = b[c] || []
    if (!list.length) continue
    out.push(`### ${c}`, '', ...list, '')
  }
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}

async function updateChangelogAndReleaseNotes(version, date) {
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md')
  let raw
  try {
    raw = await fs.readFile(changelogPath, 'utf8')
  } catch {
    log('[strict-release] CHANGELOG.md not found, skipping.')
    return
  }

  // Idempotency: avoid inserting the same version section twice.
  if (new RegExp(`^##\\s+\\[${version.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\]\\s+\\-\\s+`, 'm').test(raw)) {
    log(`[strict-release] CHANGELOG already has version ${version}, skipping changelog update.`)
    return
  }

  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex((l) => /^##\s+\[Unreleased\]\s*$/.test(l))
  if (start < 0) {
    log('[strict-release] Unreleased section not found, skipping changelog update.')
    return
  }

  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+\[/.test(lines[i])) {
      end = i
      break
    }
  }

  const bullets = parseUnreleasedBullets(lines)
  const template = buildUnreleasedTemplate()
  const versionSection = buildVersionSection(version, date, bullets)

  const nextLines = [...lines.slice(0, start), ...template, '', ...versionSection, '', ...lines.slice(end)]
  const next = nextLines.join('\n').replace(/\n{3,}/g, '\n\n')
  await fs.writeFile(changelogPath, next, 'utf8')
  log('[strict-release] Updated CHANGELOG.md')

  const notesDir = path.join(repoRoot, 'release-notes')
  await fs.mkdir(notesDir, { recursive: true })
  const notesPath = path.join(notesDir, `v${version}.md`)
  try {
    await fs.access(notesPath)
    log(`[strict-release] Release notes exists: ${path.relative(repoRoot, notesPath)}`)
    return
  } catch {
    // continue
  }

  const rn = [`# v${version}（${date}）`, '']
  for (const c of ['Added', 'Changed', 'Fixed', 'Removed']) {
    const list = bullets[c] || []
    if (!list.length) continue
    rn.push(`## ${c}`, '', ...list, '')
  }
  if (rn.length === 2) {
    rn.push('## Changed', '', '- 例行构建（未填写 Unreleased 变更条目）。')
  }

  while (rn.length && rn[rn.length - 1] === '') rn.pop()
  await fs.writeFile(notesPath, rn.join('\n') + '\n', 'utf8')
  log(`[strict-release] Wrote release notes: ${path.relative(repoRoot, notesPath)}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await cleanLastBuild()

  let version
  if (args.setVersion) {
    const current = await readCurrentVersion()
    if (current && current === args.setVersion) {
      log(`[strict-release] Version already ${current}, skipping npm version.`)
      version = current
    } else {
      version = npmVersion(`set ${args.setVersion}`, [args.setVersion])
    }
  } else {
    version = npmVersion(args.bump, [args.bump])
  }

  const date = todayISO()
  await updateChangelogAndReleaseNotes(version, date)

  // Optional: ensure install deps are present (no-op if already installed)
  // run('npm', ['install'])
}

main().catch((err) => {
  console.error(`[strict-release] FAILED: ${err?.message || err}`)
  process.exit(1)
})
