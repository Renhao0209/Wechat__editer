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

const schema = buildConfig('插入：提示框', '可选语义类型（信息/注意/结论）或自定义色系。', [
  {
    key: 'variant',
    label: '类型',
    type: 'select',
    role: 'style',
    default: 'info',
    options: [
      { label: '信息（蓝）', value: 'info' },
      { label: '注意（橙）', value: 'warn' },
      { label: '结论（绿）', value: 'ok' },
      { label: '自定义色系（tone）', value: 'tone' },
    ],
  },
  { key: 'title', label: '标题', type: 'text', role: 'content', default: '信息' },
  { key: 'body', label: '正文', type: 'textarea', role: 'content', default: '这里填内容…' },
  toneField('red'),
])

const component = {
  id: 'calloutInfo',
  name: '提示框（信息）',
  category: '引用',

  schemaVersion: 1,
  tags: ['callout', '提示框', '引用'],

  defaultProps: {
    variant: 'info',
    title: '信息',
    body: '这里填内容…',
    tone: 'red',
  },

  propSchema: schema,
  config: schema,

  render: (values: Record<string, string>) => {
    const variant = values.variant || 'info'
    const title = escapeHtml((values.title || '信息').trim()) || '信息'
    const body = escapeHtmlWithBreaks((values.body || '这里填内容…').trim()) || '这里填内容…'
    const clsTone = toneClass(values)

    const className =
      variant === 'tone'
        ? ['callout', clsTone].filter(Boolean).join(' ')
        : ['callout', `callout--${variant}`].join(' ')

    const propsRaw = escapeHtmlAttr(encodeComponentProps(values))

    return {
      html: `<blockquote class="${className}" data-wce-component="calloutInfo" data-wce-props="${propsRaw}"><p><strong>${title}</strong></p><p>${body}</p></blockquote><p></p>`,
    }
  },
} satisfies BuiltInComponentDef

export default component
