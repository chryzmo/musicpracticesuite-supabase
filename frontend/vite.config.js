import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const startupMessage = {
  name: 'startup-message',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      console.log('\n  \x1b[32m➜\x1b[0m  Open app: \x1b[36mhttp://localhost:5173\x1b[0m\n')
    })
  },
}

export default defineConfig({
  plugins: [react(), startupMessage],
  server: {
    port: 5173,
    host: true,
  },
})
