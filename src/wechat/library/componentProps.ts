import type { ComponentConfigSchema, ComponentItem } from './types'
import { migrateComponentProps } from './componentMigrations'
import { getComponentSchemaVersion } from './componentSpec'

export function getDefaultComponentConfigValues(schema: ComponentConfigSchema): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of schema.fields) {
    out[f.key] = f.default ?? ''
  }
  return out
}

export function getDefaultComponentValues(c: ComponentItem, schema: ComponentConfigSchema): Record<string, string> {
  return {
    ...getDefaultComponentConfigValues(schema),
    ...(c.defaultProps ?? {}),
    _v: String(getComponentSchemaVersion(c)),
  }
}

export function getStyleKeys(schema: ComponentConfigSchema): string[] {
  return schema.fields
    .filter((f) => f.role === 'style' || (f.role == null && (f.type === 'select' || f.type === 'color')))
    .map((f) => f.key)
}

export function normalizeComponentValues(c: ComponentItem, values: Record<string, string>): Record<string, string> {
  const targetVersion = getComponentSchemaVersion(c)
  return migrateComponentProps(c.id, values, targetVersion)
}
