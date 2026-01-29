export type ComponentProps = Record<string, string>

export type ComponentMigration = {
  from: number
  to: number
  migrate: (props: ComponentProps) => ComponentProps
}

// Registry: add migrations here when bumping a component's schemaVersion.
// Notes:
// - Props version is stored in props as `_v` (stringified integer).
// - Missing/invalid `_v` is treated as 0.
// - Migrations are applied sequentially until reaching targetVersion.
export const COMPONENT_MIGRATIONS: Record<string, ComponentMigration[]> = {
  // Demo migration: calloutInfo v2 renames `variant` -> `kind`.
  // This showcases schemaVersion bump + automatic props migration for old documents.
  calloutInfo: [
    // v0: legacy docs may have no `_v`. Treat it as v1-equivalent baseline.
    {
      from: 0,
      to: 1,
      migrate: (p) => ({
        ...p,
        variant: p.variant || 'info',
      }),
    },
    // v2: rename key and drop the old one.
    {
      from: 1,
      to: 2,
      migrate: (p) => {
        const kind = p.kind || p.variant || 'info'
        // Avoid TS complaining about deleting on a narrowed type.
        const base = { ...p } as Record<string, string>
        base.kind = kind
        delete base.variant
        return base
      },
    },
  ],
}

const readVersion = (props: ComponentProps): number => {
  const raw = props._v
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

export function migrateComponentProps(componentId: string, props: ComponentProps, targetVersion: number): ComponentProps {
  const migrations = COMPONENT_MIGRATIONS[componentId] ?? []
  if (migrations.length === 0) return { ...props, _v: String(targetVersion) }

  let current = { ...props }
  let v = readVersion(current)

  // Hard cap prevents accidental infinite loops.
  for (let i = 0; i < 50 && v < targetVersion; i++) {
    const step = migrations.find((m) => m.from === v)
    if (!step) break
    current = step.migrate(current)
    v = step.to
  }

  current._v = String(targetVersion)
  return current
}

export function stripInternalComponentProps(props: ComponentProps): ComponentProps {
  const out: ComponentProps = {}
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('_')) continue
    out[k] = v
  }
  return out
}
