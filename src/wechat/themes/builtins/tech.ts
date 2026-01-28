import type { BuiltInWeChatThemeDef } from '../themeRegistryTypes'

const theme = {
  id: 'tech',
  label: '科技',
  vars: {
    '--wechat-accent': '#0f766e',
    '--wechat-accent-soft': 'rgba(15, 118, 110, 0.10)',
    '--wechat-accent-softer': 'rgba(15, 118, 110, 0.06)',
    '--wechat-heading': '#0f172a',
    '--wechat-pre-bg': 'rgba(2, 6, 23, 0.06)',
  },
} satisfies BuiltInWeChatThemeDef

export default theme
