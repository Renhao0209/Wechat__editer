import type { ComponentConfigField, ComponentConfigSchema, ComponentItem } from '../library/types'

type Props = {
  selected: boolean
  component: ComponentItem | null
  schema: ComponentConfigSchema | null
  values: Record<string, string>
  onChange: (next: Record<string, string>) => void

  onRefreshFromCursor: () => void
  onApply: () => void
  onResetDefaults: () => void
  onCopyStyleToSame: () => void

  flash?: (msg: string) => void
}

const isSwitchOn = (raw: string): boolean => {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

const isVisible = (field: ComponentConfigField, values: Record<string, string>): boolean => {
  if (!field.visibleWhen) return true
  return (values[field.visibleWhen.key] ?? '') === (field.visibleWhen.equals ?? '')
}

const isDisabled = (field: ComponentConfigField, values: Record<string, string>): boolean => {
  if (!field.disabledWhen) return false
  return (values[field.disabledWhen.key] ?? '') === (field.disabledWhen.equals ?? '')
}

export function ComponentPropsPanel({
  selected,
  component,
  schema,
  values,
  onChange,
  onRefreshFromCursor,
  onApply,
  onResetDefaults,
  onCopyStyleToSame,
}: Props) {
  return (
    <div className="wechatLibrary__panel" role="tabpanel">
      <div className="wechatProps__title">组件属性</div>
      <div className="wechatProps__hint">先在正文里点选一个组件块（例如提示框/卡片/标题条），这里就能调整参数并应用。</div>

      <button type="button" className="wechatPrimaryAction" onClick={onRefreshFromCursor}>
        从光标读取（刷新）
      </button>

      {!selected ? (
        <div className="wechatLibrary__empty">未选中可编辑组件</div>
      ) : !component || !schema ? (
        <div className="wechatLibrary__empty">该组件暂不支持属性编辑</div>
      ) : (
        <>
          <div className="wechatProps__meta">
            <div className="wechatProps__name">{component.name}</div>
            <div className="wechatProps__id">{component.id}</div>
          </div>

          {schema.fields.map((f) => {
            if (!isVisible(f, values)) return null

            const disabled = isDisabled(f, values)
            const value = values[f.key] ?? f.default ?? ''

            return (
              <label key={f.key} className="wechatProps__field">
                <div className="wechatProps__label">{f.label}</div>

                {f.type === 'select' ? (
                  <select
                    className="wechatProps__input"
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
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
                    value={value || '#000000'}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
                  />
                ) : f.type === 'switch' ? (
                  <div className="wechatProps__switch">
                    <input
                      type="checkbox"
                      checked={isSwitchOn(value)}
                      disabled={disabled}
                      onChange={(e) => onChange({ ...values, [f.key]: e.target.checked ? '1' : '0' })}
                    />
                    <span className="wechatProps__switchLabel">{isSwitchOn(value) ? '开启' : '关闭'}</span>
                  </div>
                ) : f.type === 'range' ? (
                  <input
                    className="wechatProps__input"
                    type="range"
                    value={value}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
                  />
                ) : f.type === 'number' ? (
                  <input
                    className="wechatProps__input"
                    type="number"
                    value={value}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    disabled={disabled}
                    placeholder={f.placeholder}
                    onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
                  />
                ) : f.type === 'textarea' ? (
                  <textarea
                    className="wechatProps__textarea"
                    value={value}
                    placeholder={f.placeholder}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
                  />
                ) : (
                  <input
                    className="wechatProps__input"
                    value={value}
                    placeholder={f.placeholder}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
                  />
                )}
              </label>
            )
          })}

          <div className="wechatProps__actions">
            <button type="button" className="wechatPrimaryAction" onClick={onApply}>
              应用到当前组件
            </button>

            <div className="wechatProps__actionsRow">
              <button type="button" className="wechatSecondaryAction" onClick={onResetDefaults}>
                重置默认
              </button>
              <button type="button" className="wechatSecondaryAction" onClick={onCopyStyleToSame}>
                复制样式到同类
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
