import HorizontalRule from '@tiptap/extension-horizontal-rule'

export const HorizontalRuleWithClass = HorizontalRule.extend({
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
