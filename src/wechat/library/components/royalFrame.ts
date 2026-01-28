import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, escapeHtml, escapeHtmlWithBreaks, toneClass, toneField } from '../componentConfigHelpers'

const component = {
  id: 'royalFrame',
  name: '紫金边框容器（海报风）',
  desc: '用于活动/公告/促销开头（更像你截图那种边框）',
  category: '卡片',

  config: buildConfig('插入：边框容器', undefined, [
    {
      key: 'style',
      label: '边框风格',
      type: 'select',
      default: 'royal',
      options: [
        { label: '紫金（固定紫色）', value: 'royal' },
        { label: '跟随色系（tone）', value: 'tone' },
      ],
    },
    { key: 'title', label: '标题', type: 'text', default: '活动标题' },
    { key: 'body', label: '内容', type: 'textarea', default: '在这里写内容…' },
    toneField('purple'),
  ]),

  render: (values: Record<string, string>) => {
    const style = values.style || 'royal'
    const clsTone = toneClass(values)
    const title = escapeHtml((values.title || '活动标题').trim()) || '活动标题'
    const body = escapeHtmlWithBreaks((values.body || '在这里写内容…').trim()) || '在这里写内容…'

    const frameVariant = style === 'tone' ? ['frame--tone', clsTone].filter(Boolean).join(' ') : 'frame--royal'
    const className = ['frame', frameVariant].filter(Boolean).join(' ')

    return {
      html: `<blockquote class="${className}"><p class="frame__kicker"><strong>${title}</strong></p><p>${body}</p><p class="caption">（内容较长时建议用“内嵌滚动区”组件）</p></blockquote><p></p>`,
    }
  },
} satisfies BuiltInComponentDef

export default component
