import type { BuiltInWeChatThemeDef } from '../themeRegistryTypes'

const theme = {
  id: 'royal',
  label: '紫金边框',
  vars: {
    '--wechat-accent': '#7c3aed',
    '--wechat-accent-soft': 'rgba(124, 58, 237, 0.12)',
    '--wechat-accent-softer': 'rgba(124, 58, 237, 0.07)',
    '--wechat-heading': '#3b1a6f',
    '--wechat-quote-border': 'rgba(124, 58, 237, 0.30)',
    '--wechat-quote-bg': 'rgba(124, 58, 237, 0.06)',
    '--wechat-pre-bg': 'rgba(124, 58, 237, 0.06)',
  },
  extraCss: `
/* subtle paper-like frame */
.wechat-article {
  border: 2px solid rgba(124, 58, 237, 0.55);
  border-radius: 16px;
  padding: 14px 14px 6px;
  background: linear-gradient(180deg, rgba(124, 58, 237, 0.08), rgba(255, 255, 255, 0.0) 26%),
    #fff;
}

.wechat-article h1 {
  border: 1px solid rgba(124, 58, 237, 0.22);
  background: linear-gradient(90deg, rgba(124, 58, 237, 0.12), rgba(255, 255, 255, 0.0));
}

.wechat-article h2.titlebar {
  border-left-color: rgba(124, 58, 237, 0.95);
}

.wechat-article h3.badge {
  border-color: rgba(124, 58, 237, 0.20);
}

.wechat-article blockquote.card,
.wechat-article blockquote.guide {
  border-color: rgba(124, 58, 237, 0.22);
}

.wechat-article p.divider {
  color: rgba(124, 58, 237, 0.55);
}
`.trim(),
} satisfies BuiltInWeChatThemeDef

export default theme
