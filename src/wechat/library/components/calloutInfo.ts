import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'calloutInfo',
  name: '提示框（信息）',
  category: '引用',
  html: `<blockquote class="callout callout--info"><p><strong>信息</strong></p><p>这里填内容…</p></blockquote><p></p>`,
} satisfies BuiltInComponentDef

export default component
