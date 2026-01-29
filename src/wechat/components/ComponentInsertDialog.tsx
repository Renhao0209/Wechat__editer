import type { ComponentConfigSchema, ComponentItem } from '../library/types'
import { Modal } from './Modal'

type Props = {
  open: boolean
  component: ComponentItem
  schema: ComponentConfigSchema
  values: Record<string, string>
  setValues: (updater: (prev: Record<string, string>) => Record<string, string>) => void
  onCancel: () => void
  onConfirmInsert: () => void
}

export function ComponentInsertDialog({
  open,
  component,
  schema,
  values,
  setValues,
  onCancel,
  onConfirmInsert,
}: Props) {
  const title = schema.title ?? `插入组件：${component.name}`
  const desc = schema.desc ?? '调整参数后点击“插入”。参数会自动记住下次使用。'

  return (
    <Modal
      open={open}
      title={title}
      desc={desc}
      onClose={onCancel}
      actions={
        <>
          <button className="btn btn--ghost" onClick={onCancel}>
            取消
          </button>
          <button className="btn" onClick={onConfirmInsert}>
            插入
          </button>
        </>
      }
    >
        {schema.fields.map((f) => (
          <label key={f.key} className="modal__field">
            <div className="modal__label">{f.label}</div>

            {f.type === 'select' ? (
              <select
                className="modal__input"
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
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
                value={values[f.key] ?? f.default ?? '#000000'}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            ) : f.type === 'textarea' ? (
              <textarea
                className="modal__textarea"
                value={values[f.key] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            ) : (
              <input
                className="modal__input"
                value={values[f.key] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            )}
          </label>
        ))}
    </Modal>
  )
}
