import * as http from 'http';
import * as vscode from 'vscode';
import { ServerController, WriteTexSettings } from './types';
import { transformRequest, ProxyRequest } from './proxy';
import { callOpenAI, OpenAIStreamChunk } from './openai';
import { insertOrClipboard } from './insert';
import { getContextSummary } from './context';

function parseJson(body: string): any {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/**
 * Handles OpenAI-compatible chat completions requests
 */
async function handleChatCompletion(
  context: vscode.ExtensionContext,
  settings: WriteTexSettings,
  proxyReq: ProxyRequest,
  res: http.ServerResponse
): Promise<void> {
  // Transform request with context injection
  const openaiReq = transformRequest(proxyReq, settings);

  // Stream the response
  if (openaiReq.stream) {
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    let accumulated = '';

    try {
      // Call OpenAI with custom streaming handler
      const baseUrl = settings.apiEndpoint.endsWith('/') ? settings.apiEndpoint : settings.apiEndpoint + '/';
      const url = new URL('chat/completions', baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? require('https') : require('http');

      const postData = JSON.stringify(openaiReq);
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${settings.apiKey}`
        }
      };

      const proxyReq = httpModule.request(options, (apiRes: http.IncomingMessage) => {
        if (apiRes.statusCode !== 200) {
          let errorBody = '';
          apiRes.on('data', chunk => { errorBody += chunk; });
          apiRes.on('end', () => {
            res.write(`data: ${JSON.stringify({ error: { message: `API Error ${apiRes.statusCode}`, details: errorBody } })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          });
          return;
        }

        // Forward streaming response to client and accumulate
        apiRes.on('data', (chunk: Buffer) => {
          const chunkStr = chunk.toString();
          res.write(chunk); // Pass through to client

          // Parse and accumulate content
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
              try {
                const json: OpenAIStreamChunk = JSON.parse(trimmed.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  accumulated += content;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        });

        apiRes.on('end', () => {
          res.end();

          // Insert accumulated text at cursor
          if (accumulated.trim()) {
            const summary = getContextSummary();
            if (summary) {
              insertOrClipboard(accumulated.trim(), summary).catch(err => {
                console.error('Failed to insert text:', err);
              });
            }
          }
        });
      });

      proxyReq.on('error', (err: Error) => {
        res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      });

      proxyReq.write(postData);
      proxyReq.end();

    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    // Non-streaming response
    try {
      const text = await callOpenAI(settings.apiEndpoint, settings.apiKey, openaiReq);

      // Insert at cursor
      const summary = getContextSummary();
      if (summary && text.trim()) {
        await insertOrClipboard(text.trim(), summary);
      }

      // Return OpenAI-compatible response
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        id: 'chatcmpl-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: openaiReq.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      }));
    } catch (err: any) {
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        error: {
          message: err.message,
          type: 'server_error',
          code: 'internal_error'
        }
      }));
    }
  }
}

export function startServer(context: vscode.ExtensionContext, settings: WriteTexSettings, port: number): { server: http.Server, controller: ServerController } {
  const maxSize = 10 * 1024 * 1024;

  const server = http.createServer(async (req, res) => {
    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'WriteTex OpenAI Proxy', port }));
      return;
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.writeHead(204);
      res.end();
      return;
    }

    // OpenAI-compatible endpoint
    if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/chat/completions')) {
      let raw = '';
      let size = 0;

      req.on('data', chunk => {
        size += chunk.length;
        if (size > maxSize) {
          req.destroy();
        } else {
          raw += chunk;
        }
      });

      req.on('end', async () => {
        const json = parseJson(raw);
        if (!json || !json.messages) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Invalid request: messages required' } }));
          return;
        }

        // Token authentication (hard-coded)
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace(/^Bearer\s+/i, '');
        if (!token || token !== 'writetex') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Unauthorized' } }));
          return;
        }

        await handleChatCompletion(context, settings, json as ProxyRequest, res);
      });
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not found' } }));
  });

  server.listen(port, '0.0.0.0');

  const controller: ServerController = {
    stop: async () => new Promise(resolve => server.close(() => resolve()))
  };

  return { server, controller };
}
