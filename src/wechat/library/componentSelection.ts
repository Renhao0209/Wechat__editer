import type { EditorState } from '@tiptap/pm/state'

import type { ComponentConfigSchema, ComponentItem } from './types'

export type SelectedComponentInstance = {
  componentId: string
  from?: number
  to?: number
  sourceStart?: number
  sourceEnd?: number
  values: Record<string, string>
}

export type ComponentSelectionDeps = {
  components: ComponentItem[]
  getComponentSchema: (c: ComponentItem) => ComponentConfigSchema | null
  getComponentRenderer: (c: ComponentItem) => ComponentItem['render'] | null
  getDefaultComponentValues: (c: ComponentItem, schema: ComponentConfigSchema) => Record<string, string>
  readSavedComponentConfigValues: (componentId: string) => Record<string, string> | null
  decodeComponentProps: (raw: string) => Record<string, string> | null
  normalizeComponentValues: (c: ComponentItem, values: Record<string, string>) => Record<string, string>
}

export function probeSelectedComponent(
  editor: { state: EditorState } | null,
  deps: ComponentSelectionDeps,
): SelectedComponentInstance | null {
  try {
    if (!editor) return null
    const state = editor.state
    const $from = state.selection.$from

    const inferComponentIdFromNode = (nodeTypeName: string, attrs: Record<string, unknown>): string => {
      const cls = typeof attrs.class === 'string' ? (attrs.class as string) : ''
      if (nodeTypeName === 'blockquote') {
        if (cls.includes('card')) return 'card'
        if (cls.includes('callout')) return 'calloutInfo'
      }
      if (nodeTypeName === 'heading') {
        const level = typeof attrs.level === 'number' ? (attrs.level as number) : undefined
        if (level === 2 && cls.includes('titlebar')) return 'titlebarH2'
      }
      return ''
    }

    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth)
      const attrs = (node?.attrs ?? {}) as Record<string, unknown>
      const nodeTypeName = node?.type?.name ?? ''

      let componentId = typeof attrs.wceComponent === 'string' ? (attrs.wceComponent as string) : ''
      if (!componentId) componentId = inferComponentIdFromNode(nodeTypeName, attrs)
      if (!componentId) continue

      const target = deps.components.find((c) => c.id === componentId)
      if (!target) continue
      const schema = deps.getComponentSchema(target)
      const renderer = deps.getComponentRenderer(target)
      if (!schema || !renderer) continue

      const defaults = deps.getDefaultComponentValues(target, schema)
      const rawProps = typeof attrs.wceProps === 'string' ? (attrs.wceProps as string) : ''
      const decoded = rawProps ? deps.decodeComponentProps(rawProps) : null
      const saved = deps.readSavedComponentConfigValues(componentId) ?? {}
      const values = deps.normalizeComponentValues(target, { ...defaults, ...saved, ...(decoded ?? {}) })

      if (depth <= 0) continue
      const from = $from.before(depth)
      const to = from + node.nodeSize

      return { componentId, from, to, values }
    }

    return null
  } catch {
    return null
  }
}

export function probeMarkdownComponentAtIndex(
  text: string,
  index: number,
  deps: ComponentSelectionDeps,
): SelectedComponentInstance | null {
  const clampIndex = Math.max(0, Math.min(index, text.length))

  const lastDataAttr = text.lastIndexOf('data-wce-component', clampIndex)
  const lastFallbackBlockquote = text.lastIndexOf('<blockquote', clampIndex)
  const lastFallbackH2 = text.lastIndexOf('<h2', clampIndex)
  const startFromAttr = lastDataAttr >= 0 ? text.lastIndexOf('<', lastDataAttr) : -1
  const start = Math.max(startFromAttr, lastFallbackBlockquote, lastFallbackH2)
  if (start < 0) return null

  const tagClose = text.indexOf('>', start)
  if (tagClose < 0) return null
  const openTag = text.slice(start, tagClose + 1)

  const tagMatch = /^<\s*([a-z0-9-]+)/i.exec(openTag)
  const tagName = (tagMatch?.[1] ?? '').toLowerCase()
  if (!tagName) return null

  const isSelfClosing = /\/\s*>\s*$/.test(openTag) || tagName === 'hr'

  const getAttr = (name: string): string => {
    const re = new RegExp(`${name}="([^"]*)"`, 'i')
    const m = re.exec(openTag)
    return m?.[1] ?? ''
  }

  let end = tagClose + 1
  if (!isSelfClosing) {
    const openNeedle = `<${tagName}`
    const closeNeedle = `</${tagName}>`
    let scan = tagClose + 1
    let depth = 1

    const isNameBoundary = (pos: number): boolean => {
      const c = text[pos + openNeedle.length]
      return c == null || /[\s>/]/.test(c)
    }

    while (scan < text.length) {
      const nextOpenRaw = text.indexOf(openNeedle, scan)
      const nextOpen = nextOpenRaw >= 0 && isNameBoundary(nextOpenRaw) ? nextOpenRaw : -1
      const nextClose = text.indexOf(closeNeedle, scan)

      if (nextClose < 0) return null

      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1
        scan = nextOpen + openNeedle.length
        continue
      }

      depth -= 1
      scan = nextClose + closeNeedle.length
      if (depth <= 0) {
        end = scan
        break
      }
    }
  }

  if (clampIndex < start || clampIndex > end) return null

  let componentId = getAttr('data-wce-component')
  const rawProps = getAttr('data-wce-props')
  const classAttr = getAttr('class')

  if (!componentId) {
    const isBlockquote = tagName === 'blockquote'
    if (isBlockquote) {
      if (classAttr.includes('card')) componentId = 'card'
      else if (classAttr.includes('callout')) componentId = 'calloutInfo'
    } else if (tagName === 'h2') {
      if (classAttr.includes('titlebar')) componentId = 'titlebarH2'
    }
  }

  if (!componentId) return null

  const target = deps.components.find((c) => c.id === componentId)
  if (!target) return null
  const schema = deps.getComponentSchema(target)
  const renderer = deps.getComponentRenderer(target)
  if (!schema || !renderer) return null

  const defaults = deps.getDefaultComponentValues(target, schema)
  const decoded = rawProps ? deps.decodeComponentProps(rawProps) : null
  const saved = deps.readSavedComponentConfigValues(componentId) ?? {}
  const values = deps.normalizeComponentValues(target, { ...defaults, ...saved, ...(decoded ?? {}) })

  return { componentId, sourceStart: start, sourceEnd: end, values }
}
