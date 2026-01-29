import type { ComponentConfigSchema, ComponentItem } from './types'

export function getComponentSchema(c: ComponentItem): ComponentConfigSchema | null {
  return (c.propSchema ?? c.config ?? null) as ComponentConfigSchema | null
}

export function getComponentSchemaVersion(c: ComponentItem): number {
  const v = typeof c.schemaVersion === 'number' ? c.schemaVersion : 1
  return Number.isFinite(v) && v > 0 ? Math.trunc(v) : 1
}

export function getComponentRenderer(c: ComponentItem): ComponentItem['render'] | null {
  return (c.renderer ?? c.render ?? null) as ComponentItem['render'] | null
}
