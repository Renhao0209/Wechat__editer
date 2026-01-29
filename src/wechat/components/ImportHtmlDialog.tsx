import { Modal } from './Modal'

type Props = {
  open: boolean
  html: string
  setHtml: (next: string) => void
  onCancel: () => void
  onConfirmImport: () => void
}

export function ImportHtmlDialog({ open, html, setHtml, onCancel, onConfirmImport }: Props) {
  return (
    <Modal
      open={open}
      title="导入 HTML"
      onClose={onCancel}
      desc="粘贴一段 HTML（建议只粘贴正文部分）。导入后会覆盖当前内容。"
      actions={
        <>
          <button className="btn btn--ghost" onClick={onCancel}>
            取消
          </button>
          <button className="btn" onClick={onConfirmImport}>
            覆盖导入
          </button>
        </>
      }
    >
      <textarea
        className="modal__textarea"
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        placeholder="<h2>标题</h2><p>正文…</p>"
      />
    </Modal>
  )
}
