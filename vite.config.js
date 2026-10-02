import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { config as loadEnv } from 'dotenv'
loadEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server) {

      server.middlewares.use('/api/session', (_req, res) => {
        if (!process.env.OPENAI_API_KEY) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'OPENAI_API_KEY not set' }))
          return
        }
        // Return a fake ek_ token — the real key is used server-side in /api/realtime.
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ client_secret: { value: 'ek_local_dev' } }))
      })

      // Proxy the WebRTC SDP exchange (GA API /v1/realtime/calls).
      // New SDK sends raw SDP as body with Content-Type: application/sdp.
      server.middlewares.use('/api/realtime', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = Buffer.concat(chunks)
          const contentType = req.headers['content-type'] || 'application/sdp'

          // Forward query params (e.g. ?model=gpt-realtime-2.1) to OpenAI
          const qs = req.url?.split('?')[1] || ''
          const openaiUrl = `https://api.openai.com/v1/realtime/calls${qs ? '?' + qs : ''}`
          const response = await fetch(openaiUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': contentType,
              'Content-Length': String(body.length),
            },
            body,
          })
          const text = await response.text()
          console.log('[/api/realtime] OpenAI status:', response.status, response.ok ? '(ok)' : '| ' + text.slice(0, 200))
          res.statusCode = response.status
          res.setHeader('Content-Type', response.headers.get('content-type') || 'application/sdp')
          res.setHeader('Access-Control-Allow-Origin', '*')
          // Forward Location header — SDK uses it to extract the callId
          const location = response.headers.get('location')
          if (location) res.setHeader('Location', location)
          res.end(text)
        } catch (err) {
          console.error('[/api/realtime] proxy error:', err)
          res.statusCode = 500
          res.end('proxy error')
        }
      })

      server.middlewares.use('/api/responses', async (req, res) => {
        try {
          const body = await readBody(req)
          const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...body, stream: false }),
          })
          const data = await response.json()
          if (!response.ok) {
            console.error('[/api/responses] OpenAI error:', response.status, JSON.stringify(data).slice(0, 200))
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
            return
          }
          // Extract output_parsed from the structured text output
          let output_parsed = null
          const textOutput = data.output
            ?.find(o => o.type === 'message')
            ?.content?.find(c => c.type === 'output_text')?.text
          if (textOutput) {
            try { output_parsed = JSON.parse(textOutput) } catch {}
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ...data, output_parsed }))
        } catch (err) {
          console.error('[/api/responses] proxy error:', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'failed' }))
        }
      })

      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ status: 'ok' }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
