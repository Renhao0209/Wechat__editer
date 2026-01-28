import type { BuiltInComponentDef } from '../componentRegistryTypes'
import {
  buildConfig,
  encodeComponentProps,
  escapeHtml,
  escapeHtmlAttr,
  toneClass,
  toneField,
} from '../componentConfigHelpers'

function linesToListItems(text: string, fallback: string[]): string[] {
  const lines = text
    .split(/\r\n|\r|\n/g)
    .map((x) => x.trim())
    .filter(Boolean)
  return lines.length > 0 ? lines : fallback
}

const component = {
  id: 'steps',
  name: '步骤清单（1-2-3）',
  category: '清单',

  config: buildConfig('插入：步骤清单', undefined, [
    {
      key: 'items',
      label: '步骤（每行一个）',
      type: 'textarea',
      default: '第一步：写要点\n第二步：补充解释\n第三步：给出结论',
    },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const items = linesToListItems(values.items || '', ['第一步：写要点', '第二步：补充解释', '第三步：给出结论']).map((s) =>
      `<li>${escapeHtml(s)}</li>`,
    )
    const propsRaw = escapeHtmlAttr(encodeComponentProps(values))
    return { html: `<ol class="${cls}" data-wce-component="steps" data-wce-props="${propsRaw}">${items.join('')}</ol><p></p>` }
  },
} satisfies BuiltInComponentDef

export default component
