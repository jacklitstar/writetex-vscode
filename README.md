# WriteTex for VSCode

[![Version](https://img.shields.io/badge/version-0.0.7-blue.svg)](https://github.com/jacklitstar/writetex-vscode)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

WriteTex is a tablet/ipad app that converts handwritten math to LaTeX. Checkout our [website](https://www.writetex.com) for more information.

This extension allows users to use WriteTex in Visual Studio Code. It seamlessly integrates OpenAI-compatible vision models to help you convert handwritten equations, diagrams, and text into LaTeX, all while maintaining context from your current document, resulting in better OCR accuracy.

## ✨ Features

### 🖼️ AI-Powered OCR
- **Context-Aware Translation**: OCR results consider your document context for more accurate conversions
- **OpenAI-Compatible API**: Works with any OpenAI-compatible vision model (GPT-4o, GPT-4 Vision, etc.)
- **Automatic Insertion**: OCR results are automatically inserted at your cursor position
- **Streaming Support**: Real-time streaming of OCR results

### 🎨 Sidebar Interface
- **Intuitive Settings Panel**: Configure all settings through a sidebar UI
- **Real-Time Server Control**: Start and stop the OCR server with one click
- **Status Indicators**: Visual feedback for server status

### 🔌 Network Discovery
- **mDNS Service Advertisement**: Automatically discoverable on your local network
- **Cross-Platform Support**: Works on Windows, macOS, and Linux
- **Multiple Network Interfaces**: Binds to all available network interfaces

### 🎯 Supported File Types
- LaTeX (`.tex`, `.latex`)
- Typst (`.typ`)
- Markdown (`.md`, `.markdown`)
- R Markdown (`.rmd`)
- Quarto (`.qmd`)
- Jupyter Notebooks (`.ipynb`)

## 📦 Installation

### From VSCode Marketplace
1. Open VSCode
2. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "WriteTex"
4. Click Install

## 🚀 Getting Started

### 1. Configure API Settings

Click the WriteTex icon in the left sidebar to open the settings panel:

- **API Endpoint**: Your OpenAI-compatible API endpoint (default: `https://api.openai.com/v1`)
- **Model**: Vision model to use (e.g., `gpt-4o`, `gpt-4-vision-preview`)
- **API Key**: Your API key for authentication

You can also configure these in VSCode settings:
```json
{
  "writetex.apiEndpoint": "https://api.openai.com/v1",
  "writetex.apiModel": "gpt-4o",
  "writetex.apiKey": "your-api-key-here"
}
```

### 2. Adjust Context Settings (Optional)

- **Context Line Radius**: Number of lines before/after cursor to include (default: `20`)
- **Context Char Limit**: Maximum characters of context (default: `2000`)

### 3. Start the Server

Click the **Start Server** button in the sidebar. The status indicator will turn green when the server is running.

### 4. Use OCR

The WriteTex server runs on `localhost:50905` and is advertised via mDNS as `WriteTex VSCode @ <hostname>`.

Connect your OCR client (mobile app, web app, etc.) to this endpoint and send image data. The OCR results will be automatically inserted at your cursor position in VSCode.

## ⚙️ Configuration

All settings can be configured through the sidebar UI or VSCode settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `writetex.apiEndpoint` | `https://api.openai.com/v1` | OpenAI-compatible API endpoint |
| `writetex.apiModel` | `gpt-4o` | Vision model for OCR |
| `writetex.apiKey` | `""` | API key (⚠️ stored in plaintext) |
| `writetex.contextLineRadius` | `20` | Lines of context around cursor |
| `writetex.contextCharLimit` | `2000` | Maximum context characters |
| `writetex.customPrompt` | `""` | Custom instructions appended to the system prompt |
| `writetex.extraBody` | `{}` | Extra JSON fields merged into every API request |

### Extra request fields

`writetex.extraBody` passes provider-specific options that the settings above don't cover. It is set in `settings.json` (it is not in the sidebar), and the server must be restarted after changing it. `model`, `messages` and `stream` always come from WriteTex; `max_tokens` can be overridden.

For example, to turn off reasoning on a Qwen3-style model served by llama.cpp, vLLM or SGLang, which makes recognition much faster:
```json
{
  "writetex.extraBody": { "chat_template_kwargs": { "enable_thinking": false } }
}
```
On APIs that support it, `{ "reasoning_effort": "low" }` does the same job.

## 🔧 Architecture

```
┌─────────────────┐
│   OCR Client    │ (Mobile/Desktop App)
│  (Send Image)   │
└────────┬────────┘
         │ HTTP POST
         │ /v1/chat/completions
         ▼
┌─────────────────┐
│  WriteTex       │
│  VSCode Ext     │
│  Port: 50905    │
└────────┬────────┘
         │
         ├─► mDNS Advertisement
         │   (Service Discovery)
         │
         ├─► Context Extraction
         │   (From active document)
         │
         ├─► OpenAI API Call
         │   (Vision model OCR)
         │
         └─► Insert at Cursor
             (In active document)
```

### Request Flow

1. **Image Capture**: OCR client captures an image
2. **API Request**: Client sends image to WriteTex Vscode extension server (`/v1/chat/completions`)
3. **Context Injection**: WriteTex Vscode extension extracts context from the active document
4. **Vision API Call**: WriteTex Vscode extension forwards request to OpenAI-compatible API with context
5. **Streaming Response**: OCR results stream back to client
6. **Auto-Insert**: Results are automatically inserted at cursor position

### Authentication

The server uses a hardcoded bearer token (`writetex`) for authentication. Clients must include:
```
Authorization: Bearer writetex
```

## 🌐 API Endpoints

### Health Check
```http
GET /health
```
Returns server status and port information.

### OCR Endpoint
```http
POST /v1/chat/completions
POST /chat/completions
```
OpenAI-compatible chat completions endpoint. Send image data as base64 in the message content.

## 🛠️ Development

### Prerequisites
- Node.js 16+
- VSCode 1.80.0+
### Clone

```bash
git clone https://github.com/jacklitstar/writetex-vscode.git
cd writetex-vscode
```

For Mac and Linux devices, change line 85 of `package.json` to
```
    "compile": "tsc -p ./ && cp -R src/locales out/locales",
```

### Build
```bash
npm install
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Lint
```bash
npm run lint
```

### Test
```bash
npm test
```

## 📝 Commands

Access commands via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **WriteTex: Start OCR Server** - Start the OCR proxy server
- **WriteTex: Stop OCR Server** - Stop the OCR proxy server
- **WriteTex: Show Actions** - Quick access to server controls

## 🐛 Troubleshooting

### Server Won't Start
- Check if port 50905 is already in use
- Ensure your firewall allows connections on this port
- Check the Debug Console for error messages

### OCR Not Working
- Verify API key is correctly configured
- Check API endpoint is accessible
- Ensure the model supports vision/image inputs
- Check Debug Console for API errors

### mDNS Issues on Windows
- Ensure Bonjour Service is installed (comes with iTunes or standalone)
- Check Windows Firewall settings
- Verify network discovery is enabled


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Adding Translations
To add support for a new language or fix translations:

1. Create a new JSON file in `src/locales/` (e.g., `ru.json`)
2. Copy the structure from `src/locales/en.json`
3. Translate all strings
4. Add language mapping in `src/i18n.ts`
5. Test with your language setting

## 📚 Resources

- **Documentation**: https://www.writetex.com/docs/vscode.html

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AI models for vibe coding
- The VSCode extension development community
- All contributors and translators

---

Vibe coded and LGTM by [jacklitstar](https://github.com/jacklitstar)

