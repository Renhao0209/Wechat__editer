import { Modal } from './Modal'

export type TypographySettings = {
  fontSizePx: number
  lineHeight: number
  paragraphSpacingPx: number
  firstLineIndentEm: number
  paragraphAlign: 'left' | 'justify' | 'center' | 'right'
  copyParagraphSpacing: 'wechat' | 'fixed'
}

const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontSizePx: 15,
  lineHeight: 1.8,
  paragraphSpacingPx: 12,
  firstLineIndentEm: 0,
  paragraphAlign: 'left',
  copyParagraphSpacing: 'wechat',
}

type Props = {
  open: boolean
  value: TypographySettings
  onChange: (next: TypographySettings) => void
  onClose: () => void
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const PRESETS: Array<{ id: string; label: string; value: TypographySettings; desc: string }> = [
  {
    id: 'default',
    label: '通用',
    desc: '大多数公众号文章都舒服',
    value: DEFAULT_TYPOGRAPHY,
  },
  {
    id: 'reading',
    label: '阅读',
    desc: '更松弛，适合长文',
    value: {
      ...DEFAULT_TYPOGRAPHY,
      fontSizePx: 16,
      lineHeight: 1.9,
      paragraphSpacingPx: 14,
    },
  },
  {
    id: 'compact',
    label: '紧凑',
    desc: '信息密度更高',
    value: {
      ...DEFAULT_TYPOGRAPHY,
      fontSizePx: 14,
      lineHeight: 1.65,
      paragraphSpacingPx: 8,
    },
  },
  {
    id: 'indent2',
    label: '首行缩进',
    desc: '中文段落更像“文章体”',
    value: {
      ...DEFAULT_TYPOGRAPHY,
      firstLineIndentEm: 2,
      paragraphAlign: 'justify',
    },
  },
]

function isSame(a: TypographySettings, b: TypographySettings): boolean {
  return (
    a.fontSizePx === b.fontSizePx &&
    a.lineHeight === b.lineHeight &&
    a.paragraphSpacingPx === b.paragraphSpacingPx &&
    a.firstLineIndentEm === b.firstLineIndentEm &&
    a.paragraphAlign === b.paragraphAlign &&
    a.copyParagraphSpacing === b.copyParagraphSpacing
  )
}

export function TypographyDialog({ open, value, onChange, onClose }: Props) {
  const activePreset = PRESETS.find((p) => isSame(p.value, value))?.id ?? 'custom'

  const previewStyle: React.CSSProperties = {
    fontSize: `${value.fontSizePx}px`,
    lineHeight: String(value.lineHeight),
    textAlign: value.paragraphAlign,
  }

  const pStyle: React.CSSProperties = {
    margin: `${value.paragraphSpacingPx}px 0`,
    textIndent: `${value.firstLineIndentEm}em`,
  }

  const clamp1 = (n: number) => clamp(n, 12, 20)
  const clampLH = (n: number) => clamp(Number(n.toFixed(2)), 1.2, 2.4)
  const clampSpacing = (n: number) => clamp(n, 0, 32)
  const clampIndent = (n: number) => clamp(n, 0, 2.5)

  return (
    <Modal
      open={open}
      title="排版设置"
      onClose={onClose}
      desc={
        <>
          这些设置会影响右侧预览、导出 HTML，以及“复制到公众号”的内联样式。
          <br />
          如果你希望在公众号后台继续调段距，把“复制到公众号：段落间距”设为“可调”。
        </>
      }
      actions={
        <>
          <button
            className="btn btn--ghost"
            onClick={() => {
              onChange(DEFAULT_TYPOGRAPHY)
            }}
          >
            重置默认
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            关闭
          </button>
        </>
      }
    >
      <div className="typoDialog">
        <div className="typoDialog__group">
          <div className="typoDialog__title">快速预设</div>
          <div className="typoDialog__presetRow" role="tablist" aria-label="排版预设">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={activePreset === p.id}
                className={`typoDialog__preset ${activePreset === p.id ? 'is-active' : ''}`}
                title={p.desc}
                onClick={() => onChange(p.value)}
              >
                <div className="typoDialog__presetLabel">{p.label}</div>
                <div className="typoDialog__presetDesc">{p.desc}</div>
              </button>
            ))}
          </div>
          {activePreset === 'custom' && <div className="typoDialog__hint">当前为自定义组合</div>}
        </div>

        <div className="typoDialog__group">
          <div className="typoDialog__title">正文排版</div>

          <div className="typoDialog__row">
            <div className="typoDialog__rowLabel">字号</div>
            <input
              className="typoDialog__range"
              type="range"
              min={12}
              max={20}
              step={1}
              value={value.fontSizePx}
              onChange={(e) => onChange({ ...value, fontSizePx: clamp1(Number(e.target.value || 0)) })}
            />
            <input
              className="typoDialog__num"
              type="number"
              min={12}
              max={20}
              step={1}
              value={value.fontSizePx}
              onChange={(e) => onChange({ ...value, fontSizePx: clamp1(Number(e.target.value || 0)) })}
            />
            <div className="typoDialog__unit">px</div>
          </div>

          <div className="typoDialog__row">
            <div className="typoDialog__rowLabel">行距</div>
            <input
              className="typoDialog__range"
              type="range"
              min={1.2}
              max={2.4}
              step={0.05}
              value={value.lineHeight}
              onChange={(e) => onChange({ ...value, lineHeight: clampLH(Number(e.target.value || 0)) })}
            />
            <input
              className="typoDialog__num"
              type="number"
              min={1.2}
              max={2.4}
              step={0.05}
              value={value.lineHeight}
              onChange={(e) => onChange({ ...value, lineHeight: clampLH(Number(e.target.value || 0)) })}
            />
            <div className="typoDialog__unit">×</div>
          </div>

          <div className="typoDialog__row">
            <div className="typoDialog__rowLabel">段距</div>
            <input
              className="typoDialog__range"
              type="range"
              min={0}
              max={32}
              step={1}
              value={value.paragraphSpacingPx}
              onChange={(e) => onChange({ ...value, paragraphSpacingPx: clampSpacing(Number(e.target.value || 0)) })}
            />
            <input
              className="typoDialog__num"
              type="number"
              min={0}
              max={32}
              step={1}
              value={value.paragraphSpacingPx}
              onChange={(e) => onChange({ ...value, paragraphSpacingPx: clampSpacing(Number(e.target.value || 0)) })}
            />
            <div className="typoDialog__unit">px</div>
          </div>

          <div className="typoDialog__row">
            <div className="typoDialog__rowLabel">首行缩进</div>
            <input
              className="typoDialog__range"
              type="range"
              min={0}
              max={2.5}
              step={0.5}
              value={value.firstLineIndentEm}
              onChange={(e) => onChange({ ...value, firstLineIndentEm: clampIndent(Number(e.target.value || 0)) })}
            />
            <input
              className="typoDialog__num"
              type="number"
              min={0}
              max={2.5}
              step={0.5}
              value={value.firstLineIndentEm}
              onChange={(e) => onChange({ ...value, firstLineIndentEm: clampIndent(Number(e.target.value || 0)) })}
            />
            <div className="typoDialog__unit">em</div>
          </div>

          <div className="typoDialog__row">
            <div className="typoDialog__rowLabel">对齐</div>
            <div className="wechatSeg" role="group" aria-label="段落对齐">
              {(
                [
                  { id: 'left', label: '左' },
                  { id: 'justify', label: '两端' },
                  { id: 'center', label: '中' },
                  { id: 'right', label: '右' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`wechatSeg__btn ${value.paragraphAlign === opt.id ? 'is-active' : ''}`}
                  aria-pressed={value.paragraphAlign === opt.id}
                  onClick={() => onChange({ ...value, paragraphAlign: opt.id })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="typoDialog__group">
          <div className="typoDialog__title">复制到公众号</div>
          <div className="typoDialog__hint">
            “可调”= 复制时不内联段落 margin，公众号后台还能调段距；“锁定”= 按本设置输出。
          </div>
          <div className="wechatSeg" role="group" aria-label="复制到公众号段距策略">
            <button
              type="button"
              className={`wechatSeg__btn ${value.copyParagraphSpacing === 'wechat' ? 'is-active' : ''}`}
              aria-pressed={value.copyParagraphSpacing === 'wechat'}
              onClick={() => onChange({ ...value, copyParagraphSpacing: 'wechat' })}
            >
              段距可调
            </button>
            <button
              type="button"
              className={`wechatSeg__btn ${value.copyParagraphSpacing === 'fixed' ? 'is-active' : ''}`}
              aria-pressed={value.copyParagraphSpacing === 'fixed'}
              onClick={() => onChange({ ...value, copyParagraphSpacing: 'fixed' })}
            >
              段距锁定
            </button>
          </div>
        </div>

        <div className="typoDialog__group">
          <div className="typoDialog__title">效果预览</div>
          <div className="typoDialog__preview" style={previewStyle}>
            <p style={pStyle}>这是第一段示例文字。你可以用它直观看到字号、行距、段距、首行缩进与对齐方式的变化。</p>
            <p style={pStyle}>这是第二段示例文字。把段距调小会更紧凑；调大更“呼吸感”。首行缩进通常配合两端对齐更像文章排版。</p>
            <p style={{ ...pStyle, textIndent: 0, textAlign: 'center', opacity: 0.7 }}>
              （提示：图片/引用/标题等组件可能有自己的样式，不完全跟随这里）
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
