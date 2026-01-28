import BulletList from '@tiptap/extension-bullet-list'

export const BulletListWithClass = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          const className = attributes.class as string | null
          return className ? { class: className } : {}
        },
      },
    }
  },
})
