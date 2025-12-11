import * as https from 'https';
import * as http from 'http';

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: 'text' | 'image_url', text?: string, image_url?: { url: string } }>;
}

export interface OpenAIRequest {
    model: string;
    messages: OpenAIMessage[];
    stream: boolean;
    max_tokens?: number;
}

export interface OpenAIStreamChunk {
    choices?: Array<{
        delta?: {
            content?: string;
        };
        finish_reason?: string | null;
    }>;
}

/**
 * Call OpenAI-compatible chat completions API with streaming support
 * @param endpoint - Base URL of the API (e.g., https://api.openai.com/v1)
 * @param apiKey - API key for authentication
 * @param request - OpenAI request body
 * @returns Accumulated text response
 */
export async function callOpenAI(endpoint: string, apiKey: string, request: OpenAIRequest): Promise<string> {
    if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key is required. Please configure writetex.apiKey in settings.');
    }

    // Ensure endpoint ends with a slash for proper path joining
    const baseUrl = endpoint.endsWith('/') ? endpoint : endpoint + '/';
    const url = new URL('chat/completions', baseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(request);
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': `Bearer ${apiKey}`
            }
        };

        const req = httpModule.request(options, (res) => {
            let accumulated = '';

            if (res.statusCode !== 200) {
                let errorBody = '';
                res.on('data', chunk => { errorBody += chunk; });
                res.on('end', () => {
                    try {
                        const errorJson = JSON.parse(errorBody);
                        reject(new Error(`API Error (${res.statusCode}): ${errorJson.error?.message || errorBody}`));
                    } catch {
                        reject(new Error(`API Error (${res.statusCode}): ${errorBody}`));
                    }
                });
                return;
            }

            let buffer = '';
            res.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') {
                        continue;
                    }
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const json: OpenAIStreamChunk = JSON.parse(trimmed.slice(6));
                            const content = json.choices?.[0]?.delta?.content;
                            if (content) {
                                accumulated += content;
                            }
                        } catch (err) {
                            // Ignore malformed chunks
                        }
                    }
                }
            });

            res.on('end', () => {
                resolve(accumulated);
            });
        });

        req.on('error', (err) => {
            reject(new Error(`Network error: ${err.message}`));
        });

        req.write(postData);
        req.end();
    });
}
