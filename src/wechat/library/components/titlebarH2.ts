import type { BuiltInComponentDef } from '../componentRegistryTypes'
import {
  buildConfig,
  encodeComponentProps,
  escapeHtml,
  escapeHtmlAttr,
  toneClass,
  toneField,
} from '../componentConfigHelpers'

const schema = buildConfig('插入：标题条（H2）', undefined, [
  { key: 'text', label: '标题', type: 'text', role: 'content', default: '章节标题' },
  toneField('theme'),
])

const component = {
  id: 'titlebarH2',
  name: '标题条（H2）',
  desc: '适合章节开头',
  category: '标题',

  schemaVersion: 1,
  tags: ['titlebar', '标题条', '章节'],

  defaultProps: {
    text: '章节标题',
    tone: 'theme',
  },

  propSchema: schema,
  config: schema,

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const text = escapeHtml((values.text || '章节标题').trim()) || '章节标题'
    const className = ['titlebar', cls].filter(Boolean).join(' ')
    const propsRaw = escapeHtmlAttr(encodeComponentProps(values))
    return { html: `<h2 class="${className}" data-wce-component="titlebarH2" data-wce-props="${propsRaw}">${text}</h2><p></p>` }
  },
} satisfies BuiltInComponentDef

export default component
