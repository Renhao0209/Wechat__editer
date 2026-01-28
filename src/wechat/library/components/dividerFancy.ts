import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, escapeHtml, toneClass, toneField } from '../componentConfigHelpers'

const component = {
  id: 'dividerFancy',
  name: '分隔符（花纹）',
  category: '分隔',

  config: buildConfig('插入：分隔符（花纹）', undefined, [
    { key: 'text', label: '符号', type: 'text', default: '✦ ✦ ✦' },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const text = escapeHtml((values.text || '✦ ✦ ✦').trim()) || '✦ ✦ ✦'
    const className = ['divider', 'divider--flower', cls].filter(Boolean).join(' ')
    return { html: `<p class="${className}">${text}</p><p></p>` }
  },
} satisfies BuiltInComponentDef

export default component
