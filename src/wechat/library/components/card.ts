import type { BuiltInComponentDef } from '../componentRegistryTypes'
import {
  buildConfig,
  encodeComponentProps,
  escapeHtml,
  escapeHtmlAttr,
  escapeHtmlWithBreaks,
  toneClass,
  toneField,
} from '../componentConfigHelpers'

const schema = buildConfig('插入：内容卡片', undefined, [
  { key: 'title', label: '标题', type: 'text', role: 'content', default: '卡片标题' },
  {
    key: 'body',
    label: '内容',
    type: 'textarea',
    role: 'content',
    default: '在这里写卡片内容…',
    placeholder: '支持换行（会转成 <br />）',
  },
  toneField('theme'),
])

const component = {
  id: 'card',
  name: '内容卡片',
  desc: '一段重点信息',
  category: '卡片',

  schemaVersion: 1,
  tags: ['card', '卡片'],

  defaultProps: {
    title: '卡片标题',
    body: '在这里写卡片内容…',
    tone: 'theme',
  },

  propSchema: schema,
  config: schema,

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const title = escapeHtml((values.title || '卡片标题').trim()) || '卡片标题'
    const body = escapeHtmlWithBreaks((values.body || '在这里写卡片内容…').trim()) || '在这里写卡片内容…'
    const className = ['card', cls].filter(Boolean).join(' ')

    const propsRaw = escapeHtmlAttr(encodeComponentProps(values))
    return {
      html: `<blockquote class="${className}" data-wce-component="card" data-wce-props="${propsRaw}"><p class="card__title"><strong>${title}</strong></p><p>${body}</p></blockquote><p></p>`,
    }
  },
} satisfies BuiltInComponentDef

export default component
