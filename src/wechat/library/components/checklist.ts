import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  id: 'checklist',
  name: '要点清单',
  category: '清单',
  html: `<ul><li>要点一</li><li>要点二</li><li>要点三</li></ul><p></p>`,
} satisfies BuiltInComponentDef

export default component
