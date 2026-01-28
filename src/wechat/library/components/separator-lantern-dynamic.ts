import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  // 建议文件名: separator-lantern-dynamic.ts
  id: 'separator-lantern-dynamic',
  name: '分割线-动态灯笼',
  desc: '中国风灯笼分割线（可选颜色）。',
  category: '分割线',

  config: {
    title: '插入：灯笼分割线',
    desc: '选择灯笼颜色（使用 class 实现，保证 Tiptap/导出/粘贴稳定）。',
    fields: [
      {
        key: 'color',
        label: '颜色',
        type: 'select',
        default: 'red',
        options: [
          { label: '喜庆红', value: 'red' },
          { label: '鎏金', value: 'gold' },
          { label: '典雅紫', value: 'purple' },
          { label: '清新绿', value: 'green' },
          { label: '海军蓝', value: 'blue' },
          { label: '低调灰', value: 'gray' },
        ],
      },
    ],
  },

  render: (values: Record<string, string>) => {
    const color = values.color || 'red'
    const safe = ['red', 'gold', 'purple', 'green', 'blue', 'gray'].includes(color) ? color : 'red'
    return {
      html: `
<hr />
<p class="divider divider--lantern divider--c-${safe}">🧧 🧧 🧧</p>
<p></p>
`.trim(),
    }
  },

  // 说明：Tiptap/ProseMirror 会过滤不在 schema 内的标签（如 svg/style/section），
  // 直接插入 SVG 往往会变成空内容导致“不显示”。
  // 这里改为“纯文本 + class”的稳定方案，保证编辑器预览/导出/粘贴都可见。
} satisfies BuiltInComponentDef

export default component