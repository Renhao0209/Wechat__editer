export {}

type UpdaterStatus =
  | { type: 'checking' }
  | { type: 'available'; info: { version?: string } & Record<string, unknown> }
  | { type: 'none'; info?: Record<string, unknown> }
  | { type: 'progress'; progress: { percent?: number } & Record<string, unknown> }
  | { type: 'downloaded'; info?: Record<string, unknown> }
  | { type: 'error'; message: string }

declare global {
  interface Window {
    desktop?: {
      electronVersion: () => string
      appVersion: () => Promise<string>
      updater: {
        check: () => Promise<{ ok: boolean; reason?: string; error?: string }>
        download: () => Promise<{ ok: boolean; reason?: string; error?: string }>
        install: () => Promise<{ ok: boolean; reason?: string; error?: string }>
        onStatus: (callback: (payload: UpdaterStatus) => void) => () => void
      }
    }
  }
}
