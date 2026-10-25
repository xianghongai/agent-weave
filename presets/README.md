# 预设

随站点发布的初始工作区内容。每位新用户都从这里起步，“合并预设”和“重置为预设”也读取它。这里的文件是手写维护的数据，构建时由 `build/presets.ts` 调用 `src/lib/preset-composition.ts`，按每种界面语言各合成一份工作区，都打包进站点。决策依据见 `docs/adr/0004-presets-as-jsonc-data.md` 和 `docs/adr/0005-presets-follow-interface-language.md`。

## 文件结构

- 每个 `.jsonc` 文件都是一份部分工作区：顶层键取导出文件中的 `tags`、`command_tools`、`mcp_servers`、`agents`、`rules` 中的若干个，条目结构与导出文件完全相同。允许注释和尾随逗号。
- 根目录下按实体拆分：`tags.jsonc`、`command-tools.jsonc`、`mcp-servers.jsonc`、`rules.jsonc`（所有 Agent 共用的规则）。
- `agents/` 下每个 Agent 一个文件，包含该 Agent 的定义和它的内置工具的规则。下线或改名一个 Agent 只动一个文件。没有收录的产品及卡在哪里，写在 `agents/not-included.jsonc` 的注释中，这个文件不含条目。
- `locales/` 下每种界面语言一个语言文件（`zh-CN.json`、`en.json`），键完全相同。它们与界面的语言文件 `src/locales/` 分开：前者是数据，后者是界面。
- 合成时把各文件中的同名数组依次拼接：先是根目录下的文件，按标签、命令工具、MCP Server、共享规则的顺序；然后是排好序的 Agent 文件。
- 结构版本和修改时间由合成代码补上，不写在文件中。

## ID 取名约定

- 内部 ID 固定且全局唯一，人类可读，形如 `preset-<种类>-<后缀>`，如 `preset-tag-vcs`、`preset-command-git`、`preset-mcp-memory`、`preset-agent-claude-code`、`preset-rule-git-allow`。“合并预设”按 ID 判断条目是否已存在，已发布的 ID 不要改。
- 命令工具的标识含有不便放进 ID 的字符时，后缀另取，如 `g++` 用 `gpp`。
- 内置工具的 ID 带上所属 Agent，形如 `preset-built-in-<Agent>-<工具>`；它的规则形如 `preset-rule-<Agent>-<工具>-<说明>`。
- 规则的后缀以决策结尾，如 `-allow`、`-ask`、`-deny`。
- 预设内容只放通用的工具和路径形式：主目录写成 `{{home}}` 或 `~`，密钥写成 `${VAR}`，不写用户名、主机名和个人绝对路径。

## 优先级

Agent 文件可以在顶层声明 `priority`（整数，越大越靠前，省略为 0）。合成时 Agent 先按它降序、同值按文件名升序排列，然后丢弃这个字段，它不进入工作区。只有 `agents/` 下的文件可以声明它。

## 文案键

- 给人看的文字写成文案键，文字写在 `locales/` 下每种语言的语言文件中，合成时替换。新增或修改预设文字时，每种语言都要补齐，缺键或多余的键都由单元测试拦截。涉及的字段：标签名、各条目的描述、高危说明、Agent 描述、作用域的名称和说明、规则描述。
- 键名以条目 ID 为前缀，后面接字段名，如 `preset-command-rm.description`、`preset-command-rm.high_risk_reason`。作用域没有 ID，用所属 Agent 的 ID 加作用域的种类和名称，如 `preset-agent-claude-code.permission-scope-user.name`。
- 空字符串表示没有文字，不需要键。
- 英文译文的规则与界面相同：术语按 `GLOSSARY.md` 中每个术语的 `_English_`，产品名、命令、路径和代码保持原文。
- 取舍理由写进相关条目的描述；只对维护者有用的说明写成 JSONC 注释。

## 新增命令时要补规则

新增一个命令工具，要同时在 `rules.jsonc` 中补上它的规则（通常是一条整体允许），并补上它的文案。没有任何规则的命令只允许是豁免名单中交给 Agent 默认行为的高危命令，单元测试会检查这一点。

## 检查

构建遇到语法错误会失败，并报出文件名和行列。结构、引用、文案键等逻辑问题在构建时只输出警告，警告指明是哪个语言文件，由单元测试拦截：`test/presets.test.ts` 读取这里的实际文件按每种语言合成，要求没有警告、能通过导入校验，并且各语言合成出的工作区去掉文字字段后完全相同。修改后运行：

```sh
mise exec -- pnpm test && mise exec -- pnpm build
```
