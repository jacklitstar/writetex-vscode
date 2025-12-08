import * as http from 'http'
import * as vscode from 'vscode'
import { OcrRequestBody, OcrResponseBody, OcrHandler, ServerController, WriteTexSettings } from './types'

function parseJson(body: string): any {
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

export function startServer(context: vscode.ExtensionContext, settings: WriteTexSettings, handler: OcrHandler): { server: http.Server, controller: ServerController } {
  const maxSize = 10 * 1024 * 1024
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200)
      res.end(JSON.stringify({ ok: true, service: 'WriteTex OCR', port: settings.port }))
      return
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.writeHead(204)
      res.end()
      return
    }
    if (req.method !== 'POST' || req.url !== '/ocr') {
      res.writeHead(404)
      res.end(JSON.stringify({ ok: false, error: 'Not found' }))
      return
    }
    let raw = ''
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > maxSize) {
        req.destroy()
      } else {
        raw += chunk
      }
    })
    req.on('end', async () => {
      const json = parseJson(raw)
      if (!json || typeof json.imageBase64 !== 'string') {
        res.writeHead(400)
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON or missing imageBase64' }))
        return
      }
      if (settings.requireToken) {
        if (!json.token || json.token !== settings.token) {
          res.writeHead(401)
          res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }))
          return
        }
      }
      const body: OcrRequestBody = {
        imageBase64: json.imageBase64,
        mimeType: typeof json.mimeType === 'string' ? json.mimeType : undefined,
        clientId: typeof json.clientId === 'string' ? json.clientId : undefined,
        token: typeof json.token === 'string' ? json.token : undefined
      }
      try {
        const result = await handler(body)
        res.writeHead(200)
        res.end(JSON.stringify(result))
      } catch (e) {
        res.writeHead(500)
        res.end(JSON.stringify({ ok: false, error: 'Internal error' }))
      }
    })
  })
  server.listen(settings.port, '0.0.0.0')
  const controller: ServerController = {
    stop: async () => new Promise(resolve => server.close(() => resolve()))
  }
  return { server, controller }
}

