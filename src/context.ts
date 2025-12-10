import * as vscode from 'vscode'

export type ModeHint = 'latex-inline' | 'latex-display' | 'tikz-body' | 'markdown-inline' | 'markdown-display' | 'plain'

export interface ContextSummary {
  file: string
  languageId: string
  surroundingText: string
}

function getSurrounding(editor: vscode.TextEditor): string {
  const cfg = vscode.workspace.getConfiguration('writetex')
  const lineRadius = cfg.get<number>('contextLineRadius', 100)
  const maxChars = cfg.get<number>('contextCharLimit', 4000)
  const marker = '<<<User Cursor Here>>>'

  const doc = editor.document
  const pos = editor.selection.active
  const startLine = Math.max(0, pos.line - lineRadius)
  const endLine = Math.min(doc.lineCount - 1, pos.line + lineRadius)

  const before = doc.getText(new vscode.Range(startLine, 0, pos.line, pos.character))
  const after = doc.getText(new vscode.Range(pos.line, pos.character, endLine, doc.lineAt(endLine).text.length))
  const combined = before + '\n' + marker + '\n' + after
  if (combined.length <= maxChars) return combined

  const half = Math.floor(maxChars / 2)
  const b = before.slice(-half)
  const a = after.slice(0, half)
  return b + '\n' + marker + '\n' + a
}




export function getContextSummary(): ContextSummary | null {
  const editor = vscode.window.activeTextEditor
  if (!editor) return null
  const languageId = editor.document.languageId
  const file = editor.document.fileName.split(/[\\/]/).pop() || editor.document.fileName
  const surroundingText = getSurrounding(editor)
  return { file, languageId, surroundingText }
}
