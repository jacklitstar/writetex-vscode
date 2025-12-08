## Overview

* Implement a VS Code extension that:

  * Runs a local HTTP server for tablet → extension communication

  * Advertises itself on the LAN via mDNS for discovery

  * Sends the received base64 image to Copilot’s language model with editor-aware context

  * Inserts the OCR result at the user’s cursor (or copies to clipboard if no supported editor is open)

  * Returns the OCR result back to the tablet

## Extension Setup

* Add activation events: `onStartupFinished`, `onCommand:writetex.startServer`, `onCommand:writetex.stopServer`

* Contribute commands:

  * `writetex.startServer` (start HTTP + mDNS)

  * `writetex.stopServer` (stop HTTP + mDNS)

* Contribute configuration settings:

  * `writetex.port` (default: 53421)

  * `writetex.serviceName` (default: "WriteTex OCR")

  * `writetex.requireToken` (default: false)

  * `writetex.token` (string, hidden unless `requireToken=true`)

  * `writetex.modelId` (default: Copilot vision-capable model)

* Status bar item: show server state (Running/Stopped)

* Supported filetypes to target for insertion: `.tex`, `.md`, `.ipynb`, `.rmd`

## Networking: Local HTTP Server

* Create `src/server.ts` using Node’s built-in `http` to avoid heavy deps

* Endpoints:

  * `POST /ocr` → body: `{ imageBase64: string, mimeType?: string, clientId?: string, token?: string }`

  * `GET /health` → `{ ok: true, service: "WriteTex OCR", port }`

* Behavior for `POST /ocr`:

  * Validate optional token if `requireToken=true`

  * Decode base64 image, persist to a temp file under `ExtensionContext.storagePath` → `Uri`

  * Invoke AI pipeline with context and image → get `resultText`

  * Attempt insertion at active cursor if supported editor open; otherwise write to clipboard

  * Respond JSON `{ ok: true, result: resultText}`

* Bind to `0.0.0.0` (LAN accessible); configurable port from settings; emit friendly logs

## Discovery: mDNS/Broadcast

* Use a node.js mdns Bonjour implementation to avoid native build issues

* Advertise `_writetex-vscode._tcp` with:

  * name: get the current device name

  * port: `writetex.port`

  * TXT records: `{ path: "/ocr", version: "1", requireToken }`

* Start/stop advertisement in lockstep with the HTTP server

## Context Aggregation (Editor-Aware)

* Create `src/context.ts` to gather structured context:

  * Active editor check; language id; file path; selection range

  * Surrounding text window: ±100 lines or up to \~4000 chars centered at cursor

  * Mode detection:

    * TeX: Detect nearest environment (`\begin{...}`/`\end{...}`), inline math (`$...$`, `\(...\)`), display math (`$$`, `\[...\]`), TikZ (`tikzpicture`)

    * Markdown: Math fences (inline `$...$` vs display `$$...$$`), code fences

    * RMarkdown: Same as Markdown math handling

    * Jupyter (`ipynb`): Active cell text via notebook editor API if available; fallback to document text

  * Produce `ContextSummary` with: `file (eg example.tex)`, and `surroundingText`

## Prompt Design (Strict OCR Output)

* System message:

  * "You are an OCR expert for LaTeX/TikZ. Read the provided image and return ONLY the exact code necessary for the detected content in the image. No commentary, no explanations, no surrounding prose. Prefer consistent formatting with the provided editor context. Do not include preamble/packages."

* User message template (built per request):

  * <br />

    "File: {file}
    Language: {language}
    Mode hint: {mode}
    Surrounding context:
    --------------------

    ## {surroundingText}

    Task: Extract the math/diagram content from the attached image and output ONLY the LaTeX/TikZ code suitable for {mode}. If TikZ content is detected, output ONLY the body of the environment unless the context indicates the absence of a `tikzpicture` wrapper. If math, choose inline `$...$` vs display `\[...\]` consistent with context."

* Image attachment:

  * Provide the image via a temporary file `Uri` attachment so the Copilot model can perform vision OCR

* Output constraints:

  * MUST be raw code only (LaTeX/TikZ/plain), no backticks unless context dictates a fenced code block (Markdown)

  * Avoid preambles (`\documentclass`, `\usepackage`)&#x20;

## Copilot Model Invocation

* Create `src/ai.ts` using VS Code Language Model API (`vscode.lm`):

  * Select a Copilot chat model with vision support (e.g., an `o`/vision-capable family)

  * Feature-detect image support; error if unavailable

  * Build messages: system + user; attach image `Uri`

  * Request with bounded tokens and streaming disabled; collect final `resultText`

  * Normalize output: trim, remove accidental explanations or fences if not needed; preserve TeX escape sequences

* Error handling:

  * Copilot not installed/signed-in → return descriptive error and prompt user to enable Copilot

  * Vision not supported → raise error

## Insertion Logic

* Create `src/insert.ts`:

  * Determine if active editor exists and file is one of supported types

  * If TeX:

    * If inside `tikzpicture` → insert body only

    * If within math display/inline, wrap appropriately; otherwise insert raw TeX and let user adjust

  * If Markdown/RMarkdown:

    * Respect nearby `$`/`$$` blocks; wrap if needed to match context

  * If Jupyter notebook:

    * Insert into current cell text at cursor

  * If no supported editor open → write to `vscode.env.clipboard`

  * Return `{ inserted: boolean, location?: { file, line, column } }`

## Extension Orchestration

* Update `src/extension.ts` to:

  * Read settings, start HTTP server and mDNS on activation or `writetex.startServer`

  * Route `POST /ocr` to the AI pipeline (context → prompt → model → insert/clipboard → response)

  * Stop server and mDNS on `deactivate` or `writetex.stopServer`

  * Expose minimal logging and status bar updates

## Files & Structure

* New files:

  * `src/server.ts` (HTTP server + routing)

  * `src/mdns.ts` (Bonjour advertisement lifecycle)

  * `src/context.ts` (editor context extraction)

  * `src/ai.ts` (Copilot model invocation)

  * `src/insert.ts` (insertion + clipboard)

  * `src/types.ts` (shared types/interfaces)

* Update existing:

  * `src/extension.ts` (wire-up)

  * `package.json` (activation events, commands, configuration, runtime dependencies)

## Settings & Defaults

* `writetex.port`: 53421

* `writetex.serviceName`: "WriteTex OCR"

* `writetex.modelId`: Copilot vision-capable model

* `writetex.requireToken`: false

* `writetex.token`: empty

## Security Considerations

* Token-based auth optional; recommend enabling in shared networks

* Limit payload size (e.g., ≤ 10MB) and reject oversized requests

* Sanitize/validate JSON; ensure base64 decoding doesn’t write outside storage path

* CORS: Not required for native app → server, but keep responses simple JSON

## Error Paths & Fallbacks

* No active editor → copy to clipboard

* Unsupported file type → clipboard

* Copilot unavailable → return error with remediation hint

* Model response empty or invalid → return error; do not insert

## Testing & Verification

* Manual:

  * Start server; verify `/health`

  * Send sample base64 PNG; expect result inserted in `.tex` near math context

  * Repeat in `.md` with `$...$`, verify wrapping

  * No editor open → result on clipboard

  * Tablet receives JSON result

* Automated (lightweight):

  * Unit test `context.ts` mode detection with synthetic buffers

  * Unit test insertion wrappers for TeX/Markdown heuristics

## Dependencies

* Add runtime deps:

  * `bonjour-service`  for mDNS

* Rely on built-in Node `http` and VS Code `vscode.lm` API; avoid `express` unless later needed

## Timeline & Deliverables

* Implement server + mDNS + AI pipeline and insertion

* Add commands, settings, status bar, and robust error handling

* Provide example tablet request/response schema for integration

## Example Request/Response

* Request to `/ocr`:

  * `{ "imageBase64": "data:image/png;base64,<...>" }` or `{ "imageBase64": "<base64>", "mimeType": "image/png" }`

* Response:

  * `{ "ok": true, "result": "\\[a^2 + b^2 = c^2\\]" }`

## Resources:

Vscode Docs can be found in subfolder vscode-docs
