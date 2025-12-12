import * as vscode from 'vscode';
import { getI18n } from './i18n';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _serverRunning = false;
  private _onServerStatusChange?: (running: boolean) => void;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _startServerCallback: () => Promise<void>,
    private readonly _stopServerCallback: () => Promise<void>
  ) { }

  public setServerStatus(running: boolean) {
    this._serverRunning = running;
    this._updateWebview();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    try {
      this._view = webviewView;

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri]
      };

      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

      // Handle messages from the webview
      webviewView.webview.onDidReceiveMessage(async (data) => {
        try {
          switch (data.type) {
            case 'saveSettings':
              await this._saveSettings(data.settings);
              break;
            case 'startServer':
              await this._startServerCallback();
              this.setServerStatus(true);
              break;
            case 'stopServer':
              await this._stopServerCallback();
              this.setServerStatus(false);
              break;
            case 'getSettings':
              this._updateWebview();
              break;
            case 'openExternal':
              vscode.env.openExternal(vscode.Uri.parse(data.url));
              break;
          }
        } catch (error: any) {
          console.error('Error handling webview message:', error);
          vscode.window.showErrorMessage(`WriteTex sidebar error: ${error.message}`);
        }
      });

      // Send initial data
      this._updateWebview();
    } catch (error: any) {
      console.error('Error resolving webview view:', error);
    }
  }

  private async _saveSettings(settings: any) {
    const config = vscode.workspace.getConfiguration('writetex');
    const i18n = getI18n();

    try {
      await config.update('apiEndpoint', settings.apiEndpoint, vscode.ConfigurationTarget.Global);
      await config.update('apiModel', settings.apiModel, vscode.ConfigurationTarget.Global);
      await config.update('apiKey', settings.apiKey, vscode.ConfigurationTarget.Global);
      await config.update('contextLineRadius', parseInt(settings.contextLineRadius), vscode.ConfigurationTarget.Global);
      await config.update('contextCharLimit', parseInt(settings.contextCharLimit), vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage(i18n.t().actions.saveSuccess);
      this._updateWebview();
    } catch (error: any) {
      vscode.window.showErrorMessage(i18n.format(i18n.t().actions.saveFailed, error.message));
    }
  }

  private _updateWebview() {
    if (this._view) {
      const config = vscode.workspace.getConfiguration('writetex');
      const i18n = getI18n();
      this._view.webview.postMessage({
        type: 'updateSettings',
        settings: {
          apiEndpoint: config.get<string>('apiEndpoint', 'https://api.openai.com/v1'),
          apiModel: config.get<string>('apiModel', 'gpt-4o'),
          apiKey: config.get<string>('apiKey', ''),
          contextLineRadius: config.get<number>('contextLineRadius', 20),
          contextCharLimit: config.get<number>('contextCharLimit', 2000),
        },
        serverRunning: this._serverRunning,
        translations: i18n.t()
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WriteTex Settings</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 16px;
    }
    
    h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--vscode-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 8px;
    }
    
    .section {
      margin-bottom: 24px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }
    
    input[type="text"],
    input[type="number"],
    input[type="password"] {
      width: 100%;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
    }
    
    input:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }
    
    .hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    
    button {
      padding: 6px 14px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: var(--vscode-font-family);
      width: 100%;
      margin-bottom: 8px;
    }
    
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    button:active {
      transform: translateY(1px);
    }
    
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    
    .server-controls {
      margin-top: 8px;
    }
    
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      margin-bottom: 12px;
      font-size: 13px;
    }
    
    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .status-indicator.running {
      background: #4CAF50;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
    }
    
    .status-indicator.stopped {
      background: #cc3939ff;
    }
    
    .divider {
      height: 1px;
      background: var(--vscode-panel-border);
      margin: 20px 0;
    }
    
    .link-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 20px;
    }
   
    .external-link {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 0;
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
      cursor: pointer;
      font-size: 11px;
    }
    
    .external-link:hover {
      text-decoration: underline;
    }
    
    .link-text {
      font-size: 11px;
    }
    
    .help-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    
    .help-title {
      font-size: 11px;
      font-weight: 500;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="section">
    <h2>Server Control</h2>
    <div class="status">
      <span class="status-indicator" id="statusIndicator"></span>
      <span id="statusText">Checking...</span>
    </div>
    <div class="server-controls">
      <button id="startBtn">Start Server</button>
      <button id="stopBtn" class="secondary">Stop Server</button>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <h2>AI API Configuration</h2>
    <div class="form-group">
      <label for="apiEndpoint">API Endpoint</label>
      <input type="text" id="apiEndpoint" placeholder="https://api.openai.com/v1" />
      <div class="hint">Base URL for OpenAI-compatible API</div>
    </div>
    
    <div class="form-group">
      <label for="apiModel">Model</label>
      <input type="text" id="apiModel" placeholder="gpt-4o" />
      <div class="hint">Vision model for OCR (e.g., gpt-4o)</div>
    </div>
    
    <div class="form-group">
      <label for="apiKey">API Key</label>
      <input type="password" id="apiKey" placeholder="sk-..." />
      <div class="hint">Stored in plain text in settings.json</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <h2>Context Settings</h2>
    <div class="form-group">
      <label for="contextLineRadius">Context Line Radius</label>
      <input type="number" id="contextLineRadius" min="0" max="100" />
      <div class="hint">Lines of context before/after cursor</div>
    </div>
    
    <div class="form-group">
      <label for="contextCharLimit">Context Char Limit</label>
      <input type="number" id="contextCharLimit" min="100" max="10000" />
      <div class="hint">Maximum characters of context</div>
    </div>
  </div>

  <button id="saveBtn">Save Settings</button>

  <div class="help-section">
    <div class="help-title">Help & Feedback</div>
    <div class="link-list">
      <a href="#" id="viewSourceLink" class="external-link">
        <span class="link-text">View Source</span>
      </a>
      <a href="#" id="documentationLink" class="external-link">
        <span class="link-text">Documentation</span>
      </a>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    // Get references to elements
    const apiEndpointInput = document.getElementById('apiEndpoint');
    const apiModelInput = document.getElementById('apiModel');
    const apiKeyInput = document.getElementById('apiKey');
    const contextLineRadiusInput = document.getElementById('contextLineRadius');
    const contextCharLimitInput = document.getElementById('contextCharLimit');
    const saveBtn = document.getElementById('saveBtn');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    // Handle messages from the extension
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'updateSettings') {
        const settings = message.settings;
        const t = message.translations;
        
        // Update form values
        apiEndpointInput.value = settings.apiEndpoint || '';
        apiModelInput.value = settings.apiModel || '';
        apiKeyInput.value = settings.apiKey || '';
        contextLineRadiusInput.value = settings.contextLineRadius || 20;
        contextCharLimitInput.value = settings.contextCharLimit || 2000;
        
        // Update UI text
        if (t) {
          document.querySelector('.section h2').textContent = t.serverControl.title;
          statusText.textContent = message.serverRunning ? t.serverControl.statusRunning : t.serverControl.statusStopped;
          startBtn.textContent = t.serverControl.startButton;
          stopBtn.textContent = t.serverControl.stopButton;
          document.querySelectorAll('.section h2')[1].textContent = t.apiConfig.title;
          document.querySelectorAll('label')[0].textContent = t.apiConfig.endpoint;
          document.querySelectorAll('.hint')[0].textContent = t.apiConfig.endpointHint;
          document.querySelectorAll('label')[1].textContent = t.apiConfig.model;
          document.querySelectorAll('.hint')[1].textContent = t.apiConfig.modelHint;
          document.querySelectorAll('label')[2].textContent = t.apiConfig.apiKey;
          document.querySelectorAll('.hint')[2].textContent = t.apiConfig.apiKeyHint;
          document.querySelectorAll('.section h2')[2].textContent = t.contextSettings.title;
          document.querySelectorAll('label')[3].textContent = t.contextSettings.lineRadius;
          document.querySelectorAll('.hint')[3].textContent = t.contextSettings.lineRadiusHint;
          document.querySelectorAll('label')[4].textContent = t.contextSettings.charLimit;
          document.querySelectorAll('.hint')[4].textContent = t.contextSettings.charLimitHint;
          saveBtn.textContent = t.actions.saveButton;
          document.querySelector('.help-title').textContent = t.helpFeedback.title;
          document.getElementById('viewSourceLink').querySelector('.link-text').textContent = t.helpFeedback.viewSource;
          document.getElementById('documentationLink').querySelector('.link-text').textContent = t.helpFeedback.documentation;
        }
        
        // Update server status
        const running = message.serverRunning;
        statusIndicator.className = 'status-indicator ' + (running ? 'running' : 'stopped');
        startBtn.disabled = running;
        stopBtn.disabled = !running;
      }
    });
    
    // Save settings
    saveBtn.addEventListener('click', () => {
      vscode.postMessage({
        type: 'saveSettings',
        settings: {
          apiEndpoint: apiEndpointInput.value,
          apiModel: apiModelInput.value,
          apiKey: apiKeyInput.value,
          contextLineRadius: contextLineRadiusInput.value,
          contextCharLimit: contextCharLimitInput.value
        }
      });
    });
    
    // Start server
    startBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'startServer' });
    });
    
    // Stop server
    stopBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'stopServer' });
    });
    
    // External links
    document.getElementById('viewSourceLink').addEventListener('click', (e) => {
      e.preventDefault();
      vscode.postMessage({ type: 'openExternal', url: 'https://github.com/jacklitstar/writetex-vscode' });
    });
    
    document.getElementById('documentationLink').addEventListener('click', (e) => {
      e.preventDefault();
      vscode.postMessage({ type: 'openExternal', url: 'https://www.writetex.com/docs/vscode.html' });
    });
    
    // Request initial settings
    vscode.postMessage({ type: 'getSettings' });
  </script>
</body>
</html>`;
  }
}
