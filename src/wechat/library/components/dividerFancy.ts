import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'dividerFancy',
  name: '分隔符（花纹）',
  category: '分隔',
  html: `<p class="divider divider--flower">✦ ✦ ✦</p><p></p>`,
} satisfies BuiltInComponentDef

export default component
