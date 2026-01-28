import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'steps',
  name: '步骤清单（1-2-3）',
  category: '清单',
  html: `<ol><li>第一步：写要点</li><li>第二步：补充解释</li><li>第三步：给出结论</li></ol><p></p>`,
} satisfies BuiltInComponentDef

export default component
