# Agent Weave

[English](README.md)

[![CI](https://github.com/xianghongai/agent-weave/actions/workflows/ci.yml/badge.svg)](https://github.com/xianghongai/agent-weave/actions/workflows/ci.yml) [![License](https://img.shields.io/github/license/xianghongai/agent-weave)](LICENSE)

一份权限规则，织进每一个 Agent。

Agent Weave 在浏览器里维护一份中立规则集，包含工具、权限规则和 MCP Server，并为各个 AI Coding Agent 生成各自的权限配置与 MCP 配置。所有处理都在浏览器内完成。

## 为什么需要它

每个 Coding Agent 都有自己的权限格式：配置文件路径不同，允许、询问、拒绝的键名不同，命令前缀和路径的写法也不同。同时使用多个 Agent 时，同一套规则要按每种格式手工重写一遍，时间一长就各不相同。Agent Weave 只保留一份正本，由它生成每种格式。

## 功能

- **工具**：集中维护所有 Agent 共享的命令工具（如 `git`、`pnpm`），以及各 Agent 的内置工具（如 Claude Code 的 `Read`）。可以把工具标记为高危并写明原因。
- **MCP Server**：用 Claude 风格的 JSON 维护一份 MCP Server 清单。每个 MCP Server 自动对应一个 MCP 工具，供权限规则引用。
- **权限规则**：对一个工具给出允许、询问或拒绝的决策，可以用模式（如 `git push`、`./src/**`）缩小范围。冲突的决策和允许的高危规则会给出提示，但不阻止生成。
- **输出**：按作用域（用户级、项目级等）预览并复制每个 Agent 的权限输出与 MCP 输出。某个 Agent 无法表达的规则列在输出旁边，不会被悄悄丢弃。
- **预设**：从整理好的工作区起步，之后可以合并预设中的新条目，也可以整体重置为预设。
- **同步**：把工作区导出为文件或从文件导入，也可以通过自己的 GitHub Gist 在多台设备之间同步。
- **离线**：站点是 PWA。访问过一次后，断网也能使用，并且可以安装到本机。

## 支持的 Agent

预设中包含 Claude Code、Codex CLI、Antigravity、Gemini CLI、Qwen Code、CodeBuddy Code、Cursor CLI 和 Devin CLI 的 Agent 定义。Agent 定义是数据，在 Agent 页面中就能新增或调整，不需要修改代码。

暂时无法表达其权限格式的 Agent 及原因，列在 [`presets/agents/not-included.jsonc`](presets/agents/not-included.jsonc) 中。

## 隐私

| 承诺             | 实现方式                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| 数据留在自己手里 | 工作区保存在浏览器的本地存储中。只有导出文件或推送到自己的 Gist 时，数据才会离开本机。                     |
| 只有一个外部去处 | 构建产物带有内容安全策略（CSP），`connect-src` 只放行站点自身和用于 Gist 同步的 `https://api.github.com`。 |
| 没有第三方代码   | 不接入统计、埋点或错误上报。所有依赖从 npm 安装并随站点打包，不从 CDN 加载任何内容。                       |
| 本机数据不外流   | GitHub Token、Gist ID、本机设置和界面语言不会写进工作区、导出文件和 Gist。                                 |
| 不可被嵌入       | 页面被嵌入别的页面的 iframe 时不渲染界面，防止点击劫持。                                                   |

验证方法：打开浏览器开发者工具的“网络”面板。请求只发往站点自身，推送或拉取时另有 `api.github.com`。

Secret Gist 不是加密存储，知道链接的人都可以读取，因此不要在工作区中放入密钥。Token 只授予 Gist 权限即可：经典 Token 只勾选 `gist`；Fine-grained Token 在 **Account permissions** 中把 **Gists** 设为 **Read and write**。

## 界面语言

界面提供简体中文和英文。首次访问时跟随浏览器语言，之后可以在页脚右侧切换，所选语言保存在当前设备上。

从预设新加入的条目使用当前的界面语言。工作区中已有的文字属于用户数据，切换语言时不会改变。

## 开发

Node.js 和 pnpm 的版本由 `mise.toml` 与 `package.json` 锁定，命令通过 [mise](https://mise.jdx.dev/) 运行：

```sh
mise exec -- pnpm install
mise exec -- pnpm dev
```

提交前运行全部校验：

```sh
mise exec -- pnpm format:check && mise exec -- pnpm lint && mise exec -- pnpm check-types && mise exec -- pnpm test && mise exec -- pnpm build
```

- 修改预设的方法见 [`presets/README.md`](presets/README.md)。
- 各 Agent 的权限与 MCP 格式规则及已知的坑见 [`docs/agent-formats.md`](docs/agent-formats.md)。
- 术语定义在 [`GLOSSARY.md`](GLOSSARY.md) 中，设计决策记录在 [`docs/adr/`](docs/adr/) 中。
- 项目约定见 [`AGENTS.md`](AGENTS.md) 与 [`CODING_STANDARDS.md`](CODING_STANDARDS.md)。

技术栈：Vite、React、TypeScript、Tailwind CSS、shadcn/ui（Base UI）、Zustand、i18next、CodeMirror。

## 许可证

[MIT](LICENSE)
