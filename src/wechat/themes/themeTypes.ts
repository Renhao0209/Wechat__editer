export type BuiltInWeChatThemeId =
  | 'clean'
  | 'warm'
  | 'tech'
  | 'mint'
  | 'sunset'
  | 'grape'
  | 'ink'
  | 'royal'
  | 'guofeng'

export type WeChatCssVarName = `--wechat-${string}`

export type WeChatThemeId = BuiltInWeChatThemeId | `custom:${string}`

export type WeChatCustomTheme = {
  id: string
  name: string
  vars: Record<string, string>
  extraCss?: string
}
