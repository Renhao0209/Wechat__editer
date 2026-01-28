import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'quoteFocus',
  name: '强调引用（金句）',
  desc: '用于观点/金句',
  category: '引用',
  html: `<blockquote class="quote"><p>“一句话金句/观点，适合在段落之间做强调。”</p></blockquote><p></p>`,
} satisfies BuiltInComponentDef

export default component
