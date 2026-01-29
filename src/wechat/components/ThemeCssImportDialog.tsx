import { Modal } from './Modal'

type Props = {
  open: boolean
  name: string
  setName: (next: string) => void
  cssText: string
  setCssText: (next: string) => void
  onCancel: () => void
  onConfirmImport: () => void
}

export function ThemeCssImportDialog({
  open,
  name,
  setName,
  cssText,
  setCssText,
  onCancel,
  onConfirmImport,
}: Props) {
  return (
    <Modal
      open={open}
      title="导入自定义主题（CSS）"
      onClose={onCancel}
      desc={
        <>
          自动提取 <code>--wechat-*</code> 变量作为主题变量，其余 CSS 会作为额外样式保存。
        </>
      }
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
      <input
        className="modal__input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="主题名称"
      />
      <textarea className="modal__textarea" value={cssText} onChange={(e) => setCssText(e.target.value)} />
    </Modal>
  )
}
