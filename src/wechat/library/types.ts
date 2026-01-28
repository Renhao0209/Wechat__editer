export type TemplateItem = {
  id: string
  name: string
  html: string
}

export type ComponentCategory = '标题' | '卡片' | '引用' | '分隔' | '分割线' | '清单' | '图片'

export type ComponentConfigFieldType = 'text' | 'textarea' | 'color' | 'select'

export type ComponentConfigField = {
  key: string
  label: string
  type: ComponentConfigFieldType
  default?: string
  placeholder?: string
  options?: Array<{ label: string; value: string }>
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

export type ComponentRenderer = (values: Record<string, string>) => ComponentRenderResult

export type ComponentItem = {
  id: string
  name: string
  desc?: string
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
