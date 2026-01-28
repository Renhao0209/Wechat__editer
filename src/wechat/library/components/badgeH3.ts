import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'badgeH3',
  name: '小标题徽章（H3）',
  desc: '适合小节/要点',
  category: '标题',
  html: `<h3 class="badge">要点小标题</h3><p></p>`,
} satisfies BuiltInComponentDef

export default component
