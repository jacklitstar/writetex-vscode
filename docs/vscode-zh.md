---
title: Visual Studio Code 扩展
---

# Visual Studio Code 扩展 (Beta)

我们的 VS Code 扩展可以利用 AI 对数学方程式进行更准确的 OCR，并为使用 VS Code 编写 LaTeX 的用户提供上下文感知。
这是一个使用指南，开发者请访问 [我们的仓库](https://github.com/jacklitstar/writetex-vscode)。

>**警告**：此扩展正在大力开发中，不提供任何保证。使用风险自负。请参阅 [许可证](https://github.com/jacklitstar/writetex-vscode/blob/main/LICENSE)。


## 视频介绍
[bilibili - 「WriteTex」平板手写LaTeX公式到VS Code，结合上下文让识别更精准，助力学术写作](https://www.bilibili.com/video/BV15tmzBWEmj)
## 功能
WriteTex 的 VSCode 扩展通过向 AI 模型提供当前文档的上下文，提供更准确的 OCR 结果。用户只需在 iPad/平板电脑上书写，结果就会放置在 VSCode 中的光标处。上下文是根据光标周围一定半径内的行构建的。

## 安装
>**警告**：仅当您的设备位于防火墙后时才安装此扩展。仅在受信任的网络中启用此扩展。请勿在服务器上安装。

- 对于 Microsoft Visual Studio Code 用户：
    在扩展页面中搜索“WriteTex”或从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=WriteTex.writetex-vscode) 安装。
- 对于 VSCode 分支（Cursor、Trae、Antigravity、Kiro、Qoder、Void、VSCodium、Windsurf、Codex 等）：
    尝试在您的分支的扩展页面中搜索“WriteTex”。如果未找到，请从 [发布页面](https://github.com/jacklitstar/writetex-vscode/releases) 下载我们的 `.vsix` 文件，并通过扩展 -> 右上角三个点 -> 从 VSIX 安装手动安装。

## 配置设置
安装后，我们的图标将出现在您的侧边栏中。单击它以配置设置。配置界面如下：



### AI API 配置
此部分类似于其他平台的设置。下面是一个简单的示例：
| 设置 | 值 |
| --- | --- |
| API 端点 | `https://api.openai.com/v1` |
| 模型 | `gpt-5` |
| API 密钥 | `sk-...` |

**自定义指令**
一些额外的提示来指导 AI 模型。例如，您可以添加“对虚数单位使用 `\mathbb{i}`。”

### 上下文
- 上下文行半径
    您可以在此处控制上下文的半径。数字 10 表示上下文是根据光标前 10 行和光标后 10 行构建的。
- 上下文字符限制
    上下文中的最大字符数。数字 1000 表示上下文限制为 1000 个字符。

## 服务管理
服务器状态显示在顶部。您可以通过单击相应的按钮启动/停止服务器。启动服务器以使 WriteTex 的移动应用程序连接到此 VSCode 实例。**注意：一次只能运行一个服务器。** 如果您想在另一个 VSCode 项目中使用 WriteTex，需要停止当前项目中的 WriteTex 扩展的服务器。

## 连接到扩展
确保您的扩展已启用且服务器正在运行。确保只有一个项目正在运行扩展服务器。
### 从 iPhone/iPad


确保您的扩展已启用且服务器正在运行。在您的 iOS 设备上，转到 AI API 设置 -> VSCode 扩展。打开 `使用 VSCode`，在发现列表中查找您的设备名称并选择它。如果您的设备未列出，请尝试通过在 `其他...` 中输入您的计算机 IP 地址进行手动连接。

>对于 v2.1 之前的app版本：获取运行 VSCode 扩展的计算机的 IP 地址。转到 **任务管理器** 并单击您的网络，查找 **IPv4 地址**
>在设置中，将  iPhone/iPad 的 AI API 设置为：
>| 选项 | 值 |
>| --- | --- |
>| API 端点 | http://获取的 ip 地址:50905/v1 |
>| 模型 | 您的模型 |
>| API 密钥 | writetex |


### 从 Android
获取运行 VSCode 扩展的计算机的 IP 地址。转到 **任务管理器** 并单击您的网络，查找 **IPv4 地址**
在设置中，将 AI API 设置为：
| 选项 | 值 |
| --- | --- |
| API 端点 | http://获取的 ip 地址:50905 |
| 模型 | 您的模型 |
| API 密钥 | writetex |

### 从 Windows/MacOS
在设置中，将 AI API 设置为：
| 选项 | 值 |
| --- | --- |
| API 端点 | http://127.0.0.1:50905 |
| 模型 | 您的模型 |
| API 密钥 | writetex |


## 使用
1. 在支持的文件类型中打开文档（`.tex` `.latex` `.markdown` `.md` `.rmd` `.qmd` `.ipynb`）
2. 确保您的光标放置在文档中
3. 用 iPad/平板电脑连接到 VS Code 扩展
4. 开始书写，识别结果将显示在 VS Code 中的光标位置

## 调试
### 检查清单
- VS Code 扩展已启用
- 只有一个打开的 VS Code 窗口正在运行服务器
- 您的光标放置在具有以下文件扩展名的打开编辑器中：`.tex` `.latex` `.markdown` `.md` `.rmd` `.qmd` `.ipynb`
- 您的 iPad/平板电脑与您的计算机连接到同一网络
- 您的计算机防火墙允许传入连接
- 您的网络没有阻止设备之间的通信

### 结果显示在 iPad 上但不在 VS Code 中
确保您在 VS Code 中放置了光标
检查是否有另一个 VS Code 窗口打开了扩展服务器正在运行。如果有，请关闭它。

### 在 iPad 上找不到您的设备在发现列表中
检查您的 iPad/平板电脑是否连接到与您的计算机相同的网络。

如果您的设备仍未列出，请尝试通过在 `其他...` 中输入您的计算机 IP 地址进行手动连接。

> 可能的解决方案：检查您的计算机上是否安装了 Bonjour 服务。如果没有，请通过安装 iTunes 从 Apple 安装它。