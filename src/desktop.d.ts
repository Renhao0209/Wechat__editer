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

      fs: {
        pickFolder: () => Promise<{ ok: boolean; canceled?: boolean; root?: string; error?: string }>
        listDir: (params: {
          root: string
          rel?: string
        }) => Promise<{
          ok: boolean
          entries?: Array<{ name: string; relPath: string; isDir: boolean; kind: 'dir' | 'md' | 'html' | 'txt' | 'other' }>
          error?: string
        }>
        readTextFile: (params: { root: string; rel: string }) => Promise<{ ok: boolean; content?: string; error?: string }>
        writeTextFile: (params: { root: string; rel: string; content: string }) => Promise<{ ok: boolean; error?: string }>
        saveAs: (params: { root: string; suggestedName: string; content: string }) => Promise<{ ok: boolean; canceled?: boolean; rel?: string; error?: string }>
        rename: (params: { root: string; fromRel: string; toRel: string }) => Promise<{ ok: boolean; error?: string }>
        deleteFile: (params: { root: string; rel: string }) => Promise<{ ok: boolean; error?: string }>
        mkdir: (params: { root: string; rel: string }) => Promise<{ ok: boolean; error?: string }>
        movePath: (params: { root: string; fromRel: string; toRel: string }) => Promise<{ ok: boolean; error?: string }>
        deletePath: (params: { root: string; rel: string }) => Promise<{ ok: boolean; deletedType?: 'file' | 'dir'; error?: string }>
      }
    }
  }
}
