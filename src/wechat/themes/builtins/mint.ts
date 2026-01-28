import type { BuiltInWeChatThemeDef } from '../themeRegistryTypes'

const theme = {
  id: 'mint',
  label: '薄荷',
  vars: {
    '--wechat-accent': '#16a34a',
    '--wechat-accent-soft': 'rgba(22, 163, 74, 0.10)',
    '--wechat-accent-softer': 'rgba(22, 163, 74, 0.06)',
    '--wechat-heading': '#0f172a',
    '--wechat-quote-border': 'rgba(22, 163, 74, 0.28)',
    '--wechat-quote-bg': 'rgba(22, 163, 74, 0.06)',
  },
} satisfies BuiltInWeChatThemeDef

export default theme
