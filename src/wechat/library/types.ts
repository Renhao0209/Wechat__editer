export type TemplateItem = {
  id: string
  name: string
  html: string
}

export type ComponentCategory = '标题' | '卡片' | '引用' | '分隔' | '分割线' | '清单' | '图片'

export type ComponentItem = {
  id: string
  name: string
  desc?: string
  html?: string
  // Prefer structured content for nodes that would be sanitized in HTML parsing (e.g. custom nodes).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content?: any
  category: ComponentCategory
}

export type LayoutPreset = {
  id: string
  name: string
  desc: string
  html: string
}
