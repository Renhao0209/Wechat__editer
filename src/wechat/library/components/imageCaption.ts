import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, escapeHtml, toneClass, toneField } from '../componentConfigHelpers'

const component = {
  id: 'imageCaption',
  name: '图片 + 图注',
  category: '图片',

  config: buildConfig('插入：图片 + 图注', undefined, [
    {
      key: 'url',
      label: '图片 URL',
      type: 'text',
      default: 'https://placehold.co/900x520/png',
      placeholder: 'https://…',
    },
    {
      key: 'caption',
      label: '图注',
      type: 'text',
      default: '图注：一句话说明图片信息',
    },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const url = escapeHtml((values.url || '').trim()) || 'https://placehold.co/900x520/png'
    const caption = escapeHtml((values.caption || '').trim()) || '图注：一句话说明图片信息'
    const captionClassName = ['caption', cls].filter(Boolean).join(' ')
    return {
      html: `<p><img src="${url}" alt="示例图片" /></p><p class="${captionClassName}">${caption}</p><p></p>`,
    }
  },
} satisfies BuiltInComponentDef

export default component
