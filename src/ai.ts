import * as vscode from 'vscode'
import { ContextSummary } from './context'
import { WriteTexSettings } from './types'
import { callOpenAI } from './openai'

function buildInstructionMessage(): string {
  const marker = '<<<User Cursor Here>>>'
  return `You are an OCR expert for LaTeX/TikZ/Markdown. Return ONLY the exact code necessary for the detected content. No commentary, no explanations, no prose no code blocks. Prefer formatting consistent with the provided editor context. Do not include preamble/packages. The surrounding context includes a marker line '${marker}' indicating the target insertion location.`
}

function buildContextMessage(ctx: ContextSummary): string {
  return `File: ${ctx.file}\nLanguage: ${ctx.languageId}\nMode hint: ${ctx.mode}\nSurrounding context:\n--------------------\n${ctx.surroundingText}\n\nTask: Extract the math/diagram content from the attached image and output ONLY the raw LaTeX/TikZ/Markdown code suitable for ${ctx.mode}. If TikZ content is detected, output ONLY the body unless the context indicates the absence of a tikzpicture wrapper. If math, choose inline $...$ vs display \\[...\\] consistent with context.`
}

export async function performOcr(context: vscode.ExtensionContext, imageBase64: string, mimeType: string | undefined, summary: ContextSummary, settings: WriteTexSettings): Promise<string> {
  // Ensure base64 has data URI prefix
  const base64WithPrefix = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:${mimeType || 'image/png'};base64,${imageBase64}`

  const instruction = buildInstructionMessage()
  const ctxMsg = buildContextMessage(summary)

  const messages = [
    {
      role: 'system' as const,
      content: instruction
    },
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: ctxMsg },
        { type: 'image_url' as const, image_url: { url: base64WithPrefix } }
      ]
    }
  ]

  const text = await callOpenAI(settings.apiEndpoint, settings.apiKey, {
    model: settings.apiModel,
    messages,
    stream: true,
    max_tokens: 2000
  })

  return text.trim()
}

