import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'guide',
  name: '引导块（步骤提示）',
  desc: '适合教程/流程',
  category: '卡片',
  html: `<blockquote class="guide"><p class="guide__kicker"><strong>操作指引</strong></p><ol><li>第一步：…</li><li>第二步：…</li><li>第三步：…</li></ol></blockquote><p></p>`,
} satisfies BuiltInComponentDef

export default component
