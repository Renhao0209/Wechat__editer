import type { BuiltInWeChatThemeDef } from '../themeRegistryTypes'

const theme = {
  id: 'sunset',
  label: '日落',
  vars: {
    '--wechat-accent': '#ea580c',
    '--wechat-accent-soft': 'rgba(234, 88, 12, 0.10)',
    '--wechat-accent-softer': 'rgba(234, 88, 12, 0.06)',
    '--wechat-heading': '#7c2d12',
    '--wechat-quote-border': 'rgba(234, 88, 12, 0.32)',
    '--wechat-quote-bg': 'rgba(234, 88, 12, 0.06)',
  },
} satisfies BuiltInWeChatThemeDef

export default theme
