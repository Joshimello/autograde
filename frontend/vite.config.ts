import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const allowedHosts = process.env.VITE_ALLOWED_HOSTS
  ?.split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  preview: {
    allowedHosts,
  },
})

export default config
