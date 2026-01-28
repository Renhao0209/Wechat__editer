import type { ComponentConfigField, ComponentConfigSchema } from './types'

export type ComponentToneId = 'theme' | 'red' | 'gold' | 'purple' | 'green' | 'blue' | 'gray'

export const TONE_OPTIONS: Array<{ label: string; value: ComponentToneId }> = [
  { label: '跟随主题', value: 'theme' },
  { label: '喜庆红', value: 'red' },
  { label: '鎏金', value: 'gold' },
  { label: '典雅紫', value: 'purple' },
  { label: '清新绿', value: 'green' },
  { label: '海军蓝', value: 'blue' },
  { label: '低调灰', value: 'gray' },
]

export const toneField = (defaultValue: ComponentToneId = 'theme'): ComponentConfigField => ({
  key: 'tone',
  label: '色系',
  type: 'select',
  default: defaultValue,
  options: TONE_OPTIONS,
})

export function toneClass(values: Record<string, string>): string {
  const tone = (values.tone || 'theme') as ComponentToneId
  if (tone === 'theme') return ''
  return `tone tone--${tone}`
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function escapeHtmlAttr(text: string): string {
  return escapeHtml(text)
}

export function escapeHtmlWithBreaks(text: string): string {
  return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br />')
}

export function buildConfig(title: string, desc: string | undefined, fields: ComponentConfigField[]): ComponentConfigSchema {
  return {
    title,
    desc,
    fields,
  }
}

export function encodeComponentProps(values: Record<string, string>): string {
  return encodeURIComponent(JSON.stringify(values))
}

export function decodeComponentProps(raw: string): Record<string, string> | null {
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw)
    const parsed = JSON.parse(decoded) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v)
      else if (v == null) out[k] = ''
    }
    return out
  } catch {
    return null
  }
}
