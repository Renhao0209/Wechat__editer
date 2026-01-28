import type { BuiltInWeChatThemeId, WeChatCssVarName } from './themeTypes'

export type BuiltInWeChatThemeDef = {
  id: BuiltInWeChatThemeId
  label: string
  vars?: Record<WeChatCssVarName, string>
  extraCss?: string
}
