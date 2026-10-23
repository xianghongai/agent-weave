# AGENTS.md

纯静态站点，部署到 GitHub Pages。所有工具在浏览器内运行，不依赖任何后端。

## Agent skills

### Issue tracker

Issue 以本地 Markdown 文件的形式存放在 `.scratch/<feature-slug>/` 下。见 `docs/agents/issue-tracker.md`。

### Triage labels

沿用五个默认分诊标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局：仓库根目录一份 `GLOSSARY.md`，ADR 放在 `docs/adr/`。见 `docs/agents/domain.md`。
