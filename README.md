# Agent Weave

[简体中文](README.zh-CN.md)

[![CI](https://github.com/xianghongai/agent-weave/actions/workflows/ci.yml/badge.svg)](https://github.com/xianghongai/agent-weave/actions/workflows/ci.yml) [![License](https://img.shields.io/github/license/xianghongai/agent-weave)](LICENSE)

One set of permission rules, woven into every agent.

Agent Weave lets you maintain one neutral rule set of tools, permission rules, and MCP servers, and generates the permission and MCP configuration for each AI coding agent. Everything runs in your browser.

Open it at <https://xianghongai.github.io/agent-weave/>.

## Why

Every coding agent has its own permission format: different file paths, different keys for allow, ask, and deny, and different ways to write a command prefix or a path. When you use more than one agent, the same rules get rewritten by hand in each format and drift apart. Agent Weave keeps one source and writes each format for you.

## Features

- **Tools**: Manage the command tools that all agents share, such as `git` and `pnpm`, and each agent's built-in tools, such as Claude Code's `Read`. Flag high-risk tools and note why.
- **MCP servers**: Keep one list of MCP servers in Claude-style JSON. Each server automatically becomes an MCP tool that rules can point to.
- **Permission rules**: Allow, ask, or deny a tool, optionally narrowed by a pattern such as `git push` or `./src/**`. Conflicting decisions and allowed high-risk rules are flagged, but never block output.
- **Output**: Preview and copy each agent's permission output and MCP output, by scope (user, project, and so on). Rules an agent can't express are listed next to the output instead of being dropped silently.
- **Presets**: Start from a curated workspace. Merge new preset entries later, or reset to presets.
- **Sync**: Export and import your workspace as a file, or sync it across devices through your own GitHub gist.
- **Offline**: The site is a progressive web app. After your first visit, it works without a network connection and can be installed.

## Supported agents

The presets include agent definitions for Claude Code, Codex CLI, Antigravity, Gemini CLI, Qwen Code, CodeBuddy Code, Cursor CLI, and Devin CLI. An agent definition is data, so you can add or adjust one on the Agents page without changing code.

Agents whose permission format can't be expressed yet are listed, with the reason, in [`presets/agents/not-included.jsonc`](presets/agents/not-included.jsonc).

## Privacy

| Promise                         | How it's kept                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data stays with you             | Your workspace is saved in your browser's local storage. It leaves the device only when you export a file or push to your own gist.                         |
| One external destination        | The built site carries a Content Security Policy whose `connect-src` allows only the site itself and `https://api.github.com`, which is used for gist sync. |
| No third-party code             | No analytics, tracking, or error reporting. All dependencies are installed from npm and bundled; nothing is loaded from a CDN.                              |
| Device data stays on the device | Your GitHub token, gist ID, device settings, and interface language are never written to the workspace, exported files, or the gist.                        |

To check, open the Network panel in your browser's developer tools. Requests go only to the site itself, plus `api.github.com` when you push or pull.

A secret gist isn't encrypted. Anyone with its link can read it, so don't put secrets in your workspace. Use a token that has only gist access: a classic token with only the `gist` scope, or a fine-grained token with **Gists** set to **Read and write**.

## Interface language

The interface is available in Simplified Chinese and English. On your first visit, it follows your browser's language. You can switch at the right of the footer, and your choice is saved on the current device.

New entries that come from presets use the current interface language. Text that's already in your workspace is your data and doesn't change when you switch languages.

## Development

Node.js and pnpm versions are pinned in `mise.toml` and `package.json`. Run commands through [mise](https://mise.jdx.dev/):

```sh
mise exec -- pnpm install
mise exec -- pnpm dev
```

Before you commit, run all checks:

```sh
mise exec -- pnpm format:check && mise exec -- pnpm lint && mise exec -- pnpm check-types && mise exec -- pnpm test && mise exec -- pnpm build
```

Pushing to `main` builds the site and deploys it to GitHub Pages.

- To change presets, see [`presets/README.md`](presets/README.md).
- Agent permission and MCP formats, with known pitfalls, are in [`docs/agent-formats.md`](docs/agent-formats.md).
- Terms are defined in [`GLOSSARY.md`](GLOSSARY.md), and design decisions are recorded in [`docs/adr/`](docs/adr/).
- Project conventions are in [`AGENTS.md`](AGENTS.md) and [`CODING_STANDARDS.md`](CODING_STANDARDS.md).

Built with Vite, React, TypeScript, Tailwind CSS, shadcn/ui (Base UI), Zustand, i18next, and CodeMirror.

## License

[MIT](LICENSE)
