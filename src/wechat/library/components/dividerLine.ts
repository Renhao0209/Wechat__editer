import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'dividerLine',
  name: '分隔线（虚线）',
  category: '分隔',
  html: `<hr /><p></p>`,
} satisfies BuiltInComponentDef

export default component
