import type { BuiltInComponentDef } from '../componentRegistryTypes'
import {
  buildConfig,
  encodeComponentProps,
  escapeHtml,
  escapeHtmlAttr,
  toneClass,
  toneField,
} from '../componentConfigHelpers'

const component = {
  // 建议文件名: separator-lantern-dynamic.ts
  id: 'separator-lantern-dynamic',
  name: '分割线-动态灯笼',
  desc: '中国风灯笼分割线（可选色系）。',
  category: '分割线',

  config: buildConfig('插入：灯笼分割线', '选择色系（用 class 控制，保证稳定可见）。', [
    toneField('red'),
    {
      key: 'emoji',
      label: '图案',
      type: 'text',
      default: '🧧 🧧 🧧',
      placeholder: '例如：🧧 🧧 🧧 或 ✨ ✨ ✨',
    },
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const emoji = escapeHtml((values.emoji || '🧧 🧧 🧧').trim()) || '🧧 🧧 🧧'
    const wrapperClassName = ['wce-wrap', cls].filter(Boolean).join(' ')
    const propsRaw = escapeHtmlAttr(encodeComponentProps(values))
    return {
      html: `
<blockquote class="${wrapperClassName}" data-wce-component="separator-lantern-dynamic" data-wce-props="${propsRaw}">
<hr class="${cls}" />
<p class="divider divider--lantern ${cls}">${emoji}</p>
</blockquote>
<p></p>
`.trim(),
    }
  },

  // 说明：Tiptap/ProseMirror 会过滤不在 schema 内的标签（如 svg/style/section），
  // 直接插入 SVG 往往会变成空内容导致“不显示”。
  // 这里改为“纯文本 + class”的稳定方案，保证编辑器预览/导出/粘贴都可见。
} satisfies BuiltInComponentDef

export default component