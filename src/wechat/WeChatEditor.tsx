import React, { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
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
import type { ComponentCategory } from './library/types'
import { LAYOUT_PRESETS } from './library/layoutPresets'
import { TEMPLATES } from './library/templates'
import { buildInlinedWeChatArticleHtml } from './inlineWeChat'
import { BlockquoteWithClass } from './extensions/blockquoteWithClass'
import { ParagraphWithClass } from './extensions/paragraphWithClass'
import { HeadingWithClass } from './extensions/headingWithClass'
import { ScrollBox } from './extensions/scrollBox'
import './wechatEditor.css'

const STORAGE_KEY = 'wechatedit:html'
const STORAGE_THEME_KEY = 'wechatedit:theme'
const STORAGE_CUSTOM_THEMES_KEY = 'wechatedit:customThemes'
const STORAGE_VIEW_KEY = 'wechatedit:view'

type ViewMode = 'split' | 'edit' | 'preview'

type ComponentUiCategory = Exclude<ComponentCategory, '分隔'>

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
    // Prefer rich clipboard so pasting keeps formatting.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ClipboardItemAny = (window as any).ClipboardItem as
      | (new (items: Record<string, Blob>) => ClipboardItem)
      | undefined

    if (ClipboardItemAny && navigator.clipboard.write) {
      const item = new ClipboardItemAny({
        'text/html': new Blob([params.html], { type: 'text/html' }),
        'text/plain': new Blob([params.plainText ?? htmlToPlainText(params.html)], {
          type: 'text/plain',
        }),
      })
      await navigator.clipboard.write([item])
      return true
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

  const [isThemeImportOpen, setIsThemeImportOpen] = useState(false)
  const [themeImportText, setThemeImportText] = useState('')

  const [isThemeCssImportOpen, setIsThemeCssImportOpen] = useState(false)
  const [themeCssName, setThemeCssName] = useState('')
  const [themeCssText, setThemeCssText] = useState('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const moreMenuRef = useRef<HTMLDetailsElement | null>(null)

  const initialHtml = useMemo(() => {
    const saved = safeReadLocalStorage(STORAGE_KEY)
    return saved && saved.trim().length > 0 ? saved : DEFAULT_CONTENT
  }, [])

  const [currentHtml, setCurrentHtml] = useState<string>(initialHtml)

  const [libraryTab, setLibraryTab] = useState<'components' | 'layouts'>('components')

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

  const filteredComponents = useMemo(() => {
    const q = componentQuery.trim().toLowerCase()
    return COMPONENTS.filter((c) => {
      if (componentCategory !== 'all' && toUiCategory(c.category) !== componentCategory) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        (c.desc ? c.desc.toLowerCase().includes(q) : false) ||
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
      }),
      HeadingWithClass.configure({ levels: [1, 2, 3] }),
      ParagraphWithClass,
      BlockquoteWithClass,
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
      Image.configure({
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
    },
    onUpdate: ({ editor: next }) => {
      const html = next.getHTML()
      safeWriteLocalStorage(STORAGE_KEY, html)
      setCurrentHtml(html)
    },
  })

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_VIEW_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_CUSTOM_THEMES_KEY, JSON.stringify(customThemes))
  }, [customThemes])

  const selectedCustomTheme = useMemo(() => {
    if (!theme.startsWith('custom:')) return undefined
    const id = theme.slice('custom:'.length)
    return customThemes.find((t) => t.id === id)
  }, [customThemes, theme])

  const previewHtml = currentHtml

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

  function closeMoreMenu() {
    if (moreMenuRef.current) moreMenuRef.current.open = false
  }

  async function handleCopyFullHtml() {
    const ok = await copyToClipboard(exportFullHtml)
    flash(ok ? '已复制：完整 HTML（含 style）' : '复制失败：请手动导出')
  }

  async function handleCopyBodyHtml() {
    const ok = await copyToClipboard(exportBodyHtml)
    flash(ok ? '已复制：文章 HTML（不含 style）' : '复制失败：请手动导出')
  }

  async function handleCopyRich() {
    const ok = await copyHtmlToClipboard({ html: exportClipboardHtml })
    flash(ok ? '已复制：富文本（可直接粘贴）' : '复制失败：可能被浏览器限制')
  }

  async function handleCopyInlinedHtml() {
    const ok = await copyHtmlToClipboard({ html: exportInlinedArticleHtml })
    flash(ok ? '已复制：内联 HTML（更稳）' : '复制失败：可能被浏览器限制')
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
    if (c.content) {
      editor.chain().focus().insertContent(c.content).run()
    } else if (c.html) {
      editor.chain().focus().insertContent(c.html).run()
    }
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
      <header className="wechatTopbar">
        <div className="wechatTopbar__left">
          <div className="wechatBrand">
            <div className="wechatBrand__title">公众号编辑器（MVP）</div>
            <div className="wechatBrand__meta">字数：{charCount}</div>
          </div>

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

        <div className="wechatTopbar__right">
          <button className="btn" onClick={handleCopyRich}>
            复制富文本
          </button>
          <button className="btn btn--ghost" onClick={handleCopyInlinedHtml}>
            复制内联HTML
          </button>
          <details className="menu" ref={moreMenuRef}>
            <summary className="btn btn--ghost" aria-label="更多操作">
              更多
            </summary>
            <div className="menu__panel" role="menu">
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
      </header>

      <main className={`wechatMain wechatMain--${viewMode}`}>
        <section className="wechatPanel">
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

          <div className="wechatPanelBody">
            <div className="wechatEditorWrap">
              {editor ? <EditorContent editor={editor} /> : <div className="loading">加载编辑器…</div>}
            </div>

            <aside className="wechatLibrary" aria-label="素材库">
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
                    (componentCategory === 'all'
                      ? COMPONENT_CATEGORY_ORDER
                      : [componentCategory]
                    ).map((cat) => {
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
                                <div className="wechatCardBtn__title">{c.name}</div>
                                {c.desc && <div className="wechatCardBtn__desc">{c.desc}</div>}
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
            </aside>
          </div>

          <div className="wechatHint">
            建议工作流：写作 → 套模板 → 右侧预览 → “复制完整 HTML” → 粘到公众号后台。
          </div>
        </section>

        <aside className="wechatPreview">
          <div className="phone">
            <div className="phone__top">公众号预览</div>
            <div className="phone__screen">
              <div className="wechatPreviewScope">
                <style>{previewScopedCss}</style>
                <article className="wechat-article" data-theme={theme}>
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
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
    </div>
  )
}

function ToolbarButton(props: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`tb ${props.active ? 'tb--active' : ''}`}
      onClick={props.onClick}
      title={props.label}
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
