import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'royalFrame',
  name: '紫金边框容器（海报风）',
  desc: '用于活动/公告/促销开头（更像你截图那种边框）',
  category: '卡片',
  html: `<blockquote class="frame frame--royal"><p class="frame__kicker"><strong>活动标题</strong></p><p>在这里写内容…</p><p class="caption">（上下滑动查看全部内容）</p></blockquote><p></p>`,
} satisfies BuiltInComponentDef

export default component
