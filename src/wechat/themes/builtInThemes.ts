import type { BuiltInWeChatThemeId } from './themeTypes'
import type { BuiltInWeChatThemeDef } from './themeRegistryTypes'
import { BUILT_IN_THEMES_LIST } from './builtins'

export type { BuiltInWeChatThemeDef } from './themeRegistryTypes'

export const BUILT_IN_THEMES: BuiltInWeChatThemeDef[] = BUILT_IN_THEMES_LIST

export function getBuiltInThemeCss(id: BuiltInWeChatThemeId): string {
  const found = BUILT_IN_THEMES.find((t) => t.id === id)
  if (!found || id === 'clean') return `\n/* clean theme: base only */\n`.trim()

  const vars = Object.entries(found.vars ?? {})
    .filter(([k, v]) => k.startsWith('--wechat-') && String(v).trim().length > 0)
    .map(([k, v]) => `  ${k}: ${String(v).trim()};`)
    .join('\n')

  const extraCss = (found.extraCss ?? '').trim()
  return `
.wechat-article {
${vars}
}
${extraCss ? `\n\n${extraCss}` : ''}
`.trim()
}

export function getBuiltInThemeVars(id: BuiltInWeChatThemeId): Record<string, string> {
  const found = BUILT_IN_THEMES.find((t) => t.id === id)
  return { ...(found?.vars ?? {}) }
}
