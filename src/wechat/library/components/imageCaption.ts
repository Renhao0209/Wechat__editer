import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'imageCaption',
  name: '图片 + 图注',
  category: '图片',
  html: `<p><img src="https://placehold.co/900x520/png" alt="示例图片" /></p><p class="caption">图注：一句话说明图片信息</p><p></p>`,
} satisfies BuiltInComponentDef

export default component
