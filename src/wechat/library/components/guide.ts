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
  id: 'guide',
  name: '引导块（步骤提示）',
  desc: '适合教程/流程',
  category: '卡片',

  config: buildConfig('插入：引导块', undefined, [
    { key: 'title', label: '标题', type: 'text', default: '操作指引' },
    {
      key: 'steps',
      label: '步骤（每行一个）',
      type: 'textarea',
      default: '第一步：…\n第二步：…\n第三步：…',
    },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const title = escapeHtml((values.title || '操作指引').trim()) || '操作指引'
    const steps = linesToListItems(values.steps || '', ['第一步：…', '第二步：…', '第三步：…']).map((s) =>
      `<li>${escapeHtml(s)}</li>`,
    )
    const className = ['guide', cls].filter(Boolean).join(' ')
    const propsRaw = escapeHtmlAttr(encodeComponentProps(values))
    return {
      html: `<blockquote class="${className}" data-wce-component="guide" data-wce-props="${propsRaw}"><p class="guide__kicker"><strong>${title}</strong></p><ol>${steps.join('')}</ol></blockquote><p></p>`,
    }
  },
} satisfies BuiltInComponentDef

export default component
