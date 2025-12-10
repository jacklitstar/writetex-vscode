export interface OcrRequestBody {
  imageBase64: string
  mimeType?: string
  clientId?: string
  token?: string
}

export interface OcrResponseBody {
  ok: boolean
  result?: string
  error?: string
  inserted?: boolean
  location?: { file: string; line: number; column: number }
}

export interface WriteTexSettings {
  port: number
  serviceName: string
  requireToken: boolean
  token: string
  apiEndpoint: string
  apiModel: string
  apiKey: string
}

export type OcrHandler = (body: OcrRequestBody) => Promise<OcrResponseBody>

export interface ServerController {
  stop: () => Promise<void>
}

