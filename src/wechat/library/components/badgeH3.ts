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
  id: 'badgeH3',
  name: '小标题徽章（H3）',
  desc: '适合小节/要点',
  category: '标题',

  config: buildConfig('插入：小标题徽章（H3）', undefined, [
    { key: 'text', label: '文本', type: 'text', default: '要点小标题' },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const text = escapeHtml((values.text || '要点小标题').trim()) || '要点小标题'
    const className = ['badge', cls].filter(Boolean).join(' ')
    const propsRaw = escapeHtmlAttr(encodeComponentProps(values))
    return {
      html: `<h3 class="${className}" data-wce-component="badgeH3" data-wce-props="${propsRaw}">${text}</h3><p></p>`,
    }
  },
} satisfies BuiltInComponentDef

export default component
