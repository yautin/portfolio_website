import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { featureFlags } from './src/config/features.js'

// Print which optional features this build will ship, and why any are off.
//
// Every feature here degrades gracefully when unconfigured, which means a
// missing env var looks exactly like a feature switched off on purpose —
// silently, with no diagnostic anywhere. A forgotten VITE_REWARD_TOKEN_ADDRESS
// in Vercel is what removed the Rewards wallet card from production once
// already. This puts the answer in the deploy log.
//
// `loadEnv` rather than bare `process.env`: it reads the .env* files too, so the
// banner is accurate locally (vars come from .env.local) as well as on Vercel
// (vars come from the environment). A plain prebuild script reading process.env
// would report everything OFF on a dev machine and be ignored within a week.
//
// Warn-only, never fatal: all three features are legitimately optional.
function featureBanner(mode) {
  return {
    name: 'feature-banner',
    configResolved() {
      const flags = Object.values(featureFlags(loadEnv(mode, process.cwd(), 'VITE_')))
      const width = Math.max(...flags.map((f) => f.label.length))
      const rule = '─'.repeat(width + 8)
      const off = flags.filter((f) => !f.enabled)

      console.log([
        '',
        `  Feature flags (mode: ${mode})`,
        `  ${rule}`,
        ...flags.flatMap((f) => [
          `  ${f.label.padEnd(width)}  ${f.enabled ? 'ON' : 'OFF'}`,
          ...(f.enabled ? [] : [`  ${' '.repeat(width)}  └ ${f.reason}`]),
        ]),
        `  ${rule}`,
        ...(off.length
          ? ['  Vite inlines env at BUILD time — set the variable(s) above and',
             '  redeploy. Saving them without a rebuild changes nothing.']
          : []),
        '',
      ].join('\n'))
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    featureBanner(mode),
  ],
}))
