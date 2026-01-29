export type TemplateItem = {
  id: string
  name: string
  html: string
}

export type ComponentCategory = '标题' | '卡片' | '引用' | '分隔' | '分割线' | '清单' | '图片'

export type ComponentConfigFieldType = 'text' | 'textarea' | 'color' | 'select' | 'number' | 'range' | 'switch'

export type ComponentConfigField = {
  key: string
  label: string
  type: ComponentConfigFieldType
  // Used by the props panel to decide what counts as "style" vs "content".
  // When copying styles across instances, only fields with role=style are applied.
  role?: 'style' | 'content'
  default?: string
  placeholder?: string
  options?: Array<{ label: string; value: string }>
  min?: number
  max?: number
  step?: number
  visibleWhen?: { key: string; equals: string }
  disabledWhen?: { key: string; equals: string }
}

export type ComponentConfigSchema = {
  title?: string
  desc?: string
  fields: ComponentConfigField[]
}

export type ComponentRenderResult =
  | { html: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { content: any }
  // Some components need both: structured content for rich editor + HTML for Markdown mode.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { html: string; content: any }

export type ComponentRenderer = (values: Record<string, string>) => ComponentRenderResult

export type ComponentItem = {
  id: string
  name: string
  desc?: string
  // Alias for Roadmap wording.
  description?: string
  tags?: string[]
  previewThumb?: string
  schemaVersion?: number
  defaultProps?: Record<string, string>
  // Alias for Roadmap wording.
  propSchema?: ComponentConfigSchema
  // Alias for Roadmap wording.
  renderer?: ComponentRenderer
  html?: string
  // Prefer structured content for nodes that would be sanitized in HTML parsing (e.g. custom nodes).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content?: any
  category: ComponentCategory

  // Optional: configurable component (show form on insert, then render HTML/content).
  config?: ComponentConfigSchema
  render?: ComponentRenderer
}

export type LayoutPreset = {
  id: string
  name: string
  desc: string
  html: string
}
