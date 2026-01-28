import React, { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { ImageWithClass } from './extensions/imageWithClass'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import {
  buildWeChatHtmlDocument,
  getWeChatBaseCss,
  getWeChatThemeCss,
  type WeChatCustomTheme,
  type WeChatThemeId,
} from './wechatStyles'
import { BUILT_IN_THEMES } from './themes/builtInThemes'
import { COMPONENTS } from './library/components'
import type { ComponentCategory, ComponentConfigSchema, ComponentItem } from './library/types'
import { LAYOUT_PRESETS } from './library/layoutPresets'
import { TEMPLATES } from './library/templates'
import {
  buildComputedInlinedWeChatArticleHtml,
  buildInlinedWeChatArticleHtml,
  buildUltraInlinedWeChatArticleHtml,
} from './inlineWeChat'
import { decodeComponentProps, encodeComponentProps, escapeHtml, escapeHtmlAttr, toneClass } from './library/componentConfigHelpers'
import { BlockquoteWithClass } from './extensions/blockquoteWithClass'
import { ParagraphWithClass } from './extensions/paragraphWithClass'
import { HeadingWithClass } from './extensions/headingWithClass'
import { ScrollBox } from './extensions/scrollBox'
import { BulletListWithClass } from './extensions/bulletListWithClass'
import { OrderedListWithClass } from './extensions/orderedListWithClass'
import { HorizontalRuleWithClass } from './extensions/horizontalRuleWithClass'
import './wechatEditor.css'
import MarkdownIt from 'markdown-it'
import TurndownService from 'turndown'

const STORAGE_KEY = 'wechatedit:html'
const STORAGE_THEME_KEY = 'wechatedit:theme'
const STORAGE_CUSTOM_THEMES_KEY = 'wechatedit:customThemes'
const STORAGE_VIEW_KEY = 'wechatedit:view'
const STORAGE_COMPONENT_CONFIGS_KEY = 'wechatedit:componentConfigs'
const STORAGE_EDITOR_FORMAT_KEY = 'wechatedit:editorFormat'
const STORAGE_RECENT_COLORS_KEY = 'wechatedit:recentTextColors'
const STORAGE_DRAFTS_KEY = 'wechatedit:drafts'
const STORAGE_ACTIVE_DRAFT_KEY = 'wechatedit:activeDraftId'
const STORAGE_FILES_PANEL_HEIGHT_KEY = 'wechatedit:filesPanelHeight'
const STORAGE_FS_ROOT_KEY = 'wechatedit:fsRoot'
const STORAGE_ACTIVE_FILE_KEY = 'wechatedit:activeFile'

type ViewMode = 'split' | 'edit' | 'preview'

type EditorFormat = 'rich' | 'markdown'

type DraftItem = {
  id: string
  name: string
  updatedAt: number
  editorFormat: EditorFormat
  html: string
  markdown?: string
}

type FsEntry = {
  name: string
  relPath: string
  isDir: boolean
  kind: 'dir' | 'md' | 'html' | 'txt' | 'other'
}

type ActiveFile = {
  root: string
  rel: string
}

type FsSearchResult = {
  rel: string
  name: string
  kind: 'md' | 'html' | 'txt'
}

type ComponentUiCategory = Exclude<ComponentCategory, '分隔'>

type SelectedComponentInstance = {
  componentId: string
  from?: number
  to?: number
  sourceStart?: number
  sourceEnd?: number
  values: Record<string, string>
}

const COMPONENTS_PRESERVE_BODY = new Set<string>(['royalFrameScroll'])

const DEFAULT_CONTENT = `
<h1>标题示例</h1>
<p class="lead">这是一段导语：用一句话概括文章价值，吸引读者继续往下看。</p>
<h2 class="section">第一部分：内容结构</h2>
<p>你可以像 135 一样排版：加粗、下划线、对齐、引用、插入图片、套用模板。</p>
<blockquote class="callout callout--info">
  <p><strong>提示</strong></p>
  <p>右侧是「手机预览」。上方可以一键复制/导出 HTML。</p>
</blockquote>
<p class="divider">···</p>
<h2 class="section">第二部分：可复用模块</h2>
<blockquote class="quote"><p>“一句话引用/金句，适合做内容节奏切换。”</p></blockquote>
<p>现在开始写吧。</p>
`.trim()

function safeReadLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWriteLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

function safeReadJson<T>(key: string, fallback: T): T {
  const raw = safeReadLocalStorage(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    safeWriteLocalStorage(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

function getDefaultViewMode(): ViewMode {
  try {
    if (window.matchMedia?.('(max-width: 980px)').matches) return 'edit'
  } catch {
    // ignore
  }
  return 'split'
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for insecure contexts / older browsers
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      return ok
    } catch {
      return false
    }
  }
}

async function copyHtmlToClipboard(params: { html: string; plainText?: string }): Promise<boolean> {
  try {
    const plain = params.plainText ?? htmlToPlainText(params.html)

    // Prefer rich clipboard so pasting keeps formatting.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ClipboardItemAny = (window as any).ClipboardItem as
      | (new (items: Record<string, Blob>) => ClipboardItem)
      | undefined

    if (ClipboardItemAny && navigator.clipboard.write) {
      const item = new ClipboardItemAny({
        'text/html': new Blob([params.html], { type: 'text/html' }),
        'text/plain': new Blob([plain], {
          type: 'text/plain',
        }),
      })
      await navigator.clipboard.write([item])
      return true
    }

    // Fallback: execCommand copy, but inject the copy payload so we don't silently end up with plain text.
    try {
      const host = document.createElement('div')
      host.contentEditable = 'true'
      host.setAttribute('contenteditable', 'true')
      host.style.position = 'fixed'
      host.style.left = '-9999px'
      host.style.top = '0'
      host.style.width = '1px'
      host.style.height = '1px'
      host.style.opacity = '0'
      host.style.pointerEvents = 'none'
      host.innerHTML = params.html

      let injected = false
      const onCopy = (e: ClipboardEvent) => {
        const dt = e.clipboardData
        if (!dt) return
        try {
          dt.setData('text/html', params.html)
          dt.setData('text/plain', plain)
          injected = true
          e.preventDefault()
        } catch {
          // ignore
        }
      }

      host.addEventListener('copy', onCopy)
      document.body.appendChild(host)

      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        const range = document.createRange()
        range.selectNodeContents(host)
        sel.addRange(range)
      }

      const okLegacy = document.execCommand('copy')

      const sel2 = window.getSelection()
      sel2?.removeAllRanges()
      host.removeEventListener('copy', onCopy)
      document.body.removeChild(host)

      if (okLegacy && injected) return true
    } catch {
      // ignore
    }

    return await copyToClipboard(params.html)
  } catch {
    return false
  }
}

function htmlToPlainText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function WeChatEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = safeReadLocalStorage(STORAGE_VIEW_KEY)
    if (saved === 'split' || saved === 'edit' || saved === 'preview') return saved
    return getDefaultViewMode()
  })

  const [customThemes, setCustomThemes] = useState<WeChatCustomTheme[]>(() => {
    const saved = safeReadLocalStorage(STORAGE_CUSTOM_THEMES_KEY)
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved) as unknown
      if (!Array.isArray(parsed)) return []
      const out: WeChatCustomTheme[] = []
      for (const t of parsed) {
        if (!t || typeof t !== 'object') continue
        const anyT = t as Record<string, unknown>
        if (typeof anyT.id !== 'string' || typeof anyT.name !== 'string') continue
        const vars = (anyT.vars ?? {}) as Record<string, string>
        const extraCss = typeof anyT.extraCss === 'string' ? anyT.extraCss : undefined
        out.push({ id: anyT.id, name: anyT.name, vars, extraCss })
      }
      return out
    } catch {
      return []
    }
  })

  const [theme, setTheme] = useState<WeChatThemeId>(() => {
    const saved = safeReadLocalStorage(STORAGE_THEME_KEY)
    if (typeof saved === 'string') {
      if (saved.startsWith('custom:')) return saved as WeChatThemeId
      if (BUILT_IN_THEMES.some((t) => t.id === saved)) return saved as WeChatThemeId
    }
    return 'clean'
  })

  const [status, setStatus] = useState<string>('')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importHtml, setImportHtml] = useState('')

  const [editorFormat, setEditorFormat] = useState<EditorFormat>(() => {
    const saved = safeReadLocalStorage(STORAGE_EDITOR_FORMAT_KEY)
    if (saved === 'markdown' || saved === 'rich') return saved
    return 'rich'
  })

  const markdownIt = useMemo(() => {
    return new MarkdownIt({ html: true, breaks: true, linkify: true })
  }, [])

  const turndown = useMemo(() => {
    const service = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
    service.keep(['img', 'span', 'div'])

    // Preserve our component blocks as raw HTML so Markdown mode can still re-select/edit them.
    service.addRule('keepWceComponents', {
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return false

        const tag = node.tagName.toLowerCase()
        const cls = node.getAttribute('class') ?? ''
        const wce = node.getAttribute('data-wce-component')

        if (wce) return true
        if (tag === 'blockquote' && (cls.includes('callout') || cls.includes('card'))) return true
        if (tag === 'h2' && cls.includes('titlebar')) return true
        return false
      },
      replacement: (_content, node) => {
        if (!(node instanceof HTMLElement)) return ''
        return `\n\n${node.outerHTML}\n\n`
      },
    })

    return service
  }, [])

  const markdownApplyTimerRef = useRef<number | null>(null)
  const isMarkdownTypingRef = useRef(false)
  const [markdownText, setMarkdownText] = useState<string>('')

  const [isThemeImportOpen, setIsThemeImportOpen] = useState(false)
  const [themeImportText, setThemeImportText] = useState('')

  const [isThemeCssImportOpen, setIsThemeCssImportOpen] = useState(false)
  const [themeCssName, setThemeCssName] = useState('')
  const [themeCssText, setThemeCssText] = useState('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const moreMenuRef = useRef<HTMLDetailsElement | null>(null)
  const fileMenuRef = useRef<HTMLDetailsElement | null>(null)
  const editMenuRef = useRef<HTMLDetailsElement | null>(null)
  const viewMenuRef = useRef<HTMLDetailsElement | null>(null)
  const helpMenuRef = useRef<HTMLDetailsElement | null>(null)
  const topbarRef = useRef<HTMLElement | null>(null)
  const editorScrollRef = useRef<HTMLDivElement | null>(null)
  const markdownScrollRef = useRef<HTMLTextAreaElement | null>(null)
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const isSyncingScrollRef = useRef(false)

  const librarySplitRef = useRef<HTMLDivElement | null>(null)
  const filesResizeActiveRef = useRef(false)

  const [isComponentConfigOpen, setIsComponentConfigOpen] = useState(false)
  const [componentConfigTargetId, setComponentConfigTargetId] = useState<string | null>(null)
  const [componentConfigValues, setComponentConfigValues] = useState<Record<string, string>>({})

  const initialHtml = useMemo(() => {
    const saved = safeReadLocalStorage(STORAGE_KEY)
    return saved && saved.trim().length > 0 ? saved : DEFAULT_CONTENT
  }, [])

  const [currentHtml, setCurrentHtml] = useState<string>(initialHtml)

  const [drafts, setDrafts] = useState<DraftItem[]>(() => {
    const raw = safeReadJson<unknown>(STORAGE_DRAFTS_KEY, [])
    if (!Array.isArray(raw)) return []
    const out: DraftItem[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const anyItem = item as Record<string, unknown>
      const id = typeof anyItem.id === 'string' ? anyItem.id : ''
      const name = typeof anyItem.name === 'string' ? anyItem.name : ''
      const updatedAt = typeof anyItem.updatedAt === 'number' ? anyItem.updatedAt : 0
      const editorFormat = anyItem.editorFormat === 'markdown' || anyItem.editorFormat === 'rich' ? (anyItem.editorFormat as EditorFormat) : 'rich'
      const html = typeof anyItem.html === 'string' ? anyItem.html : ''
      const markdown = typeof anyItem.markdown === 'string' ? anyItem.markdown : undefined
      if (!id || !name || !html) continue
      out.push({ id, name, updatedAt, editorFormat, html, markdown })
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 200)
  })

  const [activeDraftId, setActiveDraftId] = useState<string | null>(() => {
    const saved = safeReadLocalStorage(STORAGE_ACTIVE_DRAFT_KEY)
    return saved && saved.trim().length > 0 ? saved : null
  })

  const [filesPanelHeight, setFilesPanelHeight] = useState<number>(() => {
    const raw = safeReadLocalStorage(STORAGE_FILES_PANEL_HEIGHT_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) && n > 80 ? n : 220
  })

  const [filesTab, setFilesTab] = useState<'drafts' | 'files'>('drafts')

  const [fsRoot, setFsRoot] = useState<string>(() => {
    const saved = safeReadLocalStorage(STORAGE_FS_ROOT_KEY)
    return typeof saved === 'string' ? saved : ''
  })

  const [activeFile, setActiveFile] = useState<ActiveFile | null>(() => {
    const raw = safeReadLocalStorage(STORAGE_ACTIVE_FILE_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!parsed || typeof parsed !== 'object') return null
      const o = parsed as Record<string, unknown>
      const root = typeof o.root === 'string' ? o.root : ''
      const rel = typeof o.rel === 'string' ? o.rel : ''
      if (!root || !rel) return null
      return { root, rel }
    } catch {
      return null
    }
  })

  const [fsSelectedRel, setFsSelectedRel] = useState<string>('')

  const [fsExpanded, setFsExpanded] = useState<Set<string>>(() => new Set<string>(['']))
  const [fsDirCache, setFsDirCache] = useState<Record<string, FsEntry[]>>({})
  const [fsLoading, setFsLoading] = useState(false)

  const [fsQuery, setFsQuery] = useState('')
  const [fsKindFilter, setFsKindFilter] = useState<'all' | 'md' | 'html' | 'txt'>('all')
  const [fsSearchResults, setFsSearchResults] = useState<FsSearchResult[]>([])
  const [fsSearchRunning, setFsSearchRunning] = useState(false)
  const fsSearchTokenRef = useRef(0)

  const [fsContextMenu, setFsContextMenu] = useState<
    | null
    | {
        x: number
        y: number
        rel: string
        isDir: boolean
      }
  >(null)

  const [fsInlineAction, setFsInlineAction] = useState<
    | null
    | {
        type: 'rename' | 'newFile' | 'newFolder'
        targetRel: string // rename: item rel; new*: parent dir rel
        initialName?: string
      }
  >(null)

  const fsInlineInputRef = useRef<HTMLInputElement | null>(null)

  const [activeFileSavedSig, setActiveFileSavedSig] = useState<string>('')
  const [isActiveFileDirty, setIsActiveFileDirty] = useState(false)

  const [libraryTab, setLibraryTab] = useState<'components' | 'layouts' | 'props'>('components')

  const [selectedComponent, setSelectedComponent] = useState<SelectedComponentInstance | null>(null)
  const [componentPropsValues, setComponentPropsValues] = useState<Record<string, string>>({})

  useEffect(() => {
    safeWriteJson(STORAGE_DRAFTS_KEY, drafts)
  }, [drafts])

  useEffect(() => {
    if (activeDraftId) safeWriteLocalStorage(STORAGE_ACTIVE_DRAFT_KEY, activeDraftId)
    else safeWriteLocalStorage(STORAGE_ACTIVE_DRAFT_KEY, '')
  }, [activeDraftId])

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_FILES_PANEL_HEIGHT_KEY, String(Math.round(filesPanelHeight)))
  }, [filesPanelHeight])

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_FS_ROOT_KEY, fsRoot)
  }, [fsRoot])

  useEffect(() => {
    if (activeFile) safeWriteLocalStorage(STORAGE_ACTIVE_FILE_KEY, JSON.stringify(activeFile))
    else safeWriteLocalStorage(STORAGE_ACTIVE_FILE_KEY, '')
  }, [activeFile])

  const DEFAULT_TEXT_COLOR = '#111111'
  const [textColorHex, setTextColorHex] = useState<string>(DEFAULT_TEXT_COLOR)
  const [textColorInput, setTextColorInput] = useState<string>(DEFAULT_TEXT_COLOR)

  type ImageStyleId = '' | 'wce-img--rounded' | 'wce-img--shadow' | 'wce-img--border' | 'wce-img--circle'
  const IMAGE_STYLE_OPTIONS: Array<{ id: ImageStyleId; label: string }> = [
    { id: '', label: '默认' },
    { id: 'wce-img--rounded', label: '圆角' },
    { id: 'wce-img--shadow', label: '阴影' },
    { id: 'wce-img--border', label: '描边' },
    { id: 'wce-img--circle', label: '圆形' },
  ]

  const [imageStyle, setImageStyle] = useState<ImageStyleId>('')

  const PRESET_TEXT_COLORS = useMemo(
    () => ['#111111', '#7c3aed', '#0b57d0', '#0f766e', '#16a34a', '#d11a2a', '#f59e0b', '#b7791f', '#6b7280'],
    [],
  )

  const [recentTextColors, setRecentTextColors] = useState<string[]>(() => {
    const raw = safeReadLocalStorage(STORAGE_RECENT_COLORS_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.filter((x) => typeof x === 'string').slice(0, 8)
    } catch {
      return []
    }
  })

  const normalizeColorToHex = (input: string): string | null => {
    const raw = (input || '').trim().toLowerCase()
    if (!raw) return null

    const hex3 = /^#([0-9a-f]{3})$/i.exec(raw)
    if (hex3) {
      const s = hex3[1]
      return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`
    }

    const hex6 = /^#([0-9a-f]{6})$/i.exec(raw)
    if (hex6) return `#${hex6[1]}`

    const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([01](?:\.\d+)?))?\s*\)$/i.exec(raw)
    if (rgb) {
      const r = Math.max(0, Math.min(255, Number(rgb[1])))
      const g = Math.max(0, Math.min(255, Number(rgb[2])))
      const b = Math.max(0, Math.min(255, Number(rgb[3])))
      const to2 = (n: number) => n.toString(16).padStart(2, '0')
      return `#${to2(r)}${to2(g)}${to2(b)}`
    }

    return null
  }

  const pushRecentTextColor = (hex: string): void => {
    setRecentTextColors((prev) => {
      const next = [hex, ...prev.filter((c) => c !== hex)].slice(0, 8)
      safeWriteLocalStorage(STORAGE_RECENT_COLORS_KEY, JSON.stringify(next))
      return next
    })
  }

  const applyTextColor = (color: string): void => {
    if (!ensureEditor()) return
    const hex = normalizeColorToHex(color)
    if (!hex) {
      flash('颜色格式不正确：请输入 #RRGGBB 或使用取色器')
      return
    }
    editor.chain().focus().setColor(hex).run()
    pushRecentTextColor(hex)
  }

  const renderTextColorPalette = (onPick: (hex: string) => void) => {
    const merged = [...recentTextColors, ...PRESET_TEXT_COLORS]
      .filter((c, i, arr) => typeof c === 'string' && arr.indexOf(c) === i)
      .slice(0, 12)

    if (merged.length === 0) return null

    return (
      <div className="tbPalette" aria-label="常用颜色">
        {merged.map((c) => (
          <button
            key={c}
            type="button"
            className="tbSwatch"
            title={c}
            aria-label={`颜色 ${c}`}
            style={{ background: c }}
            onClick={() => {
              setTextColorHex(c)
              setTextColorInput(c)
              onPick(c)
            }}
          />
        ))}
      </div>
    )
  }

  const stripColorSpans = (fragment: string): string => {
    // Remove only spans that explicitly set text color.
    let out = fragment
    // <span style="...color: ...;..."> or single-quoted.
    out = out.replace(/<span\b([^>]*?)\bstyle=("|')([^"']*?)\2([^>]*?)>/gi, (m, _pre, _q, style) => {
      const hasColor = /(^|;|\s)color\s*:/i.test(style)
      return hasColor ? '' : m
    })
    out = out.replace(/<\/span\s*>/gi, '')
    return out
  }

  const applyMarkdownTextColor = (color: string): void => {
    const el = markdownScrollRef.current
    if (!el) return

    const hex = normalizeColorToHex(color)
    if (!hex) {
      flash('颜色格式不正确：请输入 #RRGGBB 或使用取色器')
      return
    }

    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    if (end <= start) {
      flash('Markdown 模式：请先选中文本再设置颜色')
      return
    }

    const selected = markdownText.slice(start, end)
    const safeSelected = stripColorSpans(selected)
    const wrapped = `<span style="color: ${hex}">${safeSelected}</span>`
    const nextText = `${markdownText.slice(0, start)}${wrapped}${markdownText.slice(end)}`
    handleMarkdownChange(nextText)

    pushRecentTextColor(hex)

    // Best-effort keep selection on the inner text.
    window.requestAnimationFrame(() => {
      try {
        const openLen = `<span style="color: ${hex}">`.length
        el.focus()
        el.setSelectionRange(start + openLen, start + openLen + safeSelected.length)
      } catch {
        // ignore
      }
    })
  }

  const clearMarkdownTextColor = (): void => {
    const el = markdownScrollRef.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    if (end <= start) {
      flash('Markdown 模式：请先选中文本再清除颜色')
      return
    }

    const selected = markdownText.slice(start, end)
    const cleared = stripColorSpans(selected)
    const nextText = `${markdownText.slice(0, start)}${cleared}${markdownText.slice(end)}`
    handleMarkdownChange(nextText)

    window.requestAnimationFrame(() => {
      try {
        el.focus()
        el.setSelectionRange(start, start + cleared.length)
      } catch {
        // ignore
      }
    })
  }

  const probeSelectedComponent = (next: NonNullable<typeof editor>): SelectedComponentInstance | null => {
    try {
      const state = next.state
      const $from = state.selection.$from

      const inferComponentIdFromNode = (nodeTypeName: string, attrs: Record<string, unknown>): string => {
        const cls = typeof attrs.class === 'string' ? (attrs.class as string) : ''
        if (nodeTypeName === 'blockquote') {
          if (cls.includes('card')) return 'card'
          if (cls.includes('callout')) return 'calloutInfo'
        }
        if (nodeTypeName === 'heading') {
          const level = typeof attrs.level === 'number' ? (attrs.level as number) : undefined
          if (level === 2 && cls.includes('titlebar')) return 'titlebarH2'
        }
        return ''
      }

      for (let depth = $from.depth; depth >= 0; depth--) {
        const node = $from.node(depth)
        const attrs = (node?.attrs ?? {}) as Record<string, unknown>
        const nodeTypeName = node?.type?.name ?? ''

        let componentId = typeof attrs.wceComponent === 'string' ? (attrs.wceComponent as string) : ''
        if (!componentId) componentId = inferComponentIdFromNode(nodeTypeName, attrs)
        if (!componentId) continue

        const target = COMPONENTS.find((c) => c.id === componentId)
        if (!target) continue
        const schema = getComponentSchema(target)
        const renderer = getComponentRenderer(target)
        if (!schema || !renderer) continue

        const defaults = getDefaultComponentValues(target, schema)
        const rawProps = typeof attrs.wceProps === 'string' ? (attrs.wceProps as string) : ''
        const decoded = rawProps ? decodeComponentProps(rawProps) : null
        const saved = readSavedComponentConfigValues(componentId) ?? {}
        const values = { ...defaults, ...saved, ...(decoded ?? {}) }

        if (depth <= 0) continue
        const from = $from.before(depth)
        const to = from + node.nodeSize

        return { componentId, from, to, values }
      }

      return null
    } catch {
      return null
    }
  }

  const probeMarkdownComponentAtIndex = (text: string, index: number): SelectedComponentInstance | null => {
    const clampIndex = Math.max(0, Math.min(index, text.length))

    const lastDataAttr = text.lastIndexOf('data-wce-component', clampIndex)
    const lastFallbackBlockquote = text.lastIndexOf('<blockquote', clampIndex)
    const lastFallbackH2 = text.lastIndexOf('<h2', clampIndex)
    const startFromAttr = lastDataAttr >= 0 ? text.lastIndexOf('<', lastDataAttr) : -1
    const start = Math.max(startFromAttr, lastFallbackBlockquote, lastFallbackH2)
    if (start < 0) return null

    const tagClose = text.indexOf('>', start)
    if (tagClose < 0) return null
    const openTag = text.slice(start, tagClose + 1)

    const tagMatch = /^<\s*([a-z0-9-]+)/i.exec(openTag)
    const tagName = (tagMatch?.[1] ?? '').toLowerCase()
    if (!tagName) return null

    const isSelfClosing = /\/\s*>\s*$/.test(openTag) || tagName === 'hr'

    const getAttr = (name: string): string => {
      const re = new RegExp(`${name}="([^"]*)"`, 'i')
      const m = re.exec(openTag)
      return m?.[1] ?? ''
    }

    let end = tagClose + 1
    if (!isSelfClosing) {
      const openNeedle = `<${tagName}`
      const closeNeedle = `</${tagName}>`
      let scan = tagClose + 1
      let depth = 1

      const isNameBoundary = (pos: number): boolean => {
        const c = text[pos + openNeedle.length]
        return c == null || /[\s>/]/.test(c)
      }

      while (scan < text.length) {
        const nextOpenRaw = text.indexOf(openNeedle, scan)
        const nextOpen = nextOpenRaw >= 0 && isNameBoundary(nextOpenRaw) ? nextOpenRaw : -1
        const nextClose = text.indexOf(closeNeedle, scan)

        if (nextClose < 0) return null

        if (nextOpen >= 0 && nextOpen < nextClose) {
          depth += 1
          scan = nextOpen + openNeedle.length
          continue
        }

        depth -= 1
        scan = nextClose + closeNeedle.length
        if (depth <= 0) {
          end = scan
          break
        }
      }
    }

    if (clampIndex < start || clampIndex > end) return null

    let componentId = getAttr('data-wce-component')
    const rawProps = getAttr('data-wce-props')
    const classAttr = getAttr('class')

    if (!componentId) {
      const isBlockquote = tagName === 'blockquote'
      if (isBlockquote) {
        if (classAttr.includes('card')) componentId = 'card'
        else if (classAttr.includes('callout')) componentId = 'calloutInfo'
      } else if (tagName === 'h2') {
        if (classAttr.includes('titlebar')) componentId = 'titlebarH2'
      }
    }

    if (!componentId) return null

    const target = COMPONENTS.find((c) => c.id === componentId)
    if (!target) return null
    const schema = getComponentSchema(target)
    const renderer = getComponentRenderer(target)
    if (!schema || !renderer) return null

    const defaults = getDefaultComponentValues(target, schema)
    const decoded = rawProps ? decodeComponentProps(rawProps) : null
    const saved = readSavedComponentConfigValues(componentId) ?? {}
    const values = { ...defaults, ...saved, ...(decoded ?? {}) }

    return { componentId, sourceStart: start, sourceEnd: end, values }
  }

  const COMPONENT_CATEGORY_ORDER: ComponentUiCategory[] = useMemo(
    () => ['标题', '卡片', '引用', '分割线', '清单', '图片'],
    [],
  )

  const COMPONENT_CATEGORY_LABEL: Record<ComponentUiCategory, string> = useMemo(
    () => ({
      标题: '标题',
      卡片: '内容框',
      引用: '引用',
      分割线: '分割线',
      清单: '清单',
      图片: '图片',
    }),
    [],
  )

  const toUiCategory = (cat: ComponentCategory): ComponentUiCategory =>
    cat === '分隔' ? '分割线' : cat

  const [componentCategory, setComponentCategory] = useState<ComponentUiCategory | 'all'>('all')
  const [componentQuery, setComponentQuery] = useState('')

  const componentConfigTarget: ComponentItem | undefined = useMemo(() => {
    if (!componentConfigTargetId) return undefined
    return COMPONENTS.find((x) => x.id === componentConfigTargetId)
  }, [componentConfigTargetId])

  const getComponentSchema = (c: ComponentItem): ComponentConfigSchema | null => {
    return (c.propSchema ?? c.config ?? null) as ComponentConfigSchema | null
  }

  const getComponentRenderer = (c: ComponentItem) => {
    return (c.renderer ?? c.render ?? null) as ComponentItem['render'] | null
  }

  const getDefaultComponentConfigValues = (schema: ComponentConfigSchema): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const f of schema.fields) {
      out[f.key] = f.default ?? ''
    }
    return out
  }

  const getDefaultComponentValues = (c: ComponentItem, schema: ComponentConfigSchema): Record<string, string> => {
    return { ...getDefaultComponentConfigValues(schema), ...(c.defaultProps ?? {}) }
  }

  const getStyleKeys = (schema: ComponentConfigSchema): string[] => {
    return schema.fields
      .filter((f) => f.role === 'style' || (f.role == null && (f.type === 'select' || f.type === 'color')))
      .map((f) => f.key)
  }

  const readSavedComponentConfigValues = (componentId: string): Record<string, string> | null => {
    const map = safeReadJson<Record<string, Record<string, string>>>(STORAGE_COMPONENT_CONFIGS_KEY, {})
    return map[componentId] ?? null
  }

  const writeSavedComponentConfigValues = (componentId: string, values: Record<string, string>): void => {
    const map = safeReadJson<Record<string, Record<string, string>>>(STORAGE_COMPONENT_CONFIGS_KEY, {})
    map[componentId] = values
    safeWriteJson(STORAGE_COMPONENT_CONFIGS_KEY, map)
  }

  const filteredComponents = useMemo(() => {
    const q = componentQuery.trim().toLowerCase()
    return COMPONENTS.filter((c) => {
      if (componentCategory !== 'all' && toUiCategory(c.category) !== componentCategory) return false
      if (!q) return true
      const desc = c.desc ?? c.description ?? ''
      const tags = (c.tags ?? []).join(' ')
      return (
        c.name.toLowerCase().includes(q) ||
        (desc ? desc.toLowerCase().includes(q) : false) ||
        (tags ? tags.toLowerCase().includes(q) : false) ||
        c.id.toLowerCase().includes(q)
      )
    })
  }, [componentCategory, componentQuery])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        horizontalRule: false,
      }),
      HeadingWithClass.configure({ levels: [1, 2, 3] }),
      ParagraphWithClass,
      BlockquoteWithClass,
      BulletListWithClass,
      OrderedListWithClass,
      HorizontalRuleWithClass,
      ScrollBox,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
      }),
      ImageWithClass.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { style: 'max-width: 100%; height: auto;' },
      }),
      CharacterCount,
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: 'wechatEditor__prose',
      },
      handleClick: (view, pos) => {
        const $pos = view.state.doc.resolve(pos)
        let componentDepth: number | null = null
        let componentId = ''
        for (let depth = $pos.depth; depth >= 0; depth--) {
          const node = $pos.node(depth)
          const attrs = (node?.attrs ?? {}) as Record<string, unknown>
          const nodeTypeName = node?.type?.name ?? ''
          const cls = typeof attrs.class === 'string' ? (attrs.class as string) : ''

          componentId = typeof attrs.wceComponent === 'string' ? (attrs.wceComponent as string) : ''
          if (!componentId) {
            if (nodeTypeName === 'blockquote') {
              if (cls.includes('card')) componentId = 'card'
              else if (cls.includes('callout')) componentId = 'calloutInfo'
            } else if (nodeTypeName === 'heading') {
              const level = typeof attrs.level === 'number' ? (attrs.level as number) : undefined
              if (level === 2 && cls.includes('titlebar')) componentId = 'titlebarH2'
            }
          }

          if (!componentId) continue
          const target = COMPONENTS.find((c) => c.id === componentId)
          if (!target) continue
          const schema = getComponentSchema(target)
          const renderer = getComponentRenderer(target)
          if (!schema || !renderer) continue

          componentDepth = depth
          break
        }

        if (componentDepth === null || componentDepth <= 0) return false

        const nodePos = $pos.before(componentDepth)
        const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos))
        view.dispatch(tr)
        setLibraryTab('props')
        return true
      },
    },
    onUpdate: ({ editor: next }) => {
      const html = next.getHTML()
      safeWriteLocalStorage(STORAGE_KEY, html)
      setCurrentHtml(html)
    },
    onSelectionUpdate: ({ editor: next }) => {
      const found = probeSelectedComponent(next)
      setSelectedComponent(found)

      // Sync current text color into toolbar (best-effort).
      const c = (next.getAttributes('textStyle')?.color as string | undefined) ?? ''
      const hex = normalizeColorToHex(c)
      if (hex) {
        setTextColorHex(hex)
        setTextColorInput(hex)
      }

      // Sync current image style into toolbar (best-effort).
      const imgCls = (next.getAttributes('image')?.class as string | undefined) ?? ''
      const normalized = imgCls.trim()
      const allowed = new Set(IMAGE_STYLE_OPTIONS.map((x) => x.id))
      setImageStyle((allowed.has(normalized as ImageStyleId) ? (normalized as ImageStyleId) : '') as ImageStyleId)
    },
  })

  useEffect(() => {
    if (libraryTab !== 'props') return
    if (!selectedComponent) {
      setComponentPropsValues({})
      return
    }
    setComponentPropsValues(selectedComponent.values)
  }, [libraryTab, selectedComponent])

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_EDITOR_FORMAT_KEY, editorFormat)
  }, [editorFormat])

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_VIEW_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_CUSTOM_THEMES_KEY, JSON.stringify(customThemes))
  }, [customThemes])

  useEffect(() => {
    const editorEl = editorFormat === 'markdown' ? markdownScrollRef.current : editorScrollRef.current
    const previewEl = previewScrollRef.current
    if (!editorEl || !previewEl) return

    let rafFromEditor: number | null = null
    let rafFromPreview: number | null = null

    // Some browsers fire scroll events asynchronously after setting scrollTop.
    // To avoid feedback loops / "self scrolling", ignore scroll events for a short window
    // after we programmatically update the counterpart element.
    let ignoreEditorUntil = 0
    let ignorePreviewUntil = 0

    const syncFromEditor = () => {
      if (performance.now() < ignoreEditorUntil) return
      if (isSyncingScrollRef.current) return
      if (rafFromEditor !== null) return

      rafFromEditor = window.requestAnimationFrame(() => {
        rafFromEditor = null
        const maxEditor = editorEl.scrollHeight - editorEl.clientHeight
        const maxPreview = previewEl.scrollHeight - previewEl.clientHeight
        if (maxEditor <= 0 || maxPreview <= 0) {
          isSyncingScrollRef.current = true
          previewEl.scrollTop = 0
          isSyncingScrollRef.current = false
          return
        }

        const ratio = editorEl.scrollTop / maxEditor
        isSyncingScrollRef.current = true
        ignorePreviewUntil = performance.now() + 140
        previewEl.scrollTop = ratio * maxPreview
        isSyncingScrollRef.current = false
      })
    }

    const syncFromPreview = () => {
      if (performance.now() < ignorePreviewUntil) return
      if (isSyncingScrollRef.current) return
      if (rafFromPreview !== null) return

      rafFromPreview = window.requestAnimationFrame(() => {
        rafFromPreview = null
        const maxPreview = previewEl.scrollHeight - previewEl.clientHeight
        const maxEditor = editorEl.scrollHeight - editorEl.clientHeight
        if (maxEditor <= 0 || maxPreview <= 0) {
          isSyncingScrollRef.current = true
          editorEl.scrollTop = 0
          isSyncingScrollRef.current = false
          return
        }

        const ratio = previewEl.scrollTop / maxPreview
        isSyncingScrollRef.current = true
        ignoreEditorUntil = performance.now() + 140
        editorEl.scrollTop = ratio * maxEditor
        isSyncingScrollRef.current = false
      })
    }

    editorEl.addEventListener('scroll', syncFromEditor, { passive: true })
    previewEl.addEventListener('scroll', syncFromPreview, { passive: true })

    // Initial sync (e.g., after switching view mode)
    syncFromEditor()

    return () => {
      editorEl.removeEventListener('scroll', syncFromEditor)
      previewEl.removeEventListener('scroll', syncFromPreview)
      if (rafFromEditor !== null) window.cancelAnimationFrame(rafFromEditor)
      if (rafFromPreview !== null) window.cancelAnimationFrame(rafFromPreview)
    }
  }, [editorFormat, viewMode])

  const selectedCustomTheme = useMemo(() => {
    if (!theme.startsWith('custom:')) return undefined
    const id = theme.slice('custom:'.length)
    return customThemes.find((t) => t.id === id)
  }, [customThemes, theme])

  const previewHtml = currentHtml

  const htmlToMarkdown = (html: string): string => {
    try {
      return turndown.turndown(html)
    } catch {
      return html
    }
  }

  const markdownToHtml = (md: string): string => {
    try {
      return markdownIt.render(md)
    } catch {
      return `<p>${md.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>`
    }
  }

  // Keep textarea in sync when content changes via buttons/components while in Markdown mode.
  useEffect(() => {
    if (editorFormat !== 'markdown') return
    if (isMarkdownTypingRef.current) return
    setMarkdownText(htmlToMarkdown(currentHtml))
  }, [currentHtml, editorFormat])

  const exportFullHtml = useMemo(() => {
    return buildWeChatHtmlDocument({
      bodyHtml: previewHtml,
      theme,
      customTheme: selectedCustomTheme,
      title: '公众号文章',
    })
  }, [previewHtml, selectedCustomTheme, theme])

  const exportBodyHtml = useMemo(() => {
    // For convenience: copy body only (no <style> / <html>)
    return `<article class="wechat-article" data-theme="${theme}">${previewHtml}</article>`
  }, [previewHtml, theme])

  const exportCss = useMemo(() => {
    return [getWeChatBaseCss(), getWeChatThemeCss(theme, selectedCustomTheme)].join('\n\n')
  }, [selectedCustomTheme, theme])

  const exportClipboardHtml = useMemo(() => {
    // Clipboard HTML fragment: include <style> so pasted rich text keeps theme when possible.
    return `<style>${exportCss}</style>\n${exportBodyHtml}`
  }, [exportBodyHtml, exportCss])

  const exportInlinedArticleHtml = useMemo(() => {
    return buildInlinedWeChatArticleHtml({ bodyHtml: previewHtml, theme, customTheme: selectedCustomTheme })
  }, [previewHtml, selectedCustomTheme, theme])

  const exportUltraInlinedArticleHtml = useMemo(() => {
    return buildUltraInlinedWeChatArticleHtml({ bodyHtml: previewHtml, theme, customTheme: selectedCustomTheme })
  }, [previewHtml, selectedCustomTheme, theme])

  const previewScopedCss = useMemo(() => {
    const scopedRoot = exportCss.replaceAll(':root', '.wechatPreviewScope')
    return scopedRoot.replaceAll('.wechat-article', '.wechatPreviewScope .wechat-article')
  }, [exportCss])

  const charCount = editor?.storage.characterCount.characters() ?? 0

  function flash(msg: string) {
    setStatus(msg)
    window.setTimeout(() => setStatus(''), 1600)
  }

  function ensureEditor() {
    if (!editor) {
      flash('编辑器尚未就绪')
      return false
    }
    return true
  }

  function handleSwitchToMarkdown() {
    if (!ensureEditor()) return
    isMarkdownTypingRef.current = false
    const html = editor.getHTML()
    setMarkdownText(htmlToMarkdown(html))
    setEditorFormat('markdown')
    flash('已切换：Markdown 源码')
  }

  function handleSwitchToRich() {
    if (!ensureEditor()) return
    const html = markdownToHtml(markdownText)
    // Update both editor and preview/export state.
    editor.commands.setContent(html)
    safeWriteLocalStorage(STORAGE_KEY, html)
    setCurrentHtml(html)
    setEditorFormat('rich')
    flash('已切换：富文本')
  }

  function handleMarkdownCursorProbe(cursorIndex: number) {
    const found = probeMarkdownComponentAtIndex(markdownText, cursorIndex)
    setSelectedComponent(found)
    if (found) setLibraryTab('props')
  }

  function handleMarkdownChange(next: string) {
    setMarkdownText(next)
    isMarkdownTypingRef.current = true

    if (markdownApplyTimerRef.current !== null) {
      window.clearTimeout(markdownApplyTimerRef.current)
      markdownApplyTimerRef.current = null
    }

    markdownApplyTimerRef.current = window.setTimeout(() => {
      markdownApplyTimerRef.current = null
      const html = markdownToHtml(next)
      if (editor) {
        // Avoid triggering onUpdate for every keystroke.
        editor.commands.setContent(html, { emitUpdate: false })
      }
      safeWriteLocalStorage(STORAGE_KEY, html)
      setCurrentHtml(html)

      window.setTimeout(() => {
        isMarkdownTypingRef.current = false
      }, 350)
    }, 220)
  }

  const getDraftDisplayTime = (ts: number): string => {
    if (!ts) return ''
    try {
      return new Date(ts).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const hasDesktopFs = Boolean(window.desktop?.fs)

  const fsListDir = async (rel: string): Promise<FsEntry[]> => {
    if (!window.desktop?.fs) return []
    if (!fsRoot) return []
    const res = await window.desktop.fs.listDir({ root: fsRoot, rel })
    if (!res.ok || !res.entries) {
      flash(res.error ? `读取目录失败：${res.error}` : '读取目录失败')
      return []
    }
    return res.entries.filter((e) => e.kind !== 'other')
  }

  const ensureDirLoaded = async (rel: string): Promise<void> => {
    if (fsDirCache[rel]) return
    setFsLoading(true)
    try {
      const entries = await fsListDir(rel)
      setFsDirCache((prev) => ({ ...prev, [rel]: entries }))
    } finally {
      setFsLoading(false)
    }
  }

  const toggleDir = async (rel: string): Promise<void> => {
    setFsExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(rel)) next.delete(rel)
      else next.add(rel)
      return next
    })
    await ensureDirLoaded(rel)
  }

  const fileExtKind = (rel: string): 'md' | 'html' | 'txt' | 'other' => {
    const lower = rel.toLowerCase()
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md'
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html'
    if (lower.endsWith('.txt')) return 'txt'
    return 'other'
  }

  const normalizeRelDir = (rel: string): string => {
    const r = String(rel || '').replaceAll('\\', '/')
    if (!r) return ''
    return r.endsWith('/') ? r.slice(0, -1) : r
  }

  const relDirOf = (rel: string): string => {
    const r = String(rel || '').replaceAll('\\', '/')
    const idx = r.lastIndexOf('/')
    return idx >= 0 ? r.slice(0, idx) : ''
  }

  const relBaseName = (rel: string): string => {
    const r = String(rel || '').replaceAll('\\', '/')
    const idx = r.lastIndexOf('/')
    return idx >= 0 ? r.slice(idx + 1) : r
  }

  const joinRel = (parentRel: string, name: string): string => {
    const base = normalizeRelDir(parentRel)
    const n = String(name || '').replaceAll('\\', '/').replace(/^\//, '')
    if (!base) return n
    if (!n) return base
    return `${base}/${n}`
  }

  const isRelDescendantOrSame = (parentRel: string, childRel: string): boolean => {
    const p = normalizeRelDir(parentRel)
    const c = normalizeRelDir(childRel)
    if (!p) return false
    if (p === c) return true
    return c.startsWith(p + '/')
  }

  const sigOf = (s: string): string => {
    // Lightweight stable signature; enough for dirty indicator.
    let h1 = 2166136261
    for (let i = 0; i < s.length; i++) {
      h1 ^= s.charCodeAt(i)
      h1 = Math.imul(h1, 16777619)
    }
    return `${s.length}:${(h1 >>> 0).toString(16)}`
  }

  const closeFsContextMenu = () => setFsContextMenu(null)

  useEffect(() => {
    if (!fsInlineAction) return
    const t = window.setTimeout(() => fsInlineInputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [fsInlineAction])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (filesTab !== 'files') return
      if (fsInlineAction) return

      if (e.key === 'F2') {
        const target = (fsSelectedRel || (activeFile && activeFile.root === fsRoot ? activeFile.rel : '') || '').trim()
        if (!target) return
        e.preventDefault()
        setFsInlineAction({ type: 'rename', targetRel: target, initialName: relBaseName(target) })
      }

      if (e.key === 'Escape') {
        if (fsContextMenu) {
          e.preventDefault()
          closeFsContextMenu()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeFile, filesTab, fsContextMenu, fsInlineAction, fsRoot, fsSelectedRel])

  useEffect(() => {
    if (!activeFile || !fsRoot || activeFile.root !== fsRoot) {
      setIsActiveFileDirty(false)
      return
    }
    const content = getSavePayloadForRel(activeFile.rel)
    const nextSig = sigOf(content)
    setIsActiveFileDirty(activeFileSavedSig.length > 0 && nextSig !== activeFileSavedSig)
  }, [activeFile, activeFileSavedSig, currentHtml, editorFormat, fsRoot, markdownText])

  const openDiskFile = async (rel: string): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) return
    const kind = fileExtKind(rel)
    if (kind === 'other') {
      flash('仅支持打开 .md / .html / .txt')
      return
    }

    const ok = window.confirm(`打开文件：${rel}\n\n提示：当前未保存内容可能会丢失。`)
    if (!ok) return

    const res = await window.desktop.fs.readTextFile({ root: fsRoot, rel })
    if (!res.ok || typeof res.content !== 'string') {
      flash(res.error ? `打开失败：${res.error}` : '打开失败')
      return
    }

    const content = res.content
    if (kind === 'md' || kind === 'txt') {
      isMarkdownTypingRef.current = true
      setEditorFormat('markdown')
      setMarkdownText(content)
      const html = markdownToHtml(content)
      if (editor) {
        try {
          editor.commands.setContent(html)
        } catch {
          // ignore
        }
      }
      safeWriteLocalStorage(STORAGE_KEY, html)
      setCurrentHtml(html)
      window.setTimeout(() => {
        isMarkdownTypingRef.current = false
      }, 350)
    } else {
      isMarkdownTypingRef.current = false
      setEditorFormat('rich')
      if (editor) {
        try {
          editor.commands.setContent(content)
        } catch {
          // ignore
        }
      }
      safeWriteLocalStorage(STORAGE_KEY, content)
      setCurrentHtml(content)
    }

    setActiveFile({ root: fsRoot, rel })
    setActiveFileSavedSig(sigOf(content))
    setFilesTab('files')
    flash('已打开文件')
  }

  const getSavePayloadForRel = (rel: string): string => {
    const kind = fileExtKind(rel)
    if (kind === 'md' || kind === 'txt') {
      if (editorFormat === 'markdown') return markdownText
      return htmlToMarkdown(currentHtml)
    }

    // html
    if (editorFormat === 'markdown') return markdownToHtml(markdownText)
    if (editor) return editor.getHTML()
    return currentHtml
  }

  const handleFilesPickRoot = async (): Promise<void> => {
    if (!window.desktop?.fs) {
      flash('当前环境不支持文件系统（请用桌面版）')
      return
    }
    const res = await window.desktop.fs.pickFolder()
    if (!res.ok || !res.root) return
    setFsRoot(res.root)
    setFsDirCache({})
    setFsExpanded(new Set(['']))
    setActiveFile(null)
    await ensureDirLoaded('')
    flash('已选择文件夹')
  }

  const handleFilesRefresh = async (): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) return
    setFsDirCache({})
    await ensureDirLoaded('')
    flash('已刷新')
  }

  const handleFilesNewFolder = async (): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) {
      flash('请先选择文件夹')
      return
    }
    const name = window.prompt('新建文件夹（相对根目录路径）', 'articles')?.trim()
    if (!name) return
    const rel = name.replaceAll('\\', '/').replace(/^\//, '')
    const res = await window.desktop.fs.mkdir({ root: fsRoot, rel })
    if (!res.ok) {
      flash(res.error ? `创建失败：${res.error}` : '创建失败')
      return
    }
    setFsDirCache({})
    await ensureDirLoaded('')
    flash('已创建文件夹')
  }

  const handleFilesSaveToDisk = async (): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) {
      flash('请先选择文件夹')
      return
    }
    if (!activeFile || activeFile.root !== fsRoot) {
      await handleFilesSaveAsToDisk()
      return
    }
    const content = getSavePayloadForRel(activeFile.rel)
    const res = await window.desktop.fs.writeTextFile({ root: fsRoot, rel: activeFile.rel, content })
    if (!res.ok) {
      flash(res.error ? `保存失败：${res.error}` : '保存失败')
      return
    }
    setActiveFileSavedSig(sigOf(content))
    flash('已保存到文件')
  }

  const handleFilesSaveAsToDisk = async (): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) {
      flash('请先选择文件夹')
      return
    }
    const suggestedName = activeFile?.rel?.split('/').pop() || (editorFormat === 'markdown' ? 'article.md' : 'article.html')
    const content = getSavePayloadForRel(suggestedName)
    const res = await window.desktop.fs.saveAs({ root: fsRoot, suggestedName, content })
    if (!res.ok || !res.rel) {
      if (res && (res as any).canceled) return
      flash(res.error ? `另存为失败：${res.error}` : '另存为失败')
      return
    }
    setActiveFile({ root: fsRoot, rel: res.rel })
    setActiveFileSavedSig(sigOf(content))
    setFsDirCache({})
    await ensureDirLoaded('')
    flash('已另存为')
  }

  const handleFilesNewFile = async (): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) {
      flash('请先选择文件夹')
      return
    }
    const name = window.prompt('新建文件（支持 .md / .html / .txt）', 'article.md')?.trim()
    if (!name) return
    const kind = fileExtKind(name)
    if (kind === 'other') {
      flash('仅支持 .md / .html / .txt')
      return
    }
    const rel = name.replaceAll('\\', '/').replace(/^\//, '')
    const content = kind === 'html' ? DEFAULT_CONTENT : ''
    const res = await window.desktop.fs.writeTextFile({ root: fsRoot, rel, content })
    if (!res.ok) {
      flash(res.error ? `创建失败：${res.error}` : '创建失败')
      return
    }
    setFsDirCache({})
    await ensureDirLoaded('')
    await openDiskFile(rel)
  }

  const handleFilesRenamePathInline = async (fromRel: string, nextBase: string): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) return
    if (!fromRel) {
      flash('不能重命名根目录')
      return
    }
    const base = relBaseName(fromRel)
    const dir = relDirOf(fromRel)
    const trimmed = (nextBase || '').trim()
    if (!trimmed || trimmed === base) return
    const toRel = joinRel(dir, trimmed).replace(/\s+/g, ' ').replace(/^\//, '')
    const res = await window.desktop.fs.rename({ root: fsRoot, fromRel, toRel })
    if (!res.ok) {
      flash(res.error ? `重命名失败：${res.error}` : '重命名失败')
      return
    }
    if (activeFile && activeFile.root === fsRoot && activeFile.rel === fromRel) {
      setActiveFile({ root: fsRoot, rel: toRel })
    }
    if (fsSelectedRel === fromRel) setFsSelectedRel(toRel)
    setFsDirCache({})
    await ensureDirLoaded('')
    flash('已重命名')
  }

  const handleFilesDeletePath = async (rel: string): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) return
    if (!rel) {
      flash('不能删除根目录')
      return
    }
    const ok = window.confirm(`删除：${rel}？\n\n此操作不可撤销。`)
    if (!ok) return
    const res = await window.desktop.fs.deletePath({ root: fsRoot, rel })
    if (!res.ok) {
      flash(res.error ? `删除失败：${res.error}` : '删除失败')
      return
    }
    if (activeFile && activeFile.root === fsRoot && activeFile.rel === rel) {
      setActiveFile(null)
      setActiveFileSavedSig('')
      setIsActiveFileDirty(false)
    }
    if (fsSelectedRel === rel) setFsSelectedRel('')
    setFsDirCache({})
    await ensureDirLoaded('')
    flash('已删除')
  }

  const handleFilesNewInDirInline = async (parentRel: string, kind: 'file' | 'folder', name: string): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) return
    const trimmed = (name || '').trim()
    if (!trimmed) return
    const rel = joinRel(parentRel, trimmed).replace(/^\//, '')

    if (kind === 'folder') {
      const r = await window.desktop.fs.mkdir({ root: fsRoot, rel })
      if (!r.ok) {
        flash(r.error ? `创建失败：${r.error}` : '创建失败')
        return
      }
      setFsDirCache({})
      await ensureDirLoaded('')
      setFsSelectedRel(rel)
      flash('已创建文件夹')
      return
    }

    const fileKind = fileExtKind(rel)
    if (fileKind === 'other') {
      flash('仅支持 .md / .html / .txt')
      return
    }
    const content = fileKind === 'html' ? DEFAULT_CONTENT : ''
    const r = await window.desktop.fs.writeTextFile({ root: fsRoot, rel, content })
    if (!r.ok) {
      flash(r.error ? `创建失败：${r.error}` : '创建失败')
      return
    }
    setFsDirCache({})
    await ensureDirLoaded('')
    setFsSelectedRel(rel)
    await openDiskFile(rel)
  }

  const handleFilesMovePath = async (fromRel: string, toDirRel: string): Promise<void> => {
    if (!window.desktop?.fs || !fsRoot) return
    const from = String(fromRel || '').replaceAll('\\', '/')
    if (!from) return
    const toDir = normalizeRelDir(toDirRel)
    const base = relBaseName(from)
    if (!from || !base) return
    const toRel = joinRel(toDir, base).replace(/^\//, '')
    if (normalizeRelDir(from) === normalizeRelDir(toRel)) return
    if (isRelDescendantOrSame(from, toRel)) {
      flash('不能移动到自身或子目录')
      return
    }

    const res = await window.desktop.fs.movePath({ root: fsRoot, fromRel: from, toRel })
    if (!res.ok) {
      flash(res.error ? `移动失败：${res.error}` : '移动失败')
      return
    }
    if (activeFile && activeFile.root === fsRoot && activeFile.rel === from) {
      setActiveFile({ root: fsRoot, rel: toRel })
    }
    if (fsSelectedRel === from) setFsSelectedRel(toRel)
    setFsDirCache({})
    await ensureDirLoaded('')
    flash('已移动')
  }

  useEffect(() => {
    if (!window.desktop?.fs || !fsRoot) return
    const q = fsQuery.trim().toLowerCase()
    fsSearchTokenRef.current += 1
    const token = fsSearchTokenRef.current

    if (q.length < 2) {
      setFsSearchResults([])
      setFsSearchRunning(false)
      return
    }

    setFsSearchRunning(true)
    setFsSearchResults([])

    ;(async () => {
      const maxDirs = 600
      const maxFiles = 4000
      const maxHits = 200

      const queue: string[] = ['']
      const seenDirs = new Set<string>()
      const hits: FsSearchResult[] = []
      let dirsScanned = 0
      let filesSeen = 0

      while (queue.length > 0) {
        if (fsSearchTokenRef.current !== token) return
        if (dirsScanned >= maxDirs) break
        if (filesSeen >= maxFiles) break
        if (hits.length >= maxHits) break

        const dirRel = queue.shift()!
        if (seenDirs.has(dirRel)) continue
        seenDirs.add(dirRel)
        dirsScanned += 1

        const entries = await fsListDir(dirRel)
        if (fsSearchTokenRef.current !== token) return

        for (const e of entries) {
          if (hits.length >= maxHits) break
          if (e.isDir) {
            queue.push(e.relPath)
            continue
          }
          if (e.kind !== 'md' && e.kind !== 'html' && e.kind !== 'txt') continue
          filesSeen += 1
          if (e.name.toLowerCase().includes(q) || e.relPath.toLowerCase().includes(q)) {
            hits.push({ rel: e.relPath, name: e.name, kind: e.kind })
          }
        }
      }

      if (fsSearchTokenRef.current !== token) return
      setFsSearchResults(hits)
      setFsSearchRunning(false)
    })().catch(() => {
      if (fsSearchTokenRef.current !== token) return
      setFsSearchRunning(false)
    })
  }, [fsQuery, fsRoot])

  const newDraftId = (): string => {
    try {
      if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as Crypto).randomUUID()
    } catch {
      // ignore
    }
    return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }

  const getCurrentDocSnapshot = (): Pick<DraftItem, 'editorFormat' | 'html' | 'markdown'> => {
    if (editorFormat === 'markdown') {
      const md = markdownText
      const html = markdownToHtml(md)
      return { editorFormat: 'markdown', html, markdown: md }
    }
    const html = editor ? editor.getHTML() : currentHtml
    return { editorFormat: 'rich', html, markdown: undefined }
  }

  const applyDraftToEditor = (draft: DraftItem): void => {
    const nextHtml = draft.html
    const nextMd = draft.markdown

    // Avoid the markdown sync effect overwriting our saved Markdown text.
    isMarkdownTypingRef.current = draft.editorFormat === 'markdown'

    if (editor) {
      try {
        editor.commands.setContent(nextHtml)
      } catch {
        // ignore
      }
    }

    safeWriteLocalStorage(STORAGE_KEY, nextHtml)
    setCurrentHtml(nextHtml)

    if (draft.editorFormat === 'markdown') {
      setEditorFormat('markdown')
      setMarkdownText(nextMd ?? htmlToMarkdown(nextHtml))
      window.setTimeout(() => {
        isMarkdownTypingRef.current = false
      }, 350)
    } else {
      isMarkdownTypingRef.current = false
      setEditorFormat('rich')
    }
  }

  function handleFilesNewDraft() {
    const name = window.prompt('新建草稿：请输入名称', '未命名')?.trim()
    if (!name) return

    const id = newDraftId()
    const next: DraftItem = {
      id,
      name,
      updatedAt: Date.now(),
      editorFormat: 'rich',
      html: DEFAULT_CONTENT,
    }

    setDrafts((prev) => [next, ...prev].sort((a, b) => b.updatedAt - a.updatedAt))
    setActiveDraftId(id)
    applyDraftToEditor(next)
    flash('已新建草稿')
  }

  function handleFilesSaveDraft() {
    const snap = getCurrentDocSnapshot()

    const existing = activeDraftId ? drafts.find((d) => d.id === activeDraftId) : undefined
    const name = existing?.name ?? window.prompt('保存为草稿：请输入名称', '未命名')?.trim()
    if (!name) return

    const id = existing?.id ?? newDraftId()
    const next: DraftItem = {
      id,
      name,
      updatedAt: Date.now(),
      editorFormat: snap.editorFormat,
      html: snap.html,
      markdown: snap.markdown,
    }

    setDrafts((prev) => {
      const rest = prev.filter((d) => d.id !== id)
      return [next, ...rest].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 200)
    })
    setActiveDraftId(id)
    flash('已保存草稿')
  }

  function handleFilesOpenDraft(id: string) {
    const draft = drafts.find((d) => d.id === id)
    if (!draft) return
    const ok = window.confirm(`打开草稿：${draft.name}\n\n提示：当前未保存的内容可能会丢失。`)
    if (!ok) return

    setActiveDraftId(draft.id)
    applyDraftToEditor(draft)
    flash('已打开草稿')
  }

  function handleFilesRenameDraft(id: string) {
    const draft = drafts.find((d) => d.id === id)
    if (!draft) return
    const name = window.prompt('重命名草稿', draft.name)?.trim()
    if (!name) return
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, name, updatedAt: Date.now() } : d)).sort((a, b) => b.updatedAt - a.updatedAt))
    flash('已重命名')
  }

  function handleFilesDeleteDraft(id: string) {
    const draft = drafts.find((d) => d.id === id)
    if (!draft) return
    const ok = window.confirm(`删除草稿：${draft.name}？\n\n此操作不可撤销。`)
    if (!ok) return
    setDrafts((prev) => prev.filter((d) => d.id !== id))
    setActiveDraftId((prev) => (prev === id ? null : prev))
    flash('已删除草稿')
  }

  function handleFilesResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!librarySplitRef.current) return
    e.preventDefault()
    filesResizeActiveRef.current = true
    const container = librarySplitRef.current
    const rect = container.getBoundingClientRect()

    const minBottom = 120
    const minTop = 220

    const onMove = (ev: PointerEvent) => {
      if (!filesResizeActiveRef.current) return
      const r = container.getBoundingClientRect()
      const maxBottom = Math.max(minBottom, Math.floor(r.height - minTop))
      const next = Math.round(r.bottom - ev.clientY)
      setFilesPanelHeight(Math.max(minBottom, Math.min(maxBottom, next)))
    }

    const onUp = () => {
      filesResizeActiveRef.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    // Start from current pointer position.
    setFilesPanelHeight((prev) => {
      const maxBottom = Math.max(minBottom, Math.floor(rect.height - minTop))
      const next = Math.round(rect.bottom - e.clientY)
      return Math.max(minBottom, Math.min(maxBottom, Number.isFinite(prev) ? next : minBottom))
    })

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function closeMoreMenu() {
    if (moreMenuRef.current) moreMenuRef.current.open = false
  }

  function handleMenuToggle(active: React.RefObject<HTMLDetailsElement | null>) {
    if (!active.current?.open) return
    const all: Array<React.RefObject<HTMLDetailsElement | null>> = [
      fileMenuRef,
      editMenuRef,
      viewMenuRef,
      helpMenuRef,
      moreMenuRef,
    ]
    for (const ref of all) {
      if (ref === active) continue
      if (ref.current) ref.current.open = false
    }
  }

  function closeMenu(ref: React.RefObject<HTMLDetailsElement | null>) {
    if (ref.current) ref.current.open = false
  }

  function closeAllTopMenus() {
    closeMenu(fileMenuRef)
    closeMenu(editMenuRef)
    closeMenu(viewMenuRef)
    closeMenu(helpMenuRef)
    closeMoreMenu()
  }

  async function handleCheckForUpdates() {
    closeAllTopMenus()

    if (!window.desktop?.updater) {
      flash('仅桌面版支持检查更新')
      return
    }

    let unsub: (() => void) | null = null
    let waitingForDecision = false

    const clearPersistentStatus = () => setStatus('')

    unsub = window.desktop.updater.onStatus(async (payload) => {
      if (payload.type === 'checking') {
        flash('正在检查更新…')
        return
      }

      if (payload.type === 'none') {
        flash('已是最新版本')
        unsub?.()
        return
      }

      if (payload.type === 'available') {
        if (waitingForDecision) return
        waitingForDecision = true

        const nextVer = (payload.info?.version as string | undefined) ?? ''
        const ok = window.confirm(`发现新版本${nextVer ? `：${nextVer}` : ''}。\n\n是否下载并更新？`)
        if (!ok) {
          flash('已取消更新')
          unsub?.()
          return
        }

        const r = await window.desktop!.updater.download()
        if (!r.ok) {
          flash(`下载更新失败${r.error ? `：${r.error}` : ''}`)
          unsub?.()
        }
        return
      }

      if (payload.type === 'progress') {
        const p = typeof payload.progress?.percent === 'number' ? payload.progress.percent : undefined
        if (typeof p === 'number' && Number.isFinite(p)) {
          setStatus(`正在下载更新… ${Math.max(0, Math.min(100, Math.round(p)))}%`)
        } else {
          setStatus('正在下载更新…')
        }
        return
      }

      if (payload.type === 'downloaded') {
        clearPersistentStatus()
        const ok = window.confirm('更新已下载完成，是否立即安装并重启？')
        if (!ok) {
          flash('已下载更新（稍后可重新打开应用安装）')
          unsub?.()
          return
        }
        await window.desktop!.updater.install()
        // App will quit/restart.
        unsub?.()
        return
      }

      if (payload.type === 'error') {
        clearPersistentStatus()
        flash(`检查更新失败：${payload.message}`)
        unsub?.()
      }
    })

    const res = await window.desktop.updater.check()
    if (!res.ok) {
      unsub?.()
      if (res.reason === 'dev') {
        flash('开发模式不支持自动更新')
      } else {
        flash(`检查更新失败${res.error ? `：${res.error}` : ''}`)
      }
    }
  }

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const topbar = topbarRef.current
      if (!topbar) return
      const target = e.target
      if (!(target instanceof Node)) return
      if (topbar.contains(target)) return
      closeAllTopMenus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAllTopMenus()
    }

    document.addEventListener('pointerdown', handlePointerDown, { capture: true })
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function handleCopyFullHtml() {
    const ok = await copyToClipboard(exportFullHtml)
    flash(ok ? '已复制：完整 HTML（含 style）' : '复制失败：请手动导出')
  }

  async function handleCopyBodyHtml() {
    const ok = await copyToClipboard(exportBodyHtml)
    flash(ok ? '已复制：文章 HTML（不含 style）' : '复制失败：请手动导出')
  }

  async function handleCopyRich() {
    const html = buildComputedInlinedWeChatArticleHtml({
      bodyHtml: previewHtml,
      theme,
      customTheme: selectedCustomTheme,
      cssText: exportCss,
    })
    const ok = await copyHtmlToClipboard({ html })
    flash(ok ? '已复制：公众号粘贴版（全量内联）' : '复制失败：可能被浏览器限制')
  }

  async function handleCopyInlinedHtml() {
    const ok = await copyHtmlToClipboard({ html: exportInlinedArticleHtml })
    flash(ok ? '已复制：公众号粘贴版（标准内联）' : '复制失败：可能被浏览器限制')
  }

  async function handleCopyUltraInlinedHtml() {
    const ok = await copyHtmlToClipboard({ html: exportUltraInlinedArticleHtml })
    flash(ok ? '已复制：公众号粘贴版（极限兼容）' : '复制失败：可能被浏览器限制')
  }

  async function handleCopyRichWithStyleTag() {
    const ok = await copyHtmlToClipboard({ html: exportClipboardHtml })
    flash(ok ? '已复制：富文本（含 style，可能被公众号过滤）' : '复制失败：可能被浏览器限制')
  }

  function handleDownloadInlinedHtml() {
    const full = buildWeChatHtmlDocument({
      bodyHtml: exportInlinedArticleHtml,
      theme,
      title: '公众号文章（内联）',
    })
    downloadTextFile('wechat-article-inlined.html', full, 'text/html;charset=utf-8')
    flash('已导出：wechat-article-inlined.html')
  }

  async function handleCopyCss() {
    const ok = await copyToClipboard(exportCss)
    flash(ok ? '已复制：CSS 样式' : '复制失败')
  }

  function handleDownloadHtml() {
    downloadTextFile('wechat-article.html', exportFullHtml, 'text/html;charset=utf-8')
    flash('已导出：wechat-article.html')
  }

  function handleInsertTemplate(templateId: string) {
    if (!ensureEditor()) return
    const tpl = TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    editor.chain().focus().insertContent(tpl.html).run()
  }

  function handleInsertComponent(componentId: string) {
    if (!ensureEditor()) return
    const c = COMPONENTS.find((x) => x.id === componentId)
    if (!c) return

    const schema = getComponentSchema(c)
    const renderer = getComponentRenderer(c)

    if (schema && renderer) {
      const saved = readSavedComponentConfigValues(c.id)
      const defaults = getDefaultComponentValues(c, schema)
      setComponentConfigTargetId(c.id)
      setComponentConfigValues({ ...defaults, ...(saved ?? {}) })
      setIsComponentConfigOpen(true)
      return
    }

    if (c.content) {
      editor.chain().focus().insertContent(c.content).run()
    } else if (c.html) {
      editor.chain().focus().insertContent(c.html).run()
    }
    flash(`已插入：${c.name}`)
  }

  function handleApplySelectedComponentProps() {
    if (!ensureEditor()) return
    if (!selectedComponent) {
      flash('未选中可编辑组件：请先在正文中点一下组件块')
      return
    }

    const c = COMPONENTS.find((x) => x.id === selectedComponent.componentId)
    if (!c) return
    const schema = getComponentSchema(c)
    const renderer = getComponentRenderer(c)
    if (!schema || !renderer) return

    writeSavedComponentConfigValues(c.id, componentPropsValues)
    const rendered = renderer(componentPropsValues) as ReturnType<NonNullable<ComponentItem['render']>>

    if (editorFormat === 'markdown') {
      const start = selectedComponent.sourceStart
      const end = selectedComponent.sourceEnd
      if (typeof start !== 'number' || typeof end !== 'number') {
        flash('Markdown 模式：请把光标放在组件 HTML 块内再应用')
        return
      }

      if (COMPONENTS_PRESERVE_BODY.has(c.id)) {
        if (c.id === 'royalFrameScroll') {
          const style = componentPropsValues.style || 'royal'
          const clsTone = toneClass(componentPropsValues)
          const blockquoteClass =
            style === 'tone'
              ? ['frame', 'frame--tone', clsTone].filter(Boolean).join(' ')
              : 'frame frame--royal'
          const propsRaw = escapeHtmlAttr(encodeComponentProps(componentPropsValues))

          const titleText = (componentPropsValues.title || '活动公告').trim() || '活动公告'
          const titleEscaped = escapeHtml(titleText)

          const block = markdownText.slice(start, end)
          const openEnd = block.indexOf('>')
          if (openEnd < 0) {
            flash('Markdown 模式：无法识别组件开标签')
            return
          }

          const newOpenTag = `<blockquote class="${blockquoteClass}" data-wce-component="royalFrameScroll" data-wce-props="${propsRaw}">`
          let nextBlock = `${newOpenTag}${block.slice(openEnd + 1)}`
          nextBlock = nextBlock.replace(
            /<p\s+class="frame__kicker"[^>]*>\s*<strong>[\s\S]*?<\/strong>\s*<\/p>/i,
            `<p class="frame__kicker"><strong>${titleEscaped}</strong></p>`,
          )

          const nextText = `${markdownText.slice(0, start)}${nextBlock}${markdownText.slice(end)}`
          handleMarkdownChange(nextText)
          flash(`已更新组件：${c.name}`)
          return
        }
      }

      if (!('html' in rendered)) {
        flash('该组件暂不支持 Markdown 源码应用')
        return
      }

      const html = rendered.html.replace(/<p><\/p>\s*$/i, '').trim()
      const nextText = `${markdownText.slice(0, start)}${html}\n\n${markdownText.slice(end)}`
      handleMarkdownChange(nextText)
      flash(`已更新组件：${c.name}`)
      return
    }

    if (typeof selectedComponent.from !== 'number' || typeof selectedComponent.to !== 'number') {
      flash('未选中可编辑组件：请先在正文中点一下组件块')
      return
    }

    if (COMPONENTS_PRESERVE_BODY.has(c.id)) {
      const state = editor.state
      const tr = state.tr
      const from = selectedComponent.from
      const $pos = state.doc.resolve(from)
      const node = $pos.nodeAfter
      if (!node) {
        flash('未选中可编辑组件：请先在正文中点一下组件块')
        return
      }

      if (c.id === 'royalFrameScroll') {
        const style = componentPropsValues.style || 'royal'
        const clsTone = toneClass(componentPropsValues)
        const blockquoteClass =
          style === 'tone'
            ? ['frame', 'frame--tone', clsTone].filter(Boolean).join(' ')
            : 'frame frame--royal'
        const propsRaw = escapeHtmlAttr(encodeComponentProps(componentPropsValues))

        tr.setNodeMarkup(from, undefined, {
          ...node.attrs,
          class: blockquoteClass,
          wceComponent: 'royalFrameScroll',
          wceProps: propsRaw,
        })

        const titleText = (componentPropsValues.title || '活动公告').trim() || '活动公告'
        const titleNodeText = titleText
        const boldMarkType = state.schema.marks.bold
        const textNode = state.schema.text(titleNodeText, boldMarkType ? [boldMarkType.create()] : [])

        let kickerOffset: number | null = null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let kickerChild: any = null
        node.forEach((child, offset) => {
          if (kickerOffset != null) return
          if (child.type.name !== 'paragraph') return
          const cls = typeof child.attrs.class === 'string' ? (child.attrs.class as string) : ''
          if (!cls.includes('frame__kicker')) return
          kickerOffset = offset
          kickerChild = child
        })

        if (kickerOffset != null && kickerChild) {
          const childPos = from + 1 + kickerOffset
          const pType = state.schema.nodes.paragraph
          const newPara = pType.create(kickerChild.attrs, textNode)
          tr.replaceWith(childPos, childPos + kickerChild.nodeSize, newPara)
        }
      }

      editor.view.dispatch(tr)
      flash(`已更新组件：${c.name}`)
      return
    }

    const range = { from: selectedComponent.from, to: selectedComponent.to }
    if ('content' in rendered) editor.chain().focus().insertContentAt(range, rendered.content).run()
    else editor.chain().focus().insertContentAt(range, rendered.html).run()
    flash(`已更新组件：${c.name}`)
  }

  function handleResetSelectedComponentDefaults() {
    if (!selectedComponent) {
      flash('未选中可编辑组件：请先在正文中点一下组件块')
      return
    }

    const c = COMPONENTS.find((x) => x.id === selectedComponent.componentId)
    if (!c) return
    const schema = getComponentSchema(c)
    if (!schema) return

    setComponentPropsValues(getDefaultComponentValues(c, schema))
    flash('已重置为默认参数（未自动应用）')
  }

  function handleCopyStyleToSameComponents() {
    if (!selectedComponent) {
      flash('未选中可编辑组件：请先在正文中点一下组件块')
      return
    }

    const c = COMPONENTS.find((x) => x.id === selectedComponent.componentId)
    if (!c) return
    const schema = getComponentSchema(c)
    const renderer = getComponentRenderer(c)
    if (!schema || !renderer) return

    const styleKeys = getStyleKeys(schema)
    if (styleKeys.length === 0) {
      flash('该组件没有可复制的样式字段')
      return
    }

    const stylePatch: Record<string, string> = {}
    for (const k of styleKeys) stylePatch[k] = componentPropsValues[k] ?? ''

    const ok = window.confirm(
      '复制当前“样式”到本文所有同类组件？\n\n提示：只复制样式字段（如色系/风格），不会覆盖标题/正文等内容字段。',
    )
    if (!ok) return

    // Markdown: operate on textarea HTML blocks.
    if (editorFormat === 'markdown') {
      const indices: number[] = []
      const needle = `data-wce-component="${c.id}"`
      let scan = 0
      while (scan < markdownText.length) {
        const idx = markdownText.indexOf(needle, scan)
        if (idx < 0) break
        indices.push(idx)
        scan = idx + needle.length
      }

      if (indices.length === 0) {
        flash('Markdown 模式：未找到同类组件块')
        return
      }

      const instances: Array<{ start: number; end: number; values: Record<string, string> }> = []
      for (const idx of indices) {
        const found = probeMarkdownComponentAtIndex(markdownText, idx)
        if (!found) continue
        if (found.componentId !== c.id) continue
        if (typeof found.sourceStart !== 'number' || typeof found.sourceEnd !== 'number') continue
        {
          const block = markdownText.slice(found.sourceStart, found.sourceEnd)
          const openEnd = block.indexOf('>')
          const openTag = openEnd >= 0 ? block.slice(0, openEnd + 1) : ''
          const hasProps = /\bdata-wce-props\s*=\s*("|')[^"']*\1/i.test(openTag)
          if (!hasProps) continue
        }
        instances.push({ start: found.sourceStart, end: found.sourceEnd, values: found.values })
      }

      instances.sort((a, b) => b.start - a.start)

      let nextText = markdownText
      let applied = 0

      for (const inst of instances) {
        if (inst.start < 0 || inst.end <= inst.start) continue
        if (inst.end > nextText.length) continue

        const nextValues = { ...inst.values, ...stylePatch }
        const rendered = renderer(nextValues) as any

        if (COMPONENTS_PRESERVE_BODY.has(c.id) && c.id === 'royalFrameScroll') {
          const style = nextValues.style || 'royal'
          const clsTone = toneClass(nextValues)
          const blockquoteClass =
            style === 'tone'
              ? ['frame', 'frame--tone', clsTone].filter(Boolean).join(' ')
              : 'frame frame--royal'
          const propsRaw = escapeHtmlAttr(encodeComponentProps(nextValues))

          const titleText = (nextValues.title || '活动公告').trim() || '活动公告'
          const titleEscaped = escapeHtml(titleText)

          const block = nextText.slice(inst.start, inst.end)
          const openEnd = block.indexOf('>')
          if (openEnd < 0) continue

          const newOpenTag = `<blockquote class="${blockquoteClass}" data-wce-component="royalFrameScroll" data-wce-props="${propsRaw}">`
          let updated = `${newOpenTag}${block.slice(openEnd + 1)}`
          updated = updated.replace(
            /<p\s+class="frame__kicker"[^>]*>\s*<strong>[\s\S]*?<\/strong>\s*<\/p>/i,
            `<p class="frame__kicker"><strong>${titleEscaped}</strong></p>`,
          )

          nextText = `${nextText.slice(0, inst.start)}${updated}${nextText.slice(inst.end)}`
          applied += 1
          continue
        }

        if (!rendered || typeof rendered.html !== 'string') continue
        const html = rendered.html.replace(/<p><\/p>\s*$/i, '').trim()
        nextText = `${nextText.slice(0, inst.start)}${html}\n\n${nextText.slice(inst.end)}`
        applied += 1
      }

      handleMarkdownChange(nextText)
      flash(`已复制样式到同类组件：${applied} 处`)
      return
    }

    // Rich: traverse PM document and update all nodes with matching wceComponent.
    if (!ensureEditor()) return

    const defaults = getDefaultComponentValues(c, schema)
    const saved = readSavedComponentConfigValues(c.id) ?? {}

    const targets: Array<{ from: number; to: number; values: Record<string, string> }> = []
    editor.state.doc.descendants((node: PMNode, pos: number) => {
      const attrs = (node?.attrs ?? {}) as Record<string, unknown>
      const nodeComponentId = typeof attrs.wceComponent === 'string' ? (attrs.wceComponent as string) : ''
      if (nodeComponentId !== c.id) return

      const rawProps = typeof attrs.wceProps === 'string' ? (attrs.wceProps as string) : ''
      if (!rawProps) return
      const decoded = rawProps ? decodeComponentProps(rawProps) : null
      const base = { ...defaults, ...saved, ...(decoded ?? {}) }
      const nextValues = { ...base, ...stylePatch }

      targets.push({ from: pos, to: pos + node.nodeSize, values: nextValues })
    })

    if (targets.length === 0) {
      flash('未找到同类组件块')
      return
    }

    targets.sort((a, b) => b.from - a.from)

    let applied = 0
    for (const t of targets) {
      const rendered = renderer(t.values) as any

      if (COMPONENTS_PRESERVE_BODY.has(c.id) && c.id === 'royalFrameScroll') {
        const state = editor.state
        const tr = state.tr
        const from = t.from
        const node = state.doc.nodeAt(from)
        if (!node) continue

        const style = t.values.style || 'royal'
        const clsTone = toneClass(t.values)
        const blockquoteClass =
          style === 'tone'
            ? ['frame', 'frame--tone', clsTone].filter(Boolean).join(' ')
            : 'frame frame--royal'
        const propsRaw = escapeHtmlAttr(encodeComponentProps(t.values))

        tr.setNodeMarkup(from, undefined, {
          ...node.attrs,
          class: blockquoteClass,
          wceComponent: 'royalFrameScroll',
          wceProps: propsRaw,
        })

        const titleText = (t.values.title || '活动公告').trim() || '活动公告'
        const boldMarkType = state.schema.marks.bold
        const textNode = state.schema.text(titleText, boldMarkType ? [boldMarkType.create()] : [])

        let kickerOffset: number | null = null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let kickerChild: any = null
        node.forEach((child: PMNode, offset: number) => {
          if (kickerOffset != null) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyChild = child as any
          if (anyChild.type?.name !== 'paragraph') return
          const cls = typeof (anyChild.attrs?.class) === 'string' ? (anyChild.attrs.class as string) : ''
          if (!cls.includes('frame__kicker')) return
          kickerOffset = offset
          kickerChild = child
        })

        if (kickerOffset != null && kickerChild) {
          const childPos = from + 1 + kickerOffset
          const pType = state.schema.nodes.paragraph
          const newPara = pType.create((kickerChild as any).attrs, textNode)
          tr.replaceWith(childPos, childPos + (kickerChild as any).nodeSize, newPara)
        }

        editor.view.dispatch(tr)
        applied += 1
        continue
      }

      editor.chain().focus().insertContentAt({ from: t.from, to: t.to }, rendered.content ?? rendered.html).run()
      applied += 1
    }

    flash(`已复制样式到同类组件：${applied} 处`)
  }

  function handleConfirmInsertConfiguredComponent() {
    if (!ensureEditor()) return
    const c = componentConfigTarget
    if (!c) return
    const schema = getComponentSchema(c)
    const renderer = getComponentRenderer(c)
    if (!schema || !renderer) return

    writeSavedComponentConfigValues(c.id, componentConfigValues)
    const rendered = renderer(componentConfigValues) as ReturnType<NonNullable<ComponentItem['render']>>
    if ('content' in rendered) {
      editor.chain().focus().insertContent(rendered.content).run()
    } else {
      editor.chain().focus().insertContent(rendered.html).run()
    }
    setIsComponentConfigOpen(false)
    setComponentConfigTargetId(null)
    setComponentConfigValues({})
    flash(`已插入：${c.name}`)
  }

  function handleApplyLayoutReplace(layoutId: string) {
    if (!ensureEditor()) return
    const preset = LAYOUT_PRESETS.find((x) => x.id === layoutId)
    if (!preset) return
    const ok = window.confirm(`套用整篇模板「${preset.name}」？\n\n此操作会覆盖当前内容。`)
    if (!ok) return
    editor.commands.setContent(preset.html)
    flash(`已套用整篇模板：${preset.name}`)
  }

  function handleSmartFormat() {
    if (!ensureEditor()) return

    const html = editor.getHTML()
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
    const root = doc.body.firstElementChild as HTMLElement | null
    if (!root) return

    const normalizeText = (s: string) => s.replace(/\s+/g, ' ').trim()
    const isMeaningfulText = (el: HTMLElement) => normalizeText(el.textContent ?? '').length > 0
    const textLen = (el: HTMLElement) => normalizeText(el.textContent ?? '').length

    const looksLikeQuestion = (s: string) => {
      const t = normalizeText(s)
      return /^q\s*[:：]/i.test(t) || /^问\s*[:：]/.test(t) || /^Q&A/i.test(t)
    }

    const pickH2Style = (el: HTMLElement): 'section' | 'titlebar' => {
      const t = normalizeText(el.textContent ?? '')
      const keywords = ['步骤', '清单', '目录', '常见问题', 'FAQ', 'Q&A', '总结', '结论', '方法', '要点', '亮点', '目标']
      if (keywords.some((k) => t.includes(k))) return 'titlebar'
      if (t.length <= 10) return 'titlebar'
      return 'section'
    }

    const convertPToCalloutIfMatched = (p: HTMLParagraphElement) => {
      const t = normalizeText(p.textContent ?? '')
      const match = /^(提示|注意|信息|结论)\s*[:：]\s*(.+)$/.exec(t)
      if (!match) return false

      const label = match[1]
      const content = match[2]
      const blockquote = doc.createElement('blockquote')
      let variant = 'callout--info'
      if (label === '注意') variant = 'callout--warn'
      if (label === '结论') variant = 'callout--ok'
      blockquote.className = `callout ${variant}`

      const p1 = doc.createElement('p')
      const strong = doc.createElement('strong')
      strong.textContent = label
      p1.appendChild(strong)
      const p2 = doc.createElement('p')
      p2.textContent = content

      blockquote.appendChild(p1)
      blockquote.appendChild(p2)

      p.replaceWith(blockquote)
      return true
    }

    // 1) first non-empty paragraph -> lead
    const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('p'))
    const firstP = paragraphs.find((p) => isMeaningfulText(p) && textLen(p) >= 12)
    if (firstP && !firstP.classList.contains('lead') && !firstP.classList.contains('caption')) {
      firstP.classList.add('lead')
    }

    // 2) h2 -> section/titlebar
    const h2s = Array.from(root.querySelectorAll<HTMLElement>('h2'))
    for (const h of h2s) {
      if (h.classList.contains('section') || h.classList.contains('titlebar')) continue
      h.classList.add(pickH2Style(h))
    }

    // 3) h3 -> badge
    const h3s = Array.from(root.querySelectorAll<HTMLElement>('h3'))
    for (const h of h3s) {
      if (h.classList.contains('badge')) continue
      if (looksLikeQuestion(h.textContent ?? '') || textLen(h) <= 18) {
        h.classList.add('badge')
      }
    }

    // 4) top-level tip paragraphs -> callout
    const topLevelPs = Array.from(root.children).filter((n) => n.tagName.toLowerCase() === 'p') as HTMLParagraphElement[]
    for (const p of topLevelPs) {
      void convertPToCalloutIfMatched(p)
    }

    // 5) plain blockquote -> quote
    const quotes = Array.from(root.querySelectorAll<HTMLElement>('blockquote'))
    for (const bq of quotes) {
      if (bq.classList.contains('quote') || bq.classList.contains('callout') || bq.classList.contains('card')) continue
      bq.classList.add('quote')
    }

    // 6) auto-insert dividers between top-level sections when missing
    const children = Array.from(root.children) as HTMLElement[]
    const h2Indices: number[] = []
    for (let i = 0; i < children.length; i++) {
      if (children[i].tagName.toLowerCase() === 'h2') h2Indices.push(i)
    }

    for (let idx = 0; idx < h2Indices.length - 1; idx++) {
      const start = h2Indices[idx]
      const end = h2Indices[idx + 1]
      const between = children.slice(start + 1, end)
      const hasDivider = between.some((el) => {
        const tag = el.tagName.toLowerCase()
        if (tag === 'hr') return true
        if (tag === 'p' && el.classList.contains('divider')) return true
        return false
      })
      if (hasDivider) continue

      const divider = doc.createElement('p')
      divider.className = 'divider divider--wave'
      divider.textContent = '≈≈≈≈≈'
      const before = root.children[end] ?? null
      root.insertBefore(divider, before)
    }

    editor.commands.setContent(root.innerHTML)
    flash('已智能套版：导语/标题/提示框/分隔/引用已增强')
  }

  function handleSetLink() {
    if (!ensureEditor()) return
    const previous = editor.getAttributes('link').href as string | undefined
    const href = window.prompt('输入链接 URL：', previous ?? 'https://')
    if (href === null) return
    if (href.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  function handleInsertImageByUrl() {
    if (!ensureEditor()) return
    const url = window.prompt('输入图片 URL：')
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
  }

  function handlePickLocalImage() {
    fileInputRef.current?.click()
  }

  function applySelectedImageStyle(nextStyle: ImageStyleId): void {
    if (!ensureEditor()) return
    if (!editor.isActive('image')) {
      flash('请先点选一张图片')
      return
    }
    setImageStyle(nextStyle)
    editor
      .chain()
      .focus()
      .updateAttributes('image', {
        class: nextStyle || null,
      })
      .run()
  }

  async function handleLocalImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!ensureEditor()) return
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const dataUrl = await readFileAsDataUrl(file)
    editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run()
  }

  function handleClear() {
    if (!ensureEditor()) return
    const ok = window.confirm('确定清空内容？')
    if (!ok) return
    editor.commands.setContent('<p></p>')
    flash('已清空')
  }

  function handleOpenImport() {
    setImportHtml('')
    setIsImportOpen(true)
  }

  function handleOpenThemeImport() {
    const example: Omit<WeChatCustomTheme, 'id'> = {
      name: '自定义主题示例',
      vars: {
        '--wechat-accent': '#2563eb',
        '--wechat-accent-soft': 'rgba(37, 99, 235, 0.10)',
        '--wechat-accent-softer': 'rgba(37, 99, 235, 0.06)',
        '--wechat-heading': '#111827',
        '--wechat-quote-border': 'rgba(37, 99, 235, 0.28)',
        '--wechat-quote-bg': 'rgba(37, 99, 235, 0.06)',
        '--wechat-pre-bg': 'rgba(2, 6, 23, 0.06)',
      },
      extraCss: '',
    }
    setThemeImportText(JSON.stringify(example, null, 2))
    setIsThemeImportOpen(true)
  }

  function handleOpenThemeCssImport() {
    setThemeCssName('自定义CSS主题')
    setThemeCssText(`/* 你可以粘贴整段CSS，这里会自动提取 --wechat-* 变量 */

:root {
  --wechat-accent: #2563eb;
  --wechat-accent-soft: rgba(37, 99, 235, 0.10);
  --wechat-accent-softer: rgba(37, 99, 235, 0.06);
  --wechat-heading: #111827;
  --wechat-quote-border: rgba(37, 99, 235, 0.28);
  --wechat-quote-bg: rgba(37, 99, 235, 0.06);
  --wechat-pre-bg: rgba(2, 6, 23, 0.06);
}

/* 额外样式（可选）：建议尽量写 .wechat-article 内部 */
.wechat-article h1 {
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.10);
}
`.trim())
    setIsThemeCssImportOpen(true)
  }

  function parseWeChatVarsFromCss(cssText: string): Record<string, string> {
    const vars: Record<string, string> = {}
    const re = /(--wechat-[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g
    let m: RegExpExecArray | null
    while ((m = re.exec(cssText))) {
      const k = m[1].trim()
      const v = m[2].trim()
      if (k && v) vars[k] = v
    }
    return vars
  }

  function stripWeChatVarDeclarations(cssText: string): string {
    // Remove just the declarations; keep other rules.
    return cssText.replaceAll(/--wechat-[a-zA-Z0-9-]+\s*:\s*[^;]+;/g, '')
  }

  function handleApplyThemeCssImport() {
    const name = themeCssName.trim()
    const css = themeCssText.trim()
    if (!name || !css) {
      flash('主题导入失败：名称或 CSS 为空')
      return
    }

    const vars = parseWeChatVarsFromCss(css)
    const extraCss = stripWeChatVarDeclarations(css).trim()

    if (Object.keys(vars).length === 0 && extraCss.length === 0) {
      flash('主题导入失败：未检测到可用内容')
      return
    }

    const id = `${Date.now()}`
    const themeObj: WeChatCustomTheme = { id, name, vars, extraCss }
    setCustomThemes((prev) => [themeObj, ...prev])
    setTheme(`custom:${id}`)
    setIsThemeCssImportOpen(false)
    flash(`已导入CSS主题：${name}`)
  }

  function handleApplyThemeImport() {
    const text = themeImportText.trim()
    if (!text) {
      setIsThemeImportOpen(false)
      return
    }

    try {
      const parsed = JSON.parse(text) as unknown
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid')
      const anyP = parsed as Record<string, unknown>
      const name = typeof anyP.name === 'string' ? anyP.name.trim() : ''
      const vars = (anyP.vars ?? {}) as Record<string, string>
      const extraCss = typeof anyP.extraCss === 'string' ? anyP.extraCss : undefined
      if (!name) throw new Error('missing name')

      const id = `${Date.now()}`
      const themeObj: WeChatCustomTheme = { id, name, vars, extraCss }
      setCustomThemes((prev) => [themeObj, ...prev])
      setTheme(`custom:${id}`)
      setIsThemeImportOpen(false)
      flash(`已导入主题：${name}`)
    } catch {
      flash('主题导入失败：请检查 JSON 格式')
    }
  }

  function handleDeleteCurrentCustomTheme() {
    if (!theme.startsWith('custom:')) return
    const id = theme.slice('custom:'.length)
    const t = customThemes.find((x) => x.id === id)
    const ok = window.confirm(`删除自定义主题「${t?.name ?? id}」？`)
    if (!ok) return
    setCustomThemes((prev) => prev.filter((x) => x.id !== id))
    setTheme('clean')
    flash('已删除自定义主题')
  }

  function handleApplyImport() {
    if (!ensureEditor()) return
    const html = importHtml.trim()
    if (!html) {
      setIsImportOpen(false)
      return
    }
    editor.commands.setContent(html)
    setIsImportOpen(false)
    flash('已导入 HTML')
  }

  return (
    <div className="wechatShell">
      <header className="wechatTopbar" ref={topbarRef}>
        <div className="wechatTopbar__left">
          <div className="wechatTopbar__primary">
            <div className="wechatBrand">
              <div className="wechatBrand__title">公众号编辑器</div>
              <div className="wechatBrand__meta">字数：{charCount}</div>
            </div>

            <nav className="wechatMenubar" aria-label="菜单栏">
            <details className="menu menu--left wechatMenu" ref={fileMenuRef} onToggle={() => handleMenuToggle(fileMenuRef)}>
              <summary className="wechatMenu__trigger">文件</summary>
              <div className="menu__panel" role="menu">
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(fileMenuRef)
                    if (!ensureEditor()) return
                    const ok = window.confirm('重置为示例内容？当前内容会被覆盖。')
                    if (!ok) return
                    editor.commands.setContent(DEFAULT_CONTENT)
                    safeWriteLocalStorage(STORAGE_KEY, DEFAULT_CONTENT)
                    setCurrentHtml(DEFAULT_CONTENT)
                    flash('已重置内容')
                  }}
                >
                  新建/重置
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(fileMenuRef)
                    setIsImportOpen(true)
                  }}
                >
                  导入 HTML…
                </button>
                <div className="menu__sep" />
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(fileMenuRef)
                    handleDownloadHtml()
                  }}
                >
                  导出 HTML
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(fileMenuRef)
                    handleDownloadInlinedHtml()
                  }}
                >
                  导出（内联）HTML
                </button>
              </div>
            </details>

            <details className="menu menu--left wechatMenu" ref={editMenuRef} onToggle={() => handleMenuToggle(editMenuRef)}>
              <summary className="wechatMenu__trigger">编辑</summary>
              <div className="menu__panel" role="menu">
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(editMenuRef)
                    editor?.chain().focus().undo().run()
                  }}
                >
                  撤销
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(editMenuRef)
                    editor?.chain().focus().redo().run()
                  }}
                >
                  重做
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(editMenuRef)
                    editor?.chain().focus().unsetAllMarks().clearNodes().run()
                  }}
                >
                  清除格式
                </button>
                <div className="menu__sep" />
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(editMenuRef)
                    void handleCopyRich()
                  }}
                >
                  复制富文本
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(editMenuRef)
                    void handleCopyInlinedHtml()
                  }}
                >
                  复制内联 HTML
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(editMenuRef)
                    void handleCopyFullHtml()
                  }}
                >
                  复制完整 HTML
                </button>
              </div>
            </details>

            <details className="menu menu--left wechatMenu" ref={viewMenuRef} onToggle={() => handleMenuToggle(viewMenuRef)}>
              <summary className="wechatMenu__trigger">视图</summary>
              <div className="menu__panel" role="menu">
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(viewMenuRef)
                    setViewMode('edit')
                  }}
                >
                  编辑（仅编辑）
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(viewMenuRef)
                    setViewMode('split')
                  }}
                >
                  分屏（编辑+预览）
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(viewMenuRef)
                    setViewMode('preview')
                  }}
                >
                  预览（仅预览）
                </button>
                <div className="menu__sep" />
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(viewMenuRef)
                    if (editorFormat === 'rich') return
                    handleSwitchToRich()
                  }}
                >
                  富文本模式
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(viewMenuRef)
                    if (editorFormat === 'markdown') return
                    handleSwitchToMarkdown()
                  }}
                >
                  Markdown 模式
                </button>
              </div>
            </details>

            <details className="menu menu--left wechatMenu" ref={helpMenuRef} onToggle={() => handleMenuToggle(helpMenuRef)}>
              <summary className="wechatMenu__trigger">帮助</summary>
              <div className="menu__panel" role="menu">
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(helpMenuRef)
                    window.open('https://github.com/Renhao0209/Wechat__editer/releases', '_blank')
                  }}
                >
                  打开 Releases（下载桌面版）
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(helpMenuRef)
                    window.open('https://github.com/Renhao0209/Wechat__editer', '_blank')
                  }}
                >
                  打开 GitHub 仓库
                </button>
              </div>
            </details>

            <button type="button" className="wechatMenu__spacer" aria-label="关闭菜单" onClick={closeAllTopMenus} />
            </nav>

            <div className="wechatSeg" role="group" aria-label="视图">
            <button
              type="button"
              className={`wechatSeg__btn ${viewMode === 'edit' ? 'is-active' : ''}`}
              aria-pressed={viewMode === 'edit'}
              onClick={() => setViewMode('edit')}
              title="只显示编辑"
            >
              编辑
            </button>
            <button
              type="button"
              className={`wechatSeg__btn ${viewMode === 'split' ? 'is-active' : ''}`}
              aria-pressed={viewMode === 'split'}
              onClick={() => setViewMode('split')}
              title="编辑 + 预览"
            >
              分屏
            </button>
            <button
              type="button"
              className={`wechatSeg__btn ${viewMode === 'preview' ? 'is-active' : ''}`}
              aria-pressed={viewMode === 'preview'}
              onClick={() => setViewMode('preview')}
              title="只显示预览"
            >
              预览
            </button>
          </div>

            <div className="wechatSeg" role="group" aria-label="编辑格式">
            <button
              type="button"
              className={`wechatSeg__btn ${editorFormat === 'rich' ? 'is-active' : ''}`}
              aria-pressed={editorFormat === 'rich'}
              onClick={() => (editorFormat === 'rich' ? undefined : handleSwitchToRich())}
              title="富文本编辑（所见即所得）"
            >
              富文本
            </button>
            <button
              type="button"
              className={`wechatSeg__btn ${editorFormat === 'markdown' ? 'is-active' : ''}`}
              aria-pressed={editorFormat === 'markdown'}
              onClick={() => (editorFormat === 'markdown' ? undefined : handleSwitchToMarkdown())}
              title="Markdown 源码编辑（支持直接写 HTML）"
            >
              Markdown
            </button>
          </div>

            <div className="wechatTopbar__actions" aria-label="快捷操作">
              <div className="wechatTopbar__actionsRow" aria-label="复制操作">
                <button
                  className="btn"
                  onClick={() => {
                    closeAllTopMenus()
                    void handleCopyRich()
                  }}
                >
                  复制到公众号
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    closeAllTopMenus()
                    void handleCopyInlinedHtml()
                  }}
                >
                  复制到公众号（标准）
                </button>
              </div>

              <details className="menu wechatMenu" ref={moreMenuRef} onToggle={() => handleMenuToggle(moreMenuRef)}>
                <summary className="wechatMenu__trigger wechatMenu__trigger--button" aria-label="更多操作">
                  更多
                </summary>
                <div className="menu__panel" role="menu">
                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      void handleCheckForUpdates()
                    }}
                  >
                    检查更新
                  </button>

                  <div className="menu__sep" />

                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      void handleCopyUltraInlinedHtml()
                    }}
                  >
                    复制到公众号（极限兼容）
                  </button>

                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      void handleCopyRichWithStyleTag()
                    }}
                  >
                    复制富文本（含style）
                  </button>

                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      void handleCopyFullHtml()
                    }}
                  >
                    复制完整 HTML
                  </button>
                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      void handleCopyBodyHtml()
                    }}
                  >
                    复制文章 HTML
                  </button>
                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      void handleCopyCss()
                    }}
                  >
                    复制 CSS
                  </button>

                  <div className="menu__sep" />

                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      handleDownloadHtml()
                    }}
                  >
                    导出 HTML
                  </button>
                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      handleDownloadInlinedHtml()
                    }}
                  >
                    导出内联HTML
                  </button>

                  <div className="menu__sep" />

                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      handleOpenImport()
                    }}
                  >
                    导入 HTML
                  </button>
                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      handleOpenThemeImport()
                    }}
                  >
                    导入JSON主题
                  </button>
                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      handleOpenThemeCssImport()
                    }}
                  >
                    导入CSS主题
                  </button>

                  {theme.startsWith('custom:') && (
                    <>
                      <div className="menu__sep" />
                      <button
                        type="button"
                        className="menu__item menu__item--danger"
                        role="menuitem"
                        onClick={() => {
                          closeMoreMenu()
                          handleDeleteCurrentCustomTheme()
                        }}
                      >
                        删除当前自定义主题
                      </button>
                    </>
                  )}

                  <div className="menu__sep" />

                  <button
                    type="button"
                    className="menu__item menu__item--danger"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu()
                      handleClear()
                    }}
                  >
                    清空内容
                  </button>
                </div>
              </details>
            </div>

          </div>

          <div className="wechatTopbar__secondary">

          <label className="wechatField">
            <span>主题</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as WeChatThemeId)}>
              {BUILT_IN_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
              {customThemes.length > 0 && <option disabled>────────</option>}
              {customThemes.map((t) => (
                <option key={t.id} value={`custom:${t.id}`}>
                  自定义：{t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="wechatField">
            <span>模板</span>
            <select defaultValue="" onChange={(e) => handleInsertTemplate(e.target.value)}>
              <option value="" disabled>
                选择后插入…
              </option>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="wechatStatus" aria-live="polite">
            {status}
          </div>

          </div>
        </div>

        
      </header>

      <main className={`wechatMain wechatMain--${viewMode}`}>
        <aside className="wechatLibraryDock" aria-label="素材库">
          <div className="wechatLibrarySplit" ref={librarySplitRef}>
            <aside className="wechatLibrary wechatLibrary--top" aria-label="素材库">
            <div className="wechatLibrary__tabs" role="tablist" aria-label="素材库">
              <button
                type="button"
                role="tab"
                aria-selected={libraryTab === 'components'}
                className={`wechatLibrary__tab ${libraryTab === 'components' ? 'is-active' : ''}`}
                onClick={() => setLibraryTab('components')}
              >
                组件
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={libraryTab === 'layouts'}
                className={`wechatLibrary__tab ${libraryTab === 'layouts' ? 'is-active' : ''}`}
                onClick={() => setLibraryTab('layouts')}
              >
                套版
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={libraryTab === 'props'}
                className={`wechatLibrary__tab ${libraryTab === 'props' ? 'is-active' : ''}`}
                onClick={() => setLibraryTab('props')}
              >
                属性
              </button>
            </div>

            {libraryTab === 'components' && (
              <div className="wechatLibrary__panel" role="tabpanel">
                <div className="wechatLibrary__hint">点击即可插入到光标位置</div>
                <div className="wechatLibrary__tools" aria-label="组件筛选">
                  <input
                    className="wechatLibrary__search"
                    value={componentQuery}
                    onChange={(e) => setComponentQuery(e.target.value)}
                    placeholder="搜索组件（名称/描述/ID）"
                  />

                  <div className="wechatLibrary__cats" role="group" aria-label="组件分类">
                    <button
                      type="button"
                      className={`wechatPill ${componentCategory === 'all' ? 'is-active' : ''}`}
                      onClick={() => setComponentCategory('all')}
                    >
                      全部
                    </button>
                    {COMPONENT_CATEGORY_ORDER.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`wechatPill ${componentCategory === cat ? 'is-active' : ''}`}
                        onClick={() => setComponentCategory(cat)}
                      >
                        {COMPONENT_CATEGORY_LABEL[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredComponents.length === 0 ? (
                  <div className="wechatLibrary__empty">没有匹配的组件</div>
                ) : (
                  (componentCategory === 'all' ? COMPONENT_CATEGORY_ORDER : [componentCategory]).map((cat) => {
                    const list = filteredComponents.filter((c) => toUiCategory(c.category) === cat)
                    if (list.length === 0) return null
                    return (
                      <div key={cat} className="wechatLibrary__group">
                        <div className="wechatLibrary__groupTitle">{COMPONENT_CATEGORY_LABEL[cat]}</div>
                        <div className="wechatLibrary__grid">
                          {list.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="wechatCardBtn"
                              onClick={() => handleInsertComponent(c.id)}
                              title={c.desc ?? c.name}
                            >
                              {(() => {
                                const desc = c.desc ?? c.description
                                const schema = getComponentSchema(c)
                                const renderer = getComponentRenderer(c)
                                const isEditable = Boolean(schema && renderer)
                                const tags = (c.tags ?? []).filter((t) => typeof t === 'string' && t.trim().length > 0)
                                const catLabel = COMPONENT_CATEGORY_LABEL[toUiCategory(c.category)]
                                const thumbText = (catLabel || c.name || c.id).slice(0, 2)

                                return (
                                  <>
                                    <div className="wechatCardBtn__row">
                                      <div className="wechatCardBtn__thumb" aria-hidden="true">
                                        {c.previewThumb ? (
                                          <img className="wechatCardBtn__thumbImg" src={c.previewThumb} alt="" loading="lazy" />
                                        ) : (
                                          <div className="wechatCardBtn__thumbPh">{thumbText}</div>
                                        )}
                                      </div>

                                      <div className="wechatCardBtn__main">
                                        <div className="wechatCardBtn__titleRow">
                                          <div className="wechatCardBtn__title">{c.name}</div>
                                          {isEditable && <span className="wechatBadge">可编辑</span>}
                                        </div>
                                        <div className="wechatCardBtn__meta">{c.id}</div>
                                        {desc && <div className="wechatCardBtn__desc">{desc}</div>}
                                      </div>
                                    </div>

                                    {tags.length > 0 && (
                                      <div className="wechatCardBtn__tags" aria-label="标签">
                                        {tags.slice(0, 4).map((t) => (
                                          <span key={t} className="wechatTag">
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {libraryTab === 'layouts' && (
              <div className="wechatLibrary__panel" role="tabpanel">
                <div className="wechatLibrary__hint">
                  「整篇套版」会覆盖当前内容；「智能套版」会在保留内容的前提下增强样式。
                </div>

                <button type="button" className="wechatPrimaryAction" onClick={handleSmartFormat}>
                  智能套版（不覆盖）
                </button>

                <div className="wechatLibrary__group">
                  <div className="wechatLibrary__groupTitle">整篇模板（覆盖）</div>
                  <div className="wechatLibrary__grid">
                    {LAYOUT_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="wechatCardBtn"
                        onClick={() => handleApplyLayoutReplace(p.id)}
                        title={p.desc}
                      >
                        <div className="wechatCardBtn__title">{p.name}</div>
                        <div className="wechatCardBtn__desc">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {libraryTab === 'props' && (
              <div className="wechatLibrary__panel" role="tabpanel">
                <div className="wechatProps__title">组件属性</div>
                <div className="wechatProps__hint">
                  先在正文里点选一个组件块（例如提示框/卡片/标题条），这里就能调整参数并应用。
                </div>

                <button
                  type="button"
                  className="wechatPrimaryAction"
                  onClick={() => {
                    if (!editor) return
                    const found = probeSelectedComponent(editor)
                    setSelectedComponent(found)
                    if (!found) {
                      flash('未识别到组件：请把光标放到组件块内部（或点一下组件文字）')
                    }
                  }}
                >
                  从光标读取（刷新）
                </button>

                {!selectedComponent ? (
                  <div className="wechatLibrary__empty">未选中可编辑组件</div>
                ) : (
                  (() => {
                    const c = COMPONENTS.find((x) => x.id === selectedComponent.componentId)
                    const schema = c ? getComponentSchema(c) : null
                    if (!c || !schema) return <div className="wechatLibrary__empty">该组件暂不支持属性编辑</div>

                    return (
                      <>
                        <div className="wechatProps__meta">
                          <div className="wechatProps__name">{c.name}</div>
                          <div className="wechatProps__id">{c.id}</div>
                        </div>

                        {schema.fields.map((f) => (
                          <label key={f.key} className="wechatProps__field">
                            <div className="wechatProps__label">{f.label}</div>
                            {f.type === 'select' ? (
                              <select
                                className="wechatProps__input"
                                value={componentPropsValues[f.key] ?? ''}
                                onChange={(e) =>
                                  setComponentPropsValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                                }
                              >
                                {(f.options ?? []).map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : f.type === 'color' ? (
                              <input
                                className="wechatProps__input"
                                type="color"
                                value={componentPropsValues[f.key] ?? f.default ?? '#000000'}
                                onChange={(e) =>
                                  setComponentPropsValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                                }
                              />
                            ) : f.type === 'textarea' ? (
                              <textarea
                                className="wechatProps__textarea"
                                value={componentPropsValues[f.key] ?? ''}
                                placeholder={f.placeholder}
                                onChange={(e) =>
                                  setComponentPropsValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                                }
                              />
                            ) : (
                              <input
                                className="wechatProps__input"
                                value={componentPropsValues[f.key] ?? ''}
                                placeholder={f.placeholder}
                                onChange={(e) =>
                                  setComponentPropsValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                                }
                              />
                            )}
                          </label>
                        ))}

                        <div className="wechatProps__actions">
                          <button type="button" className="wechatPrimaryAction" onClick={handleApplySelectedComponentProps}>
                            应用到当前组件
                          </button>

                          <div className="wechatProps__actionsRow">
                            <button type="button" className="wechatSecondaryAction" onClick={handleResetSelectedComponentDefaults}>
                              重置默认
                            </button>
                            <button type="button" className="wechatSecondaryAction" onClick={handleCopyStyleToSameComponents}>
                              复制样式到同类
                            </button>
                          </div>
                        </div>
                      </>
                    )
                  })()
                )}
              </div>
            )}
            </aside>

            <div
              className="wechatLibraryResizer"
              role="separator"
              aria-orientation="horizontal"
              aria-label="调整文件面板高度"
              tabIndex={0}
              onPointerDown={handleFilesResizePointerDown}
            />

            <aside className="wechatFiles" aria-label="文件" style={{ height: filesPanelHeight }}>
              <div className="wechatFiles__header">
                <div className="wechatFiles__title">文件</div>

                <div className="wechatFiles__tabs" role="tablist" aria-label="文件面板">
                  <button
                    type="button"
                    className={`wechatPill wechatPill--sm ${filesTab === 'drafts' ? 'is-active' : ''}`}
                    role="tab"
                    aria-selected={filesTab === 'drafts'}
                    onClick={() => setFilesTab('drafts')}
                  >
                    草稿
                  </button>
                  <button
                    type="button"
                    className={`wechatPill wechatPill--sm ${filesTab === 'files' ? 'is-active' : ''}`}
                    role="tab"
                    aria-selected={filesTab === 'files'}
                    onClick={async () => {
                      setFilesTab('files')
                      if (hasDesktopFs && fsRoot) await ensureDirLoaded('')
                    }}
                  >
                    目录
                  </button>
                </div>

                <div className="wechatFiles__actions">
                  {filesTab === 'drafts' ? (
                    <>
                      <button type="button" className="wechatMiniBtn" onClick={handleFilesNewDraft} title="新建草稿">
                        新建
                      </button>
                      <button type="button" className="wechatMiniBtn wechatMiniBtn--primary" onClick={handleFilesSaveDraft} title="保存到草稿">
                        保存
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="wechatMiniBtn" onClick={handleFilesPickRoot} title="选择文件夹">
                        选文件夹
                      </button>
                      <button type="button" className="wechatMiniBtn" onClick={handleFilesRefresh} title="刷新目录">
                        刷新
                      </button>
                      <button type="button" className="wechatMiniBtn" onClick={handleFilesNewFile} title="新建文件">
                        新建文件
                      </button>
                      <button type="button" className="wechatMiniBtn" onClick={handleFilesNewFolder} title="新建文件夹">
                        新建文件夹
                      </button>
                      <button type="button" className="wechatMiniBtn wechatMiniBtn--primary" onClick={handleFilesSaveToDisk} title="保存到文件">
                        保存
                      </button>
                      <button type="button" className="wechatMiniBtn" onClick={handleFilesSaveAsToDisk} title="另存为">
                        另存为
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="wechatFiles__body" role="tree" aria-label="草稿列表">
                {filesTab === 'drafts' ? (
                  drafts.length === 0 ? (
                    <div className="wechatFiles__empty">还没有草稿。点“保存”即可把当前内容存为草稿。</div>
                  ) : (
                    drafts.map((d) => {
                      const isActive = activeDraftId === d.id
                      return (
                        <div key={d.id} className={`wechatFileRow ${isActive ? 'is-active' : ''}`} role="treeitem" aria-selected={isActive}>
                          <button
                            type="button"
                            className="wechatFileRow__main"
                            onClick={() => handleFilesOpenDraft(d.id)}
                            title={d.name}
                          >
                            <div className="wechatFileRow__name">{d.name}</div>
                            <div className="wechatFileRow__meta">
                              {d.editorFormat === 'markdown' ? 'Markdown' : '富文本'} · {getDraftDisplayTime(d.updatedAt)}
                            </div>
                          </button>

                          <div className="wechatFileRow__actions">
                            <button
                              type="button"
                              className="wechatMiniBtn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleFilesRenameDraft(d.id)
                              }}
                              title="重命名"
                            >
                              重命名
                            </button>
                            <button
                              type="button"
                              className="wechatMiniBtn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleFilesDeleteDraft(d.id)
                              }}
                              title="删除"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )
                ) : !hasDesktopFs ? (
                  <div className="wechatFiles__empty">目录功能仅桌面版可用。</div>
                ) : !fsRoot ? (
                  <div className="wechatFiles__empty">请先点“选文件夹”。</div>
                ) : (
                  <div className="wechatTree" role="tree" aria-label="文件目录">
                    <div className="wechatTree__hint">
                      根目录：{fsRoot}
                      {activeFile && activeFile.root === fsRoot && (
                        <span className="wechatTree__activeFile">
                          当前：{activeFile.rel}
                          {isActiveFileDirty ? <strong className="wechatDirtyDot"> ●</strong> : null}
                        </span>
                      )}
                    </div>

                    <div className="wechatTree__tools" aria-label="文件筛选">
                      <input
                        className="wechatLibrary__search"
                        value={fsQuery}
                        onChange={(e) => setFsQuery(e.target.value)}
                        placeholder="搜索文件（输入 2 个字符以上）"
                      />

                      <div className="wechatTree__filters" role="group" aria-label="类型筛选">
                        <button
                          type="button"
                          className={`wechatPill wechatPill--sm ${fsKindFilter === 'all' ? 'is-active' : ''}`}
                          onClick={() => setFsKindFilter('all')}
                        >
                          全部
                        </button>
                        <button
                          type="button"
                          className={`wechatPill wechatPill--sm ${fsKindFilter === 'md' ? 'is-active' : ''}`}
                          onClick={() => setFsKindFilter('md')}
                        >
                          md
                        </button>
                        <button
                          type="button"
                          className={`wechatPill wechatPill--sm ${fsKindFilter === 'html' ? 'is-active' : ''}`}
                          onClick={() => setFsKindFilter('html')}
                        >
                          html
                        </button>
                        <button
                          type="button"
                          className={`wechatPill wechatPill--sm ${fsKindFilter === 'txt' ? 'is-active' : ''}`}
                          onClick={() => setFsKindFilter('txt')}
                        >
                          txt
                        </button>
                      </div>
                    </div>

                    {fsQuery.trim().length >= 2 && (
                      <div className="wechatTree__search" aria-label="搜索结果">
                        <div className="wechatTree__searchTitle">
                          搜索结果 {fsSearchRunning ? '（搜索中…）' : `（${fsSearchResults.length}）`}
                        </div>
                        {fsSearchResults.length === 0 && !fsSearchRunning ? (
                          <div className="wechatFiles__empty">没有匹配的文件。</div>
                        ) : (
                          fsSearchResults
                            .filter((r) => fsKindFilter === 'all' || r.kind === fsKindFilter)
                            .slice(0, 80)
                            .map((r) => {
                              const isActive = !!activeFile && activeFile.root === fsRoot && activeFile.rel === r.rel
                              const isSelected = fsSelectedRel === r.rel
                              return (
                                <div
                                  key={r.rel}
                                  className={`wechatTreeRow ${isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''}`}
                                  style={{ paddingLeft: 10 }}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    setFsSelectedRel(r.rel)
                                    setFsContextMenu({ x: e.clientX, y: e.clientY, rel: r.rel, isDir: false })
                                  }}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/wce-rel', r.rel)
                                    e.dataTransfer.setData('text/wce-isdir', '0')
                                    e.dataTransfer.effectAllowed = 'move'
                                  }}
                                >
                                  <span className="wechatTreeRow__twisty wechatTreeRow__twisty--leaf" aria-hidden="true">
                                    •
                                  </span>
                                  <button type="button" className="wechatTreeRow__label" onClick={() => openDiskFile(r.rel)} title={r.rel}>
                                    <span className="wechatTreeRow__name">
                                      {r.rel}
                                      {isActive && isActiveFileDirty ? <strong className="wechatDirtyDot"> ●</strong> : null}
                                    </span>
                                    <span className="wechatTreeRow__ext">{r.kind}</span>
                                  </button>
                                </div>
                              )
                            })
                        )}
                      </div>
                    )}

                    {(() => {
                      const renderInlineNewRow = (dirRel: string, depth: number) => {
                        if (!fsInlineAction) return null
                        if (fsInlineAction.type !== 'newFile' && fsInlineAction.type !== 'newFolder') return null
                        if (normalizeRelDir(fsInlineAction.targetRel) !== normalizeRelDir(dirRel)) return null
                        return (
                          <div className="wechatTreeRow wechatTreeRow--inline" style={{ paddingLeft: 10 + depth * 14 }}>
                            <span className="wechatTreeRow__twisty wechatTreeRow__twisty--leaf" aria-hidden="true">
                              ＋
                            </span>
                            <span className="wechatTreeRow__label" style={{ width: '100%' }}>
                              <input
                                ref={fsInlineInputRef}
                                className="wechatTreeInlineInput"
                                placeholder={fsInlineAction.type === 'newFolder' ? '新建文件夹名' : '新建文件名（.md/.html/.txt）'}
                                defaultValue=""
                                onKeyDown={async (e) => {
                                  if (e.key === 'Escape') {
                                    e.preventDefault()
                                    setFsInlineAction(null)
                                  }
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const v = (e.currentTarget.value || '').trim()
                                    if (!v) return
                                    await handleFilesNewInDirInline(
                                      dirRel,
                                      fsInlineAction.type === 'newFolder' ? 'folder' : 'file',
                                      v,
                                    )
                                    setFsInlineAction(null)
                                  }
                                }}
                              />
                            </span>
                          </div>
                        )
                      }

                      const renderDir = (dirRel: string, depth: number) => {
                        const entries = (fsDirCache[dirRel] ?? []).filter((e) => {
                          if (e.isDir) return true
                          if (fsKindFilter === 'all') return e.kind === 'md' || e.kind === 'html' || e.kind === 'txt'
                          return e.kind === fsKindFilter
                        })

                        const inlineNewRow = renderInlineNewRow(dirRel, depth)

                        return (
                          <div className="wechatTree__group" key={dirRel}>
                            {inlineNewRow}
                            {entries.map((e) => {
                              const isDir = e.isDir
                              const isOpen = isDir && fsExpanded.has(e.relPath)
                              const isActive = !!activeFile && activeFile.root === fsRoot && activeFile.rel === e.relPath
                              const isSelected = fsSelectedRel === e.relPath
                              const isRenaming = fsInlineAction?.type === 'rename' && normalizeRelDir(fsInlineAction.targetRel) === normalizeRelDir(e.relPath)
                              return (
                                <React.Fragment key={e.relPath}>
                                  <div
                                    className={`wechatTreeRow ${isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''} ${isRenaming ? 'wechatTreeRow--inline' : ''}`}
                                    style={{ paddingLeft: 10 + depth * 14 }}
                                    onContextMenu={(ev) => {
                                      ev.preventDefault()
                                      setFsSelectedRel(e.relPath)
                                      setFsContextMenu({ x: ev.clientX, y: ev.clientY, rel: e.relPath, isDir })
                                    }}
                                    draggable={e.relPath !== ''}
                                    onDragStart={(ev) => {
                                      if (!e.relPath) return
                                      ev.dataTransfer.setData('text/wce-rel', e.relPath)
                                      ev.dataTransfer.setData('text/wce-isdir', isDir ? '1' : '0')
                                      ev.dataTransfer.effectAllowed = 'move'
                                    }}
                                    onDragOver={(ev) => {
                                      if (!isDir) return
                                      ev.preventDefault()
                                    }}
                                    onDrop={async (ev) => {
                                      if (!isDir) return
                                      ev.preventDefault()
                                      const fromRel = ev.dataTransfer.getData('text/wce-rel')
                                      const fromIsDir = ev.dataTransfer.getData('text/wce-isdir') === '1'
                                      if (!fromRel) return
                                      if (fromIsDir && isRelDescendantOrSame(fromRel, e.relPath)) return
                                      await handleFilesMovePath(fromRel, e.relPath)
                                    }}
                                  >
                                    {isDir ? (
                                      <button
                                        type="button"
                                        className="wechatTreeRow__twisty"
                                        onClick={() => toggleDir(e.relPath)}
                                        title={isOpen ? '折叠' : '展开'}
                                      >
                                        {isOpen ? '▾' : '▸'}
                                      </button>
                                    ) : (
                                      <span className="wechatTreeRow__twisty wechatTreeRow__twisty--leaf" aria-hidden="true">
                                        •
                                      </span>
                                    )}

                                    {isRenaming ? (
                                      <span className="wechatTreeRow__label" style={{ width: '100%' }}>
                                        <input
                                          ref={fsInlineInputRef}
                                          className="wechatTreeInlineInput"
                                          defaultValue={fsInlineAction?.initialName || e.name}
                                          onKeyDown={async (ev) => {
                                            if (ev.key === 'Escape') {
                                              ev.preventDefault()
                                              setFsInlineAction(null)
                                            }
                                            if (ev.key === 'Enter') {
                                              ev.preventDefault()
                                              const v = (ev.currentTarget.value || '').trim()
                                              if (!v) return
                                              await handleFilesRenamePathInline(e.relPath, v)
                                              setFsInlineAction(null)
                                            }
                                          }}
                                        />
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="wechatTreeRow__label"
                                        onClick={() => {
                                          setFsSelectedRel(e.relPath)
                                          if (isDir) toggleDir(e.relPath)
                                          else openDiskFile(e.relPath)
                                        }}
                                        title={e.relPath}
                                      >
                                        <span className="wechatTreeRow__name">{e.name}</span>
                                        {!isDir && (
                                          <span className="wechatTreeRow__ext">
                                            {e.kind}
                                            {isActive && isActiveFileDirty ? <strong className="wechatDirtyDot"> ●</strong> : null}
                                          </span>
                                        )}
                                      </button>
                                    )}

                                    {!isRenaming && (
                                      <div className="wechatTreeRow__actions" aria-label="文件操作">
                                        <button
                                          type="button"
                                          className="wechatMiniBtn"
                                          onClick={() => setFsInlineAction({ type: 'rename', targetRel: e.relPath, initialName: e.name })}
                                          title="F2"
                                        >
                                          重命名
                                        </button>
                                        <button type="button" className="wechatMiniBtn" onClick={() => handleFilesDeletePath(e.relPath)}>
                                          删除
                                        </button>
                                        {isDir && (
                                          <>
                                            <button
                                              type="button"
                                              className="wechatMiniBtn"
                                              onClick={() => {
                                                setFsExpanded((prev) => new Set(prev).add(e.relPath))
                                                setFsInlineAction({ type: 'newFile', targetRel: e.relPath })
                                              }}
                                              title="在此文件夹新建文件"
                                            >
                                              ＋F
                                            </button>
                                            <button
                                              type="button"
                                              className="wechatMiniBtn"
                                              onClick={() => {
                                                setFsExpanded((prev) => new Set(prev).add(e.relPath))
                                                setFsInlineAction({ type: 'newFolder', targetRel: e.relPath })
                                              }}
                                              title="在此文件夹新建文件夹"
                                            >
                                              ＋D
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {isDir && isOpen && renderDir(e.relPath, depth + 1)}
                                </React.Fragment>
                              )
                            })}
                          </div>
                        )
                      }

                      // Root
                      return (
                        <>
                          <div
                            className={`wechatTreeRow wechatTreeRow--root ${fsSelectedRel === '' ? 'is-selected' : ''}`}
                            style={{ paddingLeft: 10 }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setFsSelectedRel('')
                              setFsContextMenu({ x: e.clientX, y: e.clientY, rel: '', isDir: true })
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                            }}
                            onDrop={async (e) => {
                              e.preventDefault()
                              const fromRel = e.dataTransfer.getData('text/wce-rel')
                              const fromIsDir = e.dataTransfer.getData('text/wce-isdir') === '1'
                              if (!fromRel) return
                              if (fromIsDir && isRelDescendantOrSame(fromRel, '')) return
                              await handleFilesMovePath(fromRel, '')
                            }}
                          >
                            <button
                              type="button"
                              className="wechatTreeRow__twisty"
                              onClick={async () => {
                                await toggleDir('')
                              }}
                              title={fsExpanded.has('') ? '折叠' : '展开'}
                            >
                              {fsExpanded.has('') ? '▾' : '▸'}
                            </button>
                            <button type="button" className="wechatTreeRow__label" onClick={async () => ensureDirLoaded('')}>
                              <span className="wechatTreeRow__name">（根目录）</span>
                              {fsLoading && <span className="wechatTreeRow__ext">读取中…</span>}
                            </button>
                            <div className="wechatTreeRow__actions" aria-label="根目录操作">
                              <button
                                type="button"
                                className="wechatMiniBtn"
                                onClick={() => {
                                  setFsExpanded((prev) => new Set(prev).add(''))
                                  setFsInlineAction({ type: 'newFile', targetRel: '' })
                                }}
                              >
                                ＋F
                              </button>
                              <button
                                type="button"
                                className="wechatMiniBtn"
                                onClick={() => {
                                  setFsExpanded((prev) => new Set(prev).add(''))
                                  setFsInlineAction({ type: 'newFolder', targetRel: '' })
                                }}
                              >
                                ＋D
                              </button>
                            </div>
                          </div>
                          {fsExpanded.has('') && renderDir('', 1)}
                        </>
                      )
                    })()}

                    {fsContextMenu && (
                      <div className="wechatCtxMenu__backdrop" onMouseDown={() => closeFsContextMenu()}>
                        <div
                          className="wechatCtxMenu"
                          style={{ left: fsContextMenu.x, top: fsContextMenu.y }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="wechatCtxMenu__item"
                            onClick={() => {
                              const rel = fsContextMenu.rel
                              const isDir = fsContextMenu.isDir
                              closeFsContextMenu()
                              if (isDir) toggleDir(rel)
                              else openDiskFile(rel)
                            }}
                          >
                            {fsContextMenu.isDir ? '展开/折叠' : '打开'}
                          </button>

                          <button
                            type="button"
                            className="wechatCtxMenu__item"
                            onClick={() => {
                              const rel = fsContextMenu.rel
                              const dir = fsContextMenu.isDir ? rel : relDirOf(rel)
                              closeFsContextMenu()
                              setFsExpanded((prev) => new Set(prev).add(dir))
                              setFsInlineAction({ type: 'newFile', targetRel: dir })
                            }}
                          >
                            新建文件
                          </button>

                          <button
                            type="button"
                            className="wechatCtxMenu__item"
                            onClick={() => {
                              const rel = fsContextMenu.rel
                              const dir = fsContextMenu.isDir ? rel : relDirOf(rel)
                              closeFsContextMenu()
                              setFsExpanded((prev) => new Set(prev).add(dir))
                              setFsInlineAction({ type: 'newFolder', targetRel: dir })
                            }}
                          >
                            新建文件夹
                          </button>

                          {fsContextMenu.rel ? (
                            <>
                              <button
                                type="button"
                                className="wechatCtxMenu__item"
                                onClick={() => {
                                  const rel = fsContextMenu.rel
                                  closeFsContextMenu()
                                  setFsInlineAction({ type: 'rename', targetRel: rel, initialName: relBaseName(rel) })
                                }}
                              >
                                重命名（F2）
                              </button>

                              <button
                                type="button"
                                className="wechatCtxMenu__item wechatCtxMenu__item--danger"
                                onClick={async () => {
                                  const rel = fsContextMenu.rel
                                  closeFsContextMenu()
                                  await handleFilesDeletePath(rel)
                                }}
                              >
                                删除
                              </button>
                            </>
                          ) : null}

                          <div className="wechatCtxMenu__sep" />

                          <button
                            type="button"
                            className="wechatCtxMenu__item"
                            onClick={async () => {
                              const rel = fsContextMenu.rel
                              closeFsContextMenu()
                              await copyToClipboard(rel)
                            }}
                          >
                            复制相对路径
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </aside>

        <section className="wechatPanel">
          {editorFormat === 'rich' && (
            <div className="wechatToolbar">
            <ToolbarButton
              label="加粗"
              active={!!editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              B
            </ToolbarButton>
            <ToolbarButton
              label="斜体"
              active={!!editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              I
            </ToolbarButton>
            <ToolbarButton
              label="下划线"
              active={!!editor?.isActive('underline')}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              U
            </ToolbarButton>
            <ToolbarButton
              label="删除线"
              active={!!editor?.isActive('strike')}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              S
            </ToolbarButton>

            <div className="tbColor" title="文字颜色">
              <input
                className="tbColor__picker"
                type="color"
                value={textColorHex}
                onChange={(e) => {
                  const next = e.target.value
                  setTextColorHex(next)
                  setTextColorInput(next)
                  applyTextColor(next)
                }}
              />
              <input
                className="tbColor__input"
                value={textColorInput}
                placeholder="#RRGGBB"
                onChange={(e) => setTextColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyTextColor(textColorInput)
                  }
                }}
                onBlur={() => {
                  const hex = normalizeColorToHex(textColorInput)
                  if (hex) {
                    setTextColorHex(hex)
                    setTextColorInput(hex)
                    applyTextColor(hex)
                  }
                }}
              />
              <ToolbarButton label="清除文字颜色" onClick={() => editor?.chain().focus().unsetColor().run()}>
                清色
              </ToolbarButton>
            </div>

            {renderTextColorPalette((c) => applyTextColor(c))}

            <div className="sep" />

            <ToolbarButton
              label="H1"
              active={!!editor?.isActive('heading', { level: 1 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              label="H2"
              active={!!editor?.isActive('heading', { level: 2 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              label="H3"
              active={!!editor?.isActive('heading', { level: 3 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              H3
            </ToolbarButton>

            <div className="sep" />

            <ToolbarButton
              label="无序列表"
              active={!!editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              • 列表
            </ToolbarButton>
            <ToolbarButton
              label="有序列表"
              active={!!editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              1. 列表
            </ToolbarButton>
            <ToolbarButton
              label="引用"
              active={!!editor?.isActive('blockquote')}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              “引用”
            </ToolbarButton>
            <ToolbarButton label="分割线" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
              —
            </ToolbarButton>

            <div className="sep" />

            <ToolbarButton
              label="左对齐"
              active={!!editor?.isActive({ textAlign: 'left' })}
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            >
              左
            </ToolbarButton>
            <ToolbarButton
              label="居中"
              active={!!editor?.isActive({ textAlign: 'center' })}
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            >
              中
            </ToolbarButton>
            <ToolbarButton
              label="右对齐"
              active={!!editor?.isActive({ textAlign: 'right' })}
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            >
              右
            </ToolbarButton>

            <div className="sep" />

            <ToolbarButton label="链接" active={!!editor?.isActive('link')} onClick={handleSetLink}>
              链接
            </ToolbarButton>
            <ToolbarButton label="图片 URL" onClick={handleInsertImageByUrl}>
              图URL
            </ToolbarButton>
            <ToolbarButton label="本地图片" onClick={handlePickLocalImage}>
              上传
            </ToolbarButton>

            <select
              className="tbSelect"
              value={imageStyle}
              onChange={(e) => applySelectedImageStyle(e.target.value as ImageStyleId)}
              title="图片样式（先选中图片）"
              aria-label="图片样式"
            >
              {IMAGE_STYLE_OPTIONS.map((o) => (
                <option key={o.id || 'default'} value={o.id}>
                  图片：{o.label}
                </option>
              ))}
            </select>
            <ToolbarButton label="清除图片样式" onClick={() => applySelectedImageStyle('')}>
              清样式
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLocalImageChange}
            />

            <div className="sep" />

            <ToolbarButton label="撤销" onClick={() => editor?.chain().focus().undo().run()}>
              撤销
            </ToolbarButton>
            <ToolbarButton label="重做" onClick={() => editor?.chain().focus().redo().run()}>
              重做
            </ToolbarButton>
            <ToolbarButton
              label="清除格式"
              onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
            >
              清格式
            </ToolbarButton>
            </div>
          )}

          {editorFormat === 'markdown' && (
            <div className="wechatToolbar">
              <div className="tbColor" title="文字颜色（Markdown 源码：会插入 HTML span）">
                <input
                  className="tbColor__picker"
                  type="color"
                  value={textColorHex}
                  onChange={(e) => {
                    const next = e.target.value
                    setTextColorHex(next)
                    setTextColorInput(next)
                    applyMarkdownTextColor(next)
                  }}
                />
                <input
                  className="tbColor__input"
                  value={textColorInput}
                  placeholder="#RRGGBB"
                  onChange={(e) => setTextColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      applyMarkdownTextColor(textColorInput)
                    }
                  }}
                  onBlur={() => {
                    const hex = normalizeColorToHex(textColorInput)
                    if (hex) {
                      setTextColorHex(hex)
                      setTextColorInput(hex)
                      applyMarkdownTextColor(hex)
                    }
                  }}
                />
                <ToolbarButton label="清除文字颜色（移除 span）" onClick={clearMarkdownTextColor}>
                  清色
                </ToolbarButton>
              </div>

              {renderTextColorPalette((c) => applyMarkdownTextColor(c))}
            </div>
          )}

          <div className="wechatPanelBody">
            <div className="wechatEditorWrap" ref={editorScrollRef}>
              {editorFormat === 'markdown' ? (
                <textarea
                  className="wechatMarkdownEditor"
                  ref={markdownScrollRef}
                  value={markdownText}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  onClick={(e) => {
                    const idx = (e.currentTarget as HTMLTextAreaElement).selectionStart ?? 0
                    handleMarkdownCursorProbe(idx)
                  }}
                  onKeyUp={(e) => {
                    const key = e.key
                    if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight') return
                    const idx = (e.currentTarget as HTMLTextAreaElement).selectionStart ?? 0
                    handleMarkdownCursorProbe(idx)
                  }}
                  placeholder={'# 标题\n\n在这里用 Markdown 写作…\n\n也可以直接写 HTML（会原样渲染）。'}
                />
              ) : editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="loading">加载编辑器…</div>
              )}
            </div>
          </div>

          <div className="wechatHint">
            {editorFormat === 'markdown'
              ? 'Markdown 模式：支持标准 Markdown + 直接写 HTML。切回富文本会用转换后的内容覆盖编辑器。'
              : '建议工作流：写作 → 套模板 → 右侧预览 → “复制完整 HTML” → 粘到公众号后台。'}
          </div>
        </section>

        <aside className="wechatPreview">
          <div className="phone">
            <div className="phone__top">公众号预览</div>
            <div className="phone__screen" ref={previewScrollRef}>
              <div className="wechatPreviewScope">
                <style>{previewScopedCss}</style>
                <article className="wechat-article" data-theme={theme}>
                  <div
                    onClick={(e) => {
                      if (editorFormat !== 'markdown') return
                      const target = e.target as HTMLElement | null
                      if (!target) return
                      const el = target.closest?.('[data-wce-component], blockquote.callout, blockquote.card, h2.titlebar') as
                        | HTMLElement
                        | null
                      if (!el) return

                      // In Markdown mode, editing is driven by the source HTML block.
                      // If current Markdown doesn't preserve component HTML, prompt user to switch to rich or re-insert.
                      const wce = el.getAttribute('data-wce-component')
                      if (!wce) {
                        flash('Markdown 模式：该内容不是组件 HTML（可能已转换为普通引用）。建议切回富文本后重新插入组件。')
                        return
                      }

                      const rawProps = el.getAttribute('data-wce-props') ?? ''
                      const idx = rawProps ? markdownText.indexOf(`data-wce-props=\"${rawProps}\"`) : -1
                      if (idx >= 0) {
                        handleMarkdownCursorProbe(idx)
                      } else {
                        flash('Markdown 模式：请在左侧源码中把光标放到该组件 HTML 块内，再点「属性」编辑')
                        setLibraryTab('props')
                      }
                    }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </article>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {isImportOpen && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal__title">导入 HTML</div>
            <div className="modal__desc">
              粘贴一段 HTML（建议只粘贴正文部分）。导入后会覆盖当前内容。
            </div>
            <textarea
              className="modal__textarea"
              value={importHtml}
              onChange={(e) => setImportHtml(e.target.value)}
              placeholder="<h2>标题</h2><p>正文…</p>"
            />
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setIsImportOpen(false)}>
                取消
              </button>
              <button className="btn" onClick={handleApplyImport}>
                覆盖导入
              </button>
            </div>
          </div>
        </div>
      )}

      {isThemeImportOpen && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal__title">导入自定义主题（JSON）</div>
            <div className="modal__desc">
              支持 vars（CSS 变量）和 extraCss（可选追加 CSS）。导入后会出现在主题下拉框里。
            </div>
            <textarea
              className="modal__textarea"
              value={themeImportText}
              onChange={(e) => setThemeImportText(e.target.value)}
            />
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setIsThemeImportOpen(false)}>
                取消
              </button>
              <button className="btn" onClick={handleApplyThemeImport}>
                导入主题
              </button>
            </div>
          </div>
        </div>
      )}

      {isThemeCssImportOpen && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal__title">导入自定义主题（CSS）</div>
            <div className="modal__desc">
              自动提取 `--wechat-*` 变量作为主题变量，其余 CSS 会作为额外样式保存。
            </div>
            <input
              className="modal__input"
              value={themeCssName}
              onChange={(e) => setThemeCssName(e.target.value)}
              placeholder="主题名称"
            />
            <textarea
              className="modal__textarea"
              value={themeCssText}
              onChange={(e) => setThemeCssText(e.target.value)}
            />
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setIsThemeCssImportOpen(false)}>
                取消
              </button>
              <button className="btn" onClick={handleApplyThemeCssImport}>
                导入主题
              </button>
            </div>
          </div>
        </div>
      )}

      {isComponentConfigOpen && componentConfigTarget && getComponentSchema(componentConfigTarget) && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal__title">
              {getComponentSchema(componentConfigTarget)!.title ?? `插入组件：${componentConfigTarget.name}`}
            </div>
            <div className="modal__desc">
              {getComponentSchema(componentConfigTarget)!.desc ?? '调整参数后点击“插入”。参数会自动记住下次使用。'}
            </div>

            {getComponentSchema(componentConfigTarget)!.fields.map((f) => (
              <label key={f.key} className="modal__field">
                <div className="modal__label">{f.label}</div>
                {f.type === 'select' ? (
                  <select
                    className="modal__input"
                    value={componentConfigValues[f.key] ?? ''}
                    onChange={(e) =>
                      setComponentConfigValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  >
                    {(f.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'color' ? (
                  <input
                    className="modal__input"
                    type="color"
                    value={componentConfigValues[f.key] ?? f.default ?? '#000000'}
                    onChange={(e) =>
                      setComponentConfigValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                ) : f.type === 'textarea' ? (
                  <textarea
                    className="modal__textarea"
                    value={componentConfigValues[f.key] ?? ''}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setComponentConfigValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                ) : (
                  <input
                    className="modal__input"
                    value={componentConfigValues[f.key] ?? ''}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setComponentConfigValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                )}
              </label>
            ))}

            <div className="modal__actions">
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setIsComponentConfigOpen(false)
                  setComponentConfigTargetId(null)
                  setComponentConfigValues({})
                }}
              >
                取消
              </button>
              <button className="btn" onClick={handleConfirmInsertConfiguredComponent}>
                插入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToolbarButton(props: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`tb ${props.active ? 'tb--active' : ''}`}
      onClick={props.onClick}
      title={props.label}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('read file failed'))
    reader.readAsDataURL(file)
  })
}
