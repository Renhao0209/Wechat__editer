import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, escapeHtml, toneClass, toneField } from '../componentConfigHelpers'

const component = {
  id: 'quoteFocus',
  name: '强调引用（金句）',
  desc: '用于观点/金句',
  category: '引用',

  config: buildConfig('插入：强调引用', undefined, [
    {
      key: 'text',
      label: '内容',
      type: 'textarea',
      default: '“一句话金句/观点，适合在段落之间做强调。”',
    },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const text = escapeHtml((values.text || '').trim()) || '“一句话金句/观点，适合在段落之间做强调。”'
    const className = ['quote', cls].filter(Boolean).join(' ')
    return { html: `<blockquote class="${className}"><p>${text}</p></blockquote><p></p>` }
  },
} satisfies BuiltInComponentDef

export default component
