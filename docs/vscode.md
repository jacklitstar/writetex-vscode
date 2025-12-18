---
title: Visual Studio Code Extension
---

# Visual Studio Code Extension (Beta)

Our VS Code Extension can utilize AI to perform more accurate OCR on maths equations with context perception for users using vscode writing LaTeX.  
This is a usage guide, for developers please visit [our repository](https://github.com/jacklitstar/writetex-vscode).

>**WARNING**: THE EXTENSION IS UNDER HEAVY DEVELOPMENT AND OFFERS ZERO WARRANTY. USE AT YOUR OWN RISK. SEE [LICENSE](https://github.com/jacklitstar/writetex-vscode/blob/main/LICENSE).

## Features
The VSCode extension of WriteTex offers a more accurate OCR result by feeding the AI model with the context of the current document. The user can simply write on there iPad/tablet, and the results will be placed at your cursor in VSCode. The context is built from lines within a radius of the cursor. 

## Installation
>**WARNING**: ONLY INSTALL THE EXTENSION IF YOUR DEVICE IS BEHIND A FIREWALL. ONLY ENABLE THE EXTENSION IN A TRUSTED NETWORK. DO NOT INSTALL ON SERVER.

- For Microsoft Visual Studio Code users:
    Search in the extensions page for "WriteTex" or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=WriteTex.writetex-vscode).
- For VSCode forks (Cursor, Trae, Antigravity, Kiro, Qoder, Void, VSCodium, Windsurf, Codex etc):
    Try searching for "WriteTex" in the extensions page of your fork. If it is not found, download our `.vsix` file from the [releases page](https://github.com/jacklitstar/writetex-vscode/releases) and install it manually via extensions -> 3 dots on top right -> Install from VSIX.

## Configure Settings
Once installed, our icon will appear in your sidebar. Click on it to configure the settings. 

### AI API Configuration
This part is similar to other platform's setup. A simple example is shown below:
| Setting | Value |
| --- | --- |
| API Endpoint | `https://api.openai.com/v1` |
|Model | `gpt-5` |
|API Key | `sk-...` |

**Custom Instructions**  
Some additional prompt to guide the AI model. For example, you can add "Use `\mathbb{i}` for the imaginary unit."

### Context 
- Context Line Radius
    Here you can control the radius of the context. A number of 10 means the context is built from 10 lines before and 10 lines after the cursor.
- Context Char limit
    The maximum number of characters in the context. A number of 1000 means the context is limited to 1000 characters.

## Service Management
The server status is indicated at the top. You can start/stop the server by clicking the corresponding buttons. Start the server for the mobile app of WriteTex to connect to this VSCode instance. **ONLY ONE SERVER CAN BE RUNNING AT A TIME.** If you start the server in one instance of VSCode, you must stop it before starting it in another instance.


## Connect to extension
Make sure your extension is enabled and the server is running. Make sure only one project has the extension server running.
### From iPhone/iPad
Make sure your extension is enabled and the server is running. On your iOS device, go to AI API Settings -> VSCode Extension. Toggle on `Use VSCode`, look for your device's name in the discover list and select it. If your device is not listed, try manual connection by entering the your computer's IP address in `Other...`.

>For iOS app versions before v2.1: Obtain the IP address of the computer running the VSCode extension. Go to **Task Manager** and click on your network, look for **IPv4 Address**.
>In settings, set the AI API to:
>| Setting | Value |
>| --- | --- |
>|API Endpoint|http://your-computer-ip:50905/v1|
>|Model|your model|
>|API Key|writetex|
### From Android
Obtain the IP address of the computer running the VSCode extension. Go to **Task Manager** and click on your network, look for **IPv4 Address**
In settings, set the AI API to:
| Setting | Value |
| --- | --- |
|API Endpoint|http://your-computer-ip:50905|
|Model|your model|
|API Key|writetex|

### From Windows/MacOS
In settings, set the AI API to:
| Setting | Value |
| --- | --- |
|API Endpoint|http://127.0.0.1:50905|
|Model|your model|
|API Key|writetex|

## Usage
1. Open a document with supported file extension types: `.tex` `.latex` `.markdown` `.md` `.rmd` `.qmd` `.ipynb`
2. Place your cursor in the document
3. Connect your iPad/tablet to the VS Code extension
4. Start writing, the OCR results will appear in VS Code at your cursor position

## Debugging
### General Checklist
- The VS Code Extension is enabled
- Only **one** open VS Code Window has a running server
- Your cursor is placed in a open editor with one of these file extension types: `.tex` `.latex` `.markdown` `.md` `.rmd` `.qmd` `.ipynb`
- Your iPad/tablet is connected to the same network as your computer
- Your computer's firewall allows incoming connections
- Your network is not blocking between device communication

### Results appear on iPad but not in VS Code
Make sure you have your cursor placed in VS Code
Check if you have another VS Code window open with the extension server running. If so, close it.

### Can't find your device in the discover list on iPad
Check if your iPad/tablet is connected to the same network as your computer.

If your device is still not listed, try manual connection by entering the your computer's IP address in `Other...`.

> Possible fix: Check if Bonjour service is installed on your computer. If not, install it from apple via installing iTunse.