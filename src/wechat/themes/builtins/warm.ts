import type { BuiltInWeChatThemeDef } from '../themeRegistryTypes'

const theme = {
  id: 'warm',
  label: '暖色',
  vars: {
    '--wechat-accent': '#b42318',
    '--wechat-accent-soft': 'rgba(180, 35, 24, 0.10)',
    '--wechat-accent-softer': 'rgba(180, 35, 24, 0.06)',
    '--wechat-heading': '#7a271a',
    '--wechat-quote-border': 'rgba(180, 35, 24, 0.35)',
    '--wechat-quote-bg': 'rgba(180, 35, 24, 0.06)',
  },
} satisfies BuiltInWeChatThemeDef

export default theme
