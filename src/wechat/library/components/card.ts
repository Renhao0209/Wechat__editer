import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, escapeHtml, escapeHtmlWithBreaks, toneClass, toneField } from '../componentConfigHelpers'

const component = {
  id: 'card',
  name: '内容卡片',
  desc: '一段重点信息',
  category: '卡片',

  config: buildConfig('插入：内容卡片', undefined, [
    { key: 'title', label: '标题', type: 'text', default: '卡片标题' },
    { key: 'body', label: '内容', type: 'textarea', default: '在这里写卡片内容…', placeholder: '支持换行（会转成 <br />）' },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const title = escapeHtml((values.title || '卡片标题').trim()) || '卡片标题'
    const body = escapeHtmlWithBreaks((values.body || '在这里写卡片内容…').trim()) || '在这里写卡片内容…'
    const className = ['card', cls].filter(Boolean).join(' ')
    return {
      html: `<blockquote class="${className}"><p class="card__title"><strong>${title}</strong></p><p>${body}</p></blockquote><p></p>`,
    }
  },
} satisfies BuiltInComponentDef

export default component
