import type { BuiltInWeChatThemeDef } from '../themeRegistryTypes'

const theme = {
  id: 'grape',
  label: '葡萄',
  vars: {
    '--wechat-accent': '#7c3aed',
    '--wechat-accent-soft': 'rgba(124, 58, 237, 0.10)',
    '--wechat-accent-softer': 'rgba(124, 58, 237, 0.06)',
    '--wechat-heading': '#2e1065',
    '--wechat-quote-border': 'rgba(124, 58, 237, 0.30)',
    '--wechat-quote-bg': 'rgba(124, 58, 237, 0.06)',
  },
} satisfies BuiltInWeChatThemeDef

export default theme
