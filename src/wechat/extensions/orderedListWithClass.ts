import OrderedList from '@tiptap/extension-ordered-list'

export const OrderedListWithClass = OrderedList.extend({
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
