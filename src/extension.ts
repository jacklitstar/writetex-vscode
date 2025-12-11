// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { startServer } from './server';
import { advertise, MdnsHandle } from './mdns';
import { WriteTexSettings } from './types';
import { SidebarProvider } from './sidebarProvider';
import { initI18n, getI18n } from './i18n';

let controller: { stop: () => Promise<void> } | null = null;
let mdns: MdnsHandle | null = null;
let statusItem: vscode.StatusBarItem | null = null;
let sidebarProvider: SidebarProvider | null = null;
const SUPPORTED_LANGS = ['latex', 'tex', 'markdown', 'rmarkdown', 'quarto', 'ipynb'];

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
  const cfg = vscode.workspace.getConfiguration('writetex');
  return {
    apiEndpoint: cfg.get<string>('apiEndpoint', 'https://api.openai.com/v1'),
    apiModel: cfg.get<string>('apiModel', 'gpt-4o'),
    apiKey: cfg.get<string>('apiKey', '')
  };
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
  // Validate API configuration
  if (!settings.apiKey || settings.apiKey.trim() === '') {
    const i18n = getI18n();
    vscode.window.showWarningMessage(i18n.t().warnings.apiKeyNotConfigured);
  }
  const port = 50905;
  const srv = startServer(context, settings, port);
  controller = srv.controller;
  mdns = advertise(port);
  updateStatusBar();

  // Notify sidebar
  if (sidebarProvider) {
    sidebarProvider.setServerStatus(true);
  }
}

async function stop() {
  if (controller) { await controller.stop(); controller = null; }
  if (mdns) { await mdns.stop(); mdns = null; }
  if (statusItem) { statusItem.hide(); }

  // Notify sidebar
  if (sidebarProvider) {
    sidebarProvider.setServerStatus(false);
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Initialize i18n
  initI18n(context.extensionPath);
  const i18n = getI18n();

  // Register sidebar provider
  sidebarProvider = new SidebarProvider(
    context.extensionUri,
    () => start(context),
    () => stop()
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'writetex.sidebarView',
      sidebarProvider
    )
  );

  start(context);
  const startCmd = vscode.commands.registerCommand('writetex.startServer', () => start(context));
  const stopCmd = vscode.commands.registerCommand('writetex.stopServer', () => stop());
  const showCmd = vscode.commands.registerCommand('writetex.showCommands', async () => {
    const t = i18n.t();
    const picks = [
      { label: t.commands.startServerLabel, value: 'writetex.startServer' },
      { label: t.commands.stopServerLabel, value: 'writetex.stopServer' }
    ];
    const sel = await vscode.window.showQuickPick(picks, { placeHolder: t.commands.actionsPlaceholder });
    if (sel?.value) {
      await vscode.commands.executeCommand(sel.value);
    }
  });
  if (statusItem) context.subscriptions.push(statusItem);
  context.subscriptions.push(startCmd, stopCmd, showCmd);
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar()));
}

// This method is called when your extension is deactivated
export function deactivate() { return stop() }
