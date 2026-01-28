import Image from '@tiptap/extension-image'

export const ImageWithClass = Image.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {}
    return {
      ...parent,
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attrs) => {
          const cls = typeof attrs.class === 'string' ? attrs.class.trim() : ''
          return cls ? { class: cls } : {}
        },
      },
    }
  },
})
