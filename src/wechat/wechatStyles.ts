import { getBuiltInThemeCss } from './themes/builtInThemes'
import type {
  BuiltInWeChatThemeId,
  WeChatCustomTheme,
  WeChatThemeId,
} from './themes/themeTypes'

export type { BuiltInWeChatThemeId, WeChatCssVarName, WeChatCustomTheme, WeChatThemeId } from './themes/themeTypes'

function normalizeVarName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.startsWith('--')) return trimmed
  if (trimmed.startsWith('wechat-')) return `--${trimmed}`
  return `--wechat-${trimmed}`
}

export function buildCustomThemeCss(theme: WeChatCustomTheme): string {
  const vars = Object.entries(theme.vars)
    .map(([k, v]) => [normalizeVarName(k), String(v).trim()] as const)
    .filter(([k, v]) => k.startsWith('--wechat-') && v.length > 0)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')

  const extraCss = (theme.extraCss ?? '').trim()

  return `
.wechat-article {
${vars}
}
${extraCss ? `\n${extraCss}` : ''}
`.trim()
}

export function getWeChatBaseCss(): string {
  // Keep CSS WeChat-friendly: no external fonts, avoid complex selectors.
  return `
:root {
  --wechat-font-size: 15px;
  --wechat-line-height: 1.8;
  --wechat-text: #111;
  --wechat-muted: #666;
  --wechat-border: rgba(0, 0, 0, 0.12);
  --wechat-bg: #fff;
  --wechat-accent: #0b57d0;
  --wechat-accent-soft: rgba(11, 87, 208, 0.10);
  --wechat-accent-softer: rgba(11, 87, 208, 0.06);
  --wechat-heading: var(--wechat-text);
  --wechat-quote-border: rgba(0, 0, 0, 0.18);
  --wechat-quote-bg: rgba(0, 0, 0, 0.03);
  --wechat-pre-bg: rgba(0, 0, 0, 0.06);
}

.wechat-article {
  /* Token aliases (v1): gradually migrate components to --wce-* */
  --wce-text: var(--wechat-text);
  --wce-muted: var(--wechat-muted);
  --wce-border: var(--wechat-border);
  --wce-bg: var(--wechat-bg);
  --wce-accent: var(--wechat-accent);
  --wce-accent-soft: var(--wechat-accent-soft);
  --wce-accent-softer: var(--wechat-accent-softer);
  --wce-heading: var(--wechat-heading);
  --wce-radius-sm: 8px;
  --wce-radius-md: 12px;
  --wce-radius-lg: 14px;
  --wce-shadow-1: 0 8px 18px rgba(0, 0, 0, 0.05);
  --wce-shadow-2: 0 10px 24px rgba(0, 0, 0, 0.08);

  color: var(--wechat-text);
  background: var(--wechat-bg);
  font-size: var(--wechat-font-size);
  line-height: var(--wechat-line-height);
  word-break: break-word;
}

.wechat-article p {
  margin: 12px 0;
}

.wechat-article h1,
.wechat-article h2,
.wechat-article h3 {
  margin: 18px 0 10px;
  line-height: 1.35;
  font-weight: 700;
  color: var(--wechat-heading);
}

.wechat-article h1 {
  font-size: 22px;
  text-align: center;
  letter-spacing: 0.5px;
  padding: 10px 10px 12px;
  border-radius: 14px;
  background: linear-gradient(90deg, var(--wechat-accent-softer), transparent);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.wechat-article h2 { font-size: 18px; }

.wechat-article h3 {
  font-size: 16px;
  padding-left: 10px;
  border-left: 3px solid var(--wechat-accent);
}

.wechat-article a {
  color: var(--wechat-accent);
  text-decoration: none;
}

.wechat-article a:hover {
  text-decoration: underline;
}

.wechat-article blockquote {
  margin: 14px 0;
  padding: 10px 12px;
  border-left: 4px solid var(--wechat-quote-border);
  background: var(--wechat-quote-bg);
}

.wechat-article ul,
.wechat-article ol {
  margin: 12px 0 12px 24px;
  padding: 0;
}

.wechat-article li { margin: 6px 0; }

.wechat-article hr {
  border: none;
  height: 0;
  border-top: 1px dashed rgba(0, 0, 0, 0.22);
  margin: 16px 0;
}


/* Rich helpers (used by templates) */
.wechat-article p.lead {
  font-size: 16px;
  color: var(--wechat-muted);
  margin: 10px 0 14px;
}

.wechat-article p.caption {
  margin: 6px 0 14px;
  color: var(--wechat-muted);
  font-size: 13px;
  text-align: center;
}

.wechat-article p.divider {
  margin: 16px 0;
  text-align: center;
  color: rgba(0, 0, 0, 0.38);
  letter-spacing: 3px;
  font-size: 14px;
}

.wechat-article p.divider--flower {
  letter-spacing: 6px;
  color: rgba(0, 0, 0, 0.42);
}

.wechat-article p.divider--wave {
  letter-spacing: 2px;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.40);
}

.wechat-article p.divider--lantern {
  letter-spacing: 8px;
  font-size: 16px;
}

.wechat-article p.divider--lantern.divider--c-red { color: #d11a2a; }
.wechat-article p.divider--lantern.divider--c-gold { color: #b7791f; }
.wechat-article p.divider--lantern.divider--c-purple { color: #6d28d9; }
.wechat-article p.divider--lantern.divider--c-green { color: #0f766e; }
.wechat-article p.divider--lantern.divider--c-blue { color: #1d4ed8; }
.wechat-article p.divider--lantern.divider--c-gray { color: rgba(0,0,0,0.45); }

.wechat-article h2.section {
  position: relative;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--wechat-accent-soft);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.wechat-article h2.section::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.22em;
  width: 4px;
  height: 1.1em;
  border-radius: 2px;
  background: var(--wechat-accent);
}

.wechat-article blockquote.quote {
  border-left: 4px solid var(--wechat-accent);
  background: rgba(0, 0, 0, 0.02);
}
.wechat-article img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 10px auto;
  border-radius: 8px;
}

.wechat-article code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.92em;
  background: rgba(0,0,0,0.06);
  padding: 0.1em 0.35em;
  border-radius: 6px;
}

.wechat-article pre {
  overflow: auto;
  background: rgba(0,0,0,0.06);
  padding: 12px;
  border-radius: 10px;
}

.wechat-article pre code {
  background: transparent;
  padding: 0;
}

.wechat-article blockquote.callout {
  margin: 14px 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--wechat-border);
}

.wechat-article blockquote.callout.tone {
  background: var(--wechat-accent-soft);
  border-color: var(--wechat-accent);
}

.wechat-article blockquote.callout--info {
  background: rgba(11, 87, 208, 0.06);
  border-color: rgba(11, 87, 208, 0.22);
}

.wechat-article blockquote.callout--warn {
  background: rgba(245, 158, 11, 0.10);
  border-color: rgba(245, 158, 11, 0.28);
}

.wechat-article blockquote.callout--ok {
  background: rgba(34, 197, 94, 0.10);
  border-color: rgba(34, 197, 94, 0.28);
}

/* Per-component tone overrides (scoped by class; no inline style needed) */
.wechat-article .tone.tone--red {
  --wechat-accent: #d11a2a;
  --wechat-accent-soft: rgba(209, 26, 42, 0.12);
  --wechat-accent-softer: rgba(209, 26, 42, 0.08);
}
.wechat-article .tone.tone--gold {
  --wechat-accent: #b7791f;
  --wechat-accent-soft: rgba(183, 121, 31, 0.14);
  --wechat-accent-softer: rgba(183, 121, 31, 0.09);
}
.wechat-article .tone.tone--purple {
  --wechat-accent: #6d28d9;
  --wechat-accent-soft: rgba(109, 40, 217, 0.12);
  --wechat-accent-softer: rgba(109, 40, 217, 0.08);
}
.wechat-article .tone.tone--green {
  --wechat-accent: #0f766e;
  --wechat-accent-soft: rgba(15, 118, 110, 0.14);
  --wechat-accent-softer: rgba(15, 118, 110, 0.09);
}
.wechat-article .tone.tone--blue {
  --wechat-accent: #1d4ed8;
  --wechat-accent-soft: rgba(29, 78, 216, 0.12);
  --wechat-accent-softer: rgba(29, 78, 216, 0.08);
}
.wechat-article .tone.tone--gray {
  --wechat-accent: rgba(0, 0, 0, 0.55);
  --wechat-accent-soft: rgba(0, 0, 0, 0.08);
  --wechat-accent-softer: rgba(0, 0, 0, 0.06);
}

.wechat-article p.divider.tone { color: var(--wechat-accent); }
.wechat-article p.caption.tone { color: var(--wechat-accent); }
.wechat-article hr.tone { border-top-color: var(--wechat-accent); }

.wechat-article ul.tone li::marker,
.wechat-article ol.tone li::marker {
  color: var(--wechat-accent);
}

/* Component library helpers */
.wechat-article h2.titlebar {
  padding: 10px 12px;
  border-radius: 14px;
  background: linear-gradient(90deg, var(--wechat-accent-soft), transparent);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-left: 4px solid var(--wechat-accent);
}

.wechat-article h3.badge {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--wechat-accent-softer);
  border: 1px solid rgba(0, 0, 0, 0.10);
}

.wechat-article blockquote.card,
.wechat-article blockquote.guide {
  margin: 14px 0;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--wechat-border);
  background: var(--wechat-accent-softer);
}

.wechat-article blockquote.guide {
  background: var(--wechat-accent-soft);
  border-left: 4px solid var(--wechat-accent);
}

.wechat-article p.card__title,
.wechat-article p.guide__kicker {
  margin: 0 0 6px;
  color: var(--wechat-heading);
}

.wechat-article blockquote.frame {
  margin: 14px 0;
  padding: 14px 12px;
  border-radius: 16px;
  border: 2px solid rgba(0, 0, 0, 0.10);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(255, 255, 255, 0.0) 40%),
    #fff;
}

.wechat-article blockquote.frame--royal {
  border-color: rgba(124, 58, 237, 0.55);
  box-shadow: 0 10px 26px rgba(124, 58, 237, 0.12);
  background: linear-gradient(180deg, rgba(124, 58, 237, 0.10), rgba(255, 255, 255, 0.0) 45%),
    #fff;
}

.wechat-article blockquote.frame--tone {
  border-color: var(--wechat-accent);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
  background: linear-gradient(180deg, var(--wechat-accent-soft), rgba(255, 255, 255, 0.0) 45%),
    #fff;
}

.wechat-article p.frame__kicker {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--wechat-heading);
}

.wechat-article .frame__scroll {
  max-height: 320px;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  /* Keep scroll, hide scrollbar */
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 -20px 20px rgba(0, 0, 0, 0.06);
}

.wechat-article .frame__scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.wechat-article .frame--royal .frame__scroll {
  border-color: rgba(124, 58, 237, 0.22);
  background: rgba(124, 58, 237, 0.04);
}

.wechat-article .frame--tone .frame__scroll {
  border-color: rgba(0, 0, 0, 0.12);
  background: var(--wechat-accent-softer);
}


.wechat-article .frame__scroll::-webkit-scrollbar-thumb,
.wechat-article .frame__scroll::-webkit-scrollbar-track {
  background: transparent;
}
`.trim()
}

export function getWeChatThemeCss(theme: WeChatThemeId, customTheme?: WeChatCustomTheme): string {
  if (theme.startsWith('custom:')) {
    return customTheme ? buildCustomThemeCss(customTheme) : ''
  }

  return getBuiltInThemeCss(theme as BuiltInWeChatThemeId)
}

export function buildWeChatHtmlDocument(params: {
  bodyHtml: string
  theme: WeChatThemeId
  customTheme?: WeChatCustomTheme
  title?: string
}): string {
  const title = params.title ?? 'WeChat Article'
  const css = [getWeChatBaseCss(), getWeChatThemeCss(params.theme, params.customTheme)].join('\n\n')

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
<article class="wechat-article" data-theme="${params.theme}">
${params.bodyHtml}
</article>
</body>
</html>`
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
