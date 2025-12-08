// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { startServer } from './server';
import { advertise, MdnsHandle } from './mdns';
import { getContextSummary } from './context';
import { performOcr } from './ai';
import { insertOrClipboard } from './insert';
import { WriteTexSettings } from './types';

let controller: { stop: () => Promise<void> } | null = null
let mdns: MdnsHandle | null = null
let statusItem: vscode.StatusBarItem | null = null
const SUPPORTED_LANGS = ['latex', 'tex', 'markdown', 'rmarkdown', 'quarto']

function updateStatusBar() {
  if (!statusItem) return
  const ed = vscode.window.activeTextEditor
  const ok = ed && SUPPORTED_LANGS.includes(ed.document.languageId)
  if (ok) {
    statusItem.text = 'WriteTex'
    statusItem.command = 'writetex.showCommands'
    statusItem.show()
  } else {
    statusItem.hide()
  }
}

function getSettings(): WriteTexSettings {
  const cfg = vscode.workspace.getConfiguration('writetex')
  return {
    port: cfg.get<number>('port', 53421),
    serviceName: cfg.get<string>('serviceName', 'WriteTex OCR'),
    requireToken: cfg.get<boolean>('requireToken', false),
    token: cfg.get<string>('token', ''),
    modelId: cfg.get<string>('modelId', 'copilot-gpt-4o')
  }
}

async function start(context: vscode.ExtensionContext) {
  const settings = getSettings()
  if (controller) return
  if (!statusItem) {
    statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right)
    statusItem.text = 'WriteTex'
    statusItem.command = 'writetex.showCommands'
  } else {
    statusItem.text = 'WriteTex'
    statusItem.command = 'writetex.showCommands'
  }
  try {
    const [model] = await vscode.lm.selectChatModels({ id: settings.modelId })
    if (!model) {
      vscode.window.showWarningMessage('No Copilot model available. Please check Copilot and try again.')
    }
  } catch (err) {
    // consent/auth may prompt; errors are handled at request time as well
  }
  const handler = async (body: { imageBase64: string, mimeType?: string, clientId?: string }) => {
    try {
      const summary = getContextSummary() || { file: 'unspecified', languageId: 'plain', surroundingText: '', mode: 'plain' }
      const text = await performOcr(context, body.imageBase64, body.mimeType, summary as any, settings)
      if (!text) {
        return { ok: false, error: 'Empty OCR result' }
      }
      const inserted = await insertOrClipboard(text, summary as any)
      return { ok: true, result: text, inserted: inserted.inserted, location: inserted.location }
    } catch (err: any) {
      if (err instanceof vscode.LanguageModelError) {
        vscode.window.showWarningMessage('Copilot access not granted or blocked. Use "WriteTex: Grant Copilot Access".')
        return { ok: false, error: err.message }
      }
      return { ok: false, error: err?.message || 'OCR failed' }
    }
  }
  const srv = startServer(context, settings, handler)
  controller = srv.controller
  mdns = advertise(settings.serviceName, settings.port, settings.requireToken)
  updateStatusBar()
}

async function stop() {
  if (controller) { await controller.stop(); controller = null }
  if (mdns) { await mdns.stop(); mdns = null }
  if (statusItem) statusItem.hide()
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    start(context)
    const startCmd = vscode.commands.registerCommand('writetex.startServer', () => start(context))
    const stopCmd = vscode.commands.registerCommand('writetex.stopServer', () => stop())
    const grantCmd = vscode.commands.registerCommand('writetex.grantCopilotAccess', async () => {
      const settings = getSettings()
      try {
        const [model] = await vscode.lm.selectChatModels({ id: settings.modelId })
        if (!model) {
          vscode.window.showWarningMessage('No Copilot model available.')
        } else {
          vscode.window.showInformationMessage('Copilot access granted.')
        }
      } catch (err: any) {
        vscode.window.showWarningMessage(err?.message || 'Copilot access could not be granted.')
      }
    })
    const showCmd = vscode.commands.registerCommand('writetex.showCommands', async () => {
      const picks = [
        { label: 'Start OCR Server', value: 'writetex.startServer' },
        { label: 'Stop OCR Server', value: 'writetex.stopServer' },
        //{ label: 'Grant Copilot Access', value: 'writetex.grantCopilotAccess' }
      ]
      const sel = await vscode.window.showQuickPick(picks, { placeHolder: 'WriteTex actions' })
      if (sel?.value) {
        await vscode.commands.executeCommand(sel.value)
      }
    })
    if (statusItem) context.subscriptions.push(statusItem)
    context.subscriptions.push(startCmd, stopCmd, grantCmd, showCmd)
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar()))
}

// This method is called when your extension is deactivated
export function deactivate() { return stop() }
