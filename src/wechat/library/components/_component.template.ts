import type { BuiltInComponentDef } from '../componentRegistryTypes'
import { buildConfig, escapeHtml, toneClass, toneField } from '../componentConfigHelpers'

const component = {
  // 复制本文件后：把文件名改成 <componentId>.ts，然后在 components/index.ts 里引入并加入 BUILT_IN_COMPONENTS_LIST。
  id: 'exampleComponent',
  name: '组件模板（复制后修改）',
  desc: '一句话描述组件用途',
  category: '卡片',

  // 可配置组件（推荐）：点击插入时先弹出配置面板，然后再 render 生成 HTML/content。
  // 不需要配置时，可以删掉 config/render，直接用 html/content。
  config: buildConfig('插入：组件模板', '示例：可调标题与色系（tone）', [
    { key: 'title', label: '标题', type: 'text', default: '标题' },
    toneField('theme'),
  ]),

  render: (values: Record<string, string>) => {
    const cls = toneClass(values)
    const title = escapeHtml((values.title || '标题').trim()) || '标题'
    const className = ['card', cls].filter(Boolean).join(' ')
    return { html: `<blockquote class="${className}"><p class="card__title"><strong>${title}</strong></p><p>内容…</p></blockquote><p></p>` }
  },

  // 纯 HTML 组件：优先用编辑器稳定结构（p/h2/h3/blockquote/ul/ol/hr/img/a）。
  // html: `...`,

  // 如果需要自定义节点（例如 scrollBox），请删除 html，改用结构化 content。
  // content: { ... }
} satisfies BuiltInComponentDef

export default component
