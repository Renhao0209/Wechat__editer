import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'titlebarH2',
  name: '标题条（H2）',
  desc: '适合章节开头',
  category: '标题',
  html: `<h2 class="titlebar">章节标题</h2><p></p>`,
} satisfies BuiltInComponentDef

export default component
