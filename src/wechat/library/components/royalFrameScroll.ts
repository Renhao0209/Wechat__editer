import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'royalFrameScroll',
  name: '紫金边框 + 内嵌滚动区',
  desc: '框内独立滚动（公众号后台可能因环境而不稳定）',
  category: '卡片',
  content: {
    type: 'blockquote',
    attrs: { class: 'frame frame--royal' },
    content: [
      {
        type: 'paragraph',
        attrs: { class: 'frame__kicker' },
        content: [{ type: 'text', marks: [{ type: 'bold' }], text: '活动公告' }],
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
} satisfies BuiltInComponentDef

export default component
