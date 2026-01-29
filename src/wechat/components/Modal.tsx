import { useEffect } from 'react'
import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title: ReactNode
  desc?: ReactNode
  children: ReactNode
  actions?: ReactNode

  onClose?: () => void
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
}

export function Modal({
  open,
  title,
  desc,
  children,
  actions,
  onClose,
  closeOnBackdrop = true,
  closeOnEsc = true,
}: Props) {
  if (!open) return null

  // NOTE: Avoid closing on Esc if no handler is provided.
  useEffect(() => {
    if (!open) return
    if (!onClose) return
    if (!closeOnEsc) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, closeOnEsc])

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (!onClose) return
        if (!closeOnBackdrop) return
        if (e.target !== e.currentTarget) return
        onClose()
      }}
    >
      <div className="modal">
        <div className="modal__title">{title}</div>
        {desc != null && <div className="modal__desc">{desc}</div>}
        {children}
        {actions != null && <div className="modal__actions">{actions}</div>}
      </div>
    </div>
  )
}
