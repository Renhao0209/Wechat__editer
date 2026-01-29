import { Modal } from './Modal'

type Props = {
  open: boolean
  text: string
  setText: (next: string) => void
  onCancel: () => void
  onConfirmImport: () => void
}

export function ThemeJsonImportDialog({ open, text, setText, onCancel, onConfirmImport }: Props) {
  return (
    <Modal
      open={open}
      title="导入自定义主题（JSON）"
      onClose={onCancel}
      desc="支持 vars（CSS 变量）和 extraCss（可选追加 CSS）。导入后会出现在主题下拉框里。"
      actions={
        <>
          <button className="btn btn--ghost" onClick={onCancel}>
            取消
          </button>
          <button className="btn" onClick={onConfirmImport}>
            导入主题
          </button>
        </>
      }
    >
      <textarea className="modal__textarea" value={text} onChange={(e) => setText(e.target.value)} />
    </Modal>
  )
}
