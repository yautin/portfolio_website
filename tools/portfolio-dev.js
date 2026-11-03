import { loadEnv } from 'vite'

// Run the same handler locally as Vercel uses. This plugin is dev-only;
// neither the server handler nor its environment is imported by browser code.
export function portfolioDevApi(mode) {
  return {
    name: 'portfolio-dev-api',
    apply: 'serve',
    async configureServer(server) {
      const env = loadEnv(mode, process.cwd(), 'PORTFOLIO_')
      for (const key of ['PORTFOLIO_PASSWORD', 'PORTFOLIO_SESSION_SECRET', 'PORTFOLIO_ASSET_DIR']) {
        if (env[key] !== undefined) process.env[key] = env[key]
      }
      const { default: handler } = await import('../api/medical-portfolio.js')
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/api/medical-portfolio') return next()
        Promise.resolve(handler(request, response)).catch(next)
      })
    },
  }
}
