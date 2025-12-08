import * as vscode from 'vscode'
import { ContextSummary } from './context'
import { WriteTexSettings } from './types'

async function writeTempImage(context: vscode.ExtensionContext, imageBase64: string, mimeType?: string): Promise<{ uri: vscode.Uri, bytes: Uint8Array, mime: string }> {
  const safe = imageBase64.replace(/^data:[^;]+;base64,/, '')
  const buffer = Buffer.from(safe, 'base64')
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'
  const fileName = `writetex-${Date.now()}.${ext}`
  const dir = vscode.Uri.joinPath(context.storageUri ?? context.globalStorageUri, 'images')
  await vscode.workspace.fs.createDirectory(dir)
  const file = vscode.Uri.joinPath(dir, fileName)
  await vscode.workspace.fs.writeFile(file, buffer)
  return { uri: file, bytes: new Uint8Array(buffer), mime: mimeType || 'image/png' }
}

function buildInstructionMessage(): string {
  const marker = '<<<User Cursor Here>>>'
  return `You are an OCR expert for LaTeX/TikZ/Markdown. Return ONLY the exact code necessary for the detected content. No commentary, no explanations, no prose no code blocks. Prefer formatting consistent with the provided editor context. Do not include preamble/packages. The surrounding context includes a marker line '${marker}' indicating the target insertion location.`
}

function buildContextMessage(ctx: ContextSummary, imageUri: vscode.Uri): string {
  return `File: ${ctx.file}\nLanguage: ${ctx.languageId}\nMode hint: ${ctx.mode}\nSurrounding context:\n--------------------\n${ctx.surroundingText}\n\nTask: Extract the math/diagram content from the attached image and output ONLY the raw LaTeX/TikZ/Markdown code suitable for ${ctx.mode}. If TikZ content is detected, output ONLY the body unless the context indicates the absence of a tikzpicture wrapper. If math, choose inline $...$ vs display \\[...\\] consistent with context.`
}

export async function performOcr(context: vscode.ExtensionContext, imageBase64: string, mimeType: string | undefined, summary: ContextSummary, settings: WriteTexSettings): Promise<string> {
  const image = await writeTempImage(context, imageBase64, mimeType)
  const instruction = buildInstructionMessage()
  const ctxMsg = buildContextMessage(summary, image.uri)
  const [model] = await vscode.lm.selectChatModels({ id: settings.modelId })
  if (!model) {
    throw new Error('No Copilot model available')
  }
  const messages: vscode.LanguageModelChatMessage[] = [
    vscode.LanguageModelChatMessage.User(instruction),
    vscode.LanguageModelChatMessage.User([
      new vscode.LanguageModelTextPart(ctxMsg),
      vscode.LanguageModelDataPart.image(image.bytes, image.mime)
    ])
  ]
  const resp = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token)
  let text = ''
  for await (const chunk of resp.text) {
    text += chunk
  }
  return text.trim()
}
