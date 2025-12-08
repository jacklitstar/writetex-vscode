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
    statusItem.text = 'WriteTex: Starting'
    statusItem.show()
  } else {
    statusItem.text = 'WriteTex: Starting'
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
      return { ok: false, error: err?.message || 'OCR failed' }
    }
  }
  const srv = startServer(context, settings, handler)
  controller = srv.controller
  mdns = advertise(settings.serviceName, settings.port, settings.requireToken)
  if (statusItem) statusItem.text = 'WriteTex: Running'
}

async function stop() {
  if (controller) { await controller.stop(); controller = null }
  if (mdns) { await mdns.stop(); mdns = null }
  if (statusItem) statusItem.text = 'WriteTex: Stopped'
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const startCmd = vscode.commands.registerCommand('writetex.startServer', () => start(context))
    const stopCmd = vscode.commands.registerCommand('writetex.stopServer', () => stop())
    if (statusItem) context.subscriptions.push(statusItem)
    context.subscriptions.push(startCmd, stopCmd)
}

// This method is called when your extension is deactivated
export function deactivate() { return stop() }
