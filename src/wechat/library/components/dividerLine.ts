import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, encodeComponentProps, escapeHtmlAttr, toneClass, toneField } from '../componentConfigHelpers'

const component = {
  id: 'dividerLine',
  name: '分隔线（虚线）',
  category: '分隔',

  config: buildConfig('插入：分隔线（虚线）', undefined, [toneField('theme')]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const propsRaw = escapeHtmlAttr(encodeComponentProps(values))
    return { html: `<hr class="${cls}" data-wce-component="dividerLine" data-wce-props="${propsRaw}" /><p></p>` }
  },
} satisfies BuiltInComponentDef

export default component
