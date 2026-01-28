import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, toneClass, toneField } from '../componentConfigHelpers'

const component = {
  id: 'royalFrameScroll',
  name: '紫金边框 + 内嵌滚动区',
  desc: '框内独立滚动（公众号后台可能因环境而不稳定）',
  category: '卡片',

  config: buildConfig('插入：边框 + 内嵌滚动区', '提示：公众号后台可能不支持框内滚动；建议导出后检查。', [
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
    { key: 'title', label: '标题', type: 'text', default: '活动公告' },
    toneField('purple'),
  ]),

  render: (values: Record<string, string>) => {
    const style = values.style || 'royal'
    const clsTone = toneClass(values)
    const titleText = (values.title || '活动公告').trim() || '活动公告'
    const blockquoteClass =
      style === 'tone'
        ? ['frame', 'frame--tone', clsTone].filter(Boolean).join(' ')
        : 'frame frame--royal'

    return {
      content: {
        type: 'blockquote',
        attrs: { class: blockquoteClass },
        content: [
          {
            type: 'paragraph',
            attrs: { class: 'frame__kicker' },
            content: [{ type: 'text', marks: [{ type: 'bold' }], text: titleText }],
          },
          {
            type: 'scrollBox',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: '这里是“框内滚动内容”。你可以把长内容放在这里，让外层文章不那么长。',
                  },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: '示例段落：Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
                  },
                ],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: '示例段落：你也可以在这里插入图片或列表。' }],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: '要点 1：……' }] }],
                  },
                  {
                    type: 'listItem',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: '要点 2：……' }] }],
                  },
                  {
                    type: 'listItem',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: '要点 3：……' }] }],
                  },
                ],
              },
              { type: 'paragraph', content: [{ type: 'text', text: '继续补几段内容来触发滚动效果……' }] },
              { type: 'paragraph', content: [{ type: 'text', text: '继续补几段内容来触发滚动效果……' }] },
              { type: 'paragraph', content: [{ type: 'text', text: '继续补几段内容来触发滚动效果……' }] },
            ],
          },
          {
            type: 'paragraph',
            attrs: { class: 'caption' },
            content: [
              {
                type: 'text',
                text: '（框内可滚动；如公众号后台不支持，请改用普通内容或“整篇套版”）',
              },
            ],
          },
          { type: 'paragraph' },
        ],
      },
    }
  },
} satisfies BuiltInComponentDef

export default component
