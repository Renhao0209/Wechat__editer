import type { BuiltInWeChatThemeDef } from '../themeRegistryTypes'

const theme = {
  id: 'ink',
  label: '墨黑',
  vars: {
    '--wechat-accent': '#111827',
    '--wechat-accent-soft': 'rgba(17, 24, 39, 0.08)',
    '--wechat-accent-softer': 'rgba(17, 24, 39, 0.05)',
    '--wechat-heading': '#111827',
    '--wechat-quote-border': 'rgba(17, 24, 39, 0.24)',
    '--wechat-quote-bg': 'rgba(17, 24, 39, 0.04)',
    '--wechat-pre-bg': 'rgba(17, 24, 39, 0.06)',
  },
} satisfies BuiltInWeChatThemeDef

export default theme
