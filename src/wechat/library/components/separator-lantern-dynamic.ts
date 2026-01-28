import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  // 建议文件名: separator-lantern-dynamic.ts
  id: 'separator-lantern-dynamic',
  name: '分割线-动态灯笼',
  desc: '带有轻微摇摆动画的中国风灯笼分割线（红金配色）。',
  category: '分割线',

  // 说明：Tiptap/ProseMirror 会过滤不在 schema 内的标签（如 svg/style/section），
  // 直接插入 SVG 往往会变成空内容导致“不显示”。
  // 这里改为“纯文本 + class”的稳定方案，保证编辑器预览/导出/粘贴都可见。
  html: `
<hr />
<p class="divider divider--lantern">🧧 🧧 🧧</p>
<p></p>
`.trim(),
} satisfies BuiltInComponentDef

export default component