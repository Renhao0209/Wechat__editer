import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
    export default defineConfig(({ command }) => ({
      // Electron loads production via file://, so assets must be relative.
      base: command === 'build' ? './' : '/',
      plugins: [react()],
    }))
