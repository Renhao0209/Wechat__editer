import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, escapeHtml, toneClass, toneField } from '../componentConfigHelpers'

function linesToListItems(text: string, fallback: string[]): string[] {
  const lines = text
    .split(/\r\n|\r|\n/g)
    .map((x) => x.trim())
    .filter(Boolean)
  return lines.length > 0 ? lines : fallback
}

const component = {
  id: 'checklist',
  name: '要点清单',
  category: '清单',

  config: buildConfig('插入：要点清单', undefined, [
    {
      key: 'items',
      label: '清单项（每行一个）',
      type: 'textarea',
      default: '要点一\n要点二\n要点三',
    },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const items = linesToListItems(values.items || '', ['要点一', '要点二', '要点三']).map((s) =>
      `<li>${escapeHtml(s)}</li>`,
    )
    const className = cls
    return { html: `<ul class="${className}">${items.join('')}</ul><p></p>` }
  },
} satisfies BuiltInComponentDef

export default component
