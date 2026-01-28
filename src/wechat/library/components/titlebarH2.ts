import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, escapeHtml, toneClass, toneField } from '../componentConfigHelpers'

const component = {
  id: 'titlebarH2',
  name: '标题条（H2）',
  desc: '适合章节开头',
  category: '标题',

  config: buildConfig('插入：标题条（H2）', undefined, [
    { key: 'text', label: '标题', type: 'text', default: '章节标题' },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const text = escapeHtml((values.text || '章节标题').trim()) || '章节标题'
    const className = ['titlebar', cls].filter(Boolean).join(' ')
    return { html: `<h2 class="${className}">${text}</h2><p></p>` }
  },
} satisfies BuiltInComponentDef

export default component
