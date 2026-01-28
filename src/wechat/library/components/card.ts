import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'card',
  name: '内容卡片',
  desc: '一段重点信息',
  category: '卡片',
  html: `<blockquote class="card"><p class="card__title"><strong>卡片标题</strong></p><p>在这里写卡片内容…</p></blockquote><p></p>`,
} satisfies BuiltInComponentDef

export default component
