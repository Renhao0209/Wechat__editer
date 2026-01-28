import Blockquote from '@tiptap/extension-blockquote'

// Tiptap StarterKit's blockquote does not preserve class attribute.
// This extension keeps class so we can implement templates like blockquote.callout.
export const BlockquoteWithClass = Blockquote.extend({
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
      wceComponent: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-wce-component'),
        renderHTML: (attributes) => {
          const v = attributes.wceComponent as string | null
          return v ? { 'data-wce-component': v } : {}
        },
      },
      wceProps: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-wce-props'),
        renderHTML: (attributes) => {
          const v = attributes.wceProps as string | null
          return v ? { 'data-wce-props': v } : {}
        },
      },
    }
  },
})
