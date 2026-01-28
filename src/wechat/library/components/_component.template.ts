import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  // 复制本文件后：把文件名改成 <componentId>.ts，然后在 components/index.ts 里引入并加入 BUILT_IN_COMPONENTS_LIST。
  id: 'exampleComponent',
  name: '组件模板（复制后修改）',
  desc: '一句话描述组件用途',
  category: '卡片',

  // 纯 HTML 组件：优先用编辑器稳定结构（p/h2/h3/blockquote/ul/ol/hr/img/a）。
  html: `<blockquote class="card"><p class="card__title"><strong>标题</strong></p><p>内容…</p></blockquote><p></p>`,

  // 如果需要自定义节点（例如 scrollBox），请删除 html，改用结构化 content。
  // content: { ... }
} satisfies BuiltInComponentDef

export default component
