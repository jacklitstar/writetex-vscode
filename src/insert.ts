import * as vscode from 'vscode'
import { ContextSummary, ModeHint } from './context'

export interface InsertResult {
  inserted: boolean
  location?: { file: string; line: number; column: number }
}

export async function insertOrClipboard(resultText: string, ctx: ContextSummary): Promise<InsertResult> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    await vscode.env.clipboard.writeText(resultText)
    return { inserted: false }
  }
  const languageId = editor.document.languageId
  const supported = ['latex', 'tex', 'markdown', 'rmarkdown', 'quarto']
  if (!supported.includes(languageId)) {
    await vscode.env.clipboard.writeText(resultText)
    return { inserted: false }
  }
  const toInsert = resultText
  const pos = editor.selection.active
  await editor.edit(edit => edit.insert(pos, toInsert))
  return { inserted: true, location: { file: editor.document.fileName, line: pos.line, column: pos.character } }
}
