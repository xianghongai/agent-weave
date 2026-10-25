# Agent Weave

把一份与 Agent 无关的权限规则和 MCP Server 清单，转换成多种 AI Coding Agent 各自的配置格式。

## 语言

### 规则来源

**中立规则集**：
本工具维护的唯一正本，包含工具、权限规则和 MCP Server，与任何 Agent 的格式无关。各 Agent 的配置都由它生成。
_English_：Neutral rule set
_Avoid_：源配置、通用配置

**工作区**：
一位用户的全部数据：中立规则集与 Agent 定义的总和。保存、导入、导出、同步都以工作区为单位。
_English_：Workspace
_Avoid_：工程、项目（与项目级作用域冲突）、档案

**预设**：
随站点发布的初始工作区内容。用户首次使用时由它初始化，之后可以合并预设中的新条目，也可以整体重置为预设。
_English_：Presets
_Avoid_：默认配置、模板

**Agent**：
一个具体的 AI Coding Agent 产品，如 Claude Code、Codex CLI、Antigravity。不区分厂商。
_English_：Agent
_Avoid_：厂商、Vendor、客户端

**Agent 定义**：
描述如何把中立规则集写成某个 Agent 的配置，分为权限输出和 MCP 输出两部分，两部分都可以缺省。
_English_：Agent definition
_Avoid_：适配器、Agent 配置

**作用域**：
Agent 读取配置的一个层级（如用户级、项目级），带一个配置文件路径。只用于提示用户把输出粘贴到哪里，不影响输出内容。
_English_：Scope
_Avoid_：层级、级别

**本机设置**：
只保存在当前设备的路径展开设置：为每种操作系统分别记录的用户名，以及输出时用于展开路径占位符的操作系统。不属于工作区，也不同步。界面语言和主题不属于本机设置。
_English_：Device settings
_Avoid_：全局设置、环境配置

### 权限

**工具**：
权限规则可以指向的一种能力。命令工具和 MCP 工具由所有 Agent 共享；内置工具归属于单个 Agent。
_English_：Tool
_Avoid_：能力

**命令工具**：
通过 Agent 的 Shell 执行的程序，如 `git`、`pnpm`。
_English_：Command tool
_Avoid_：CLI 工具、Shell 工具

**MCP 工具**：
以一个 MCP Server 为对象的工具；每个 MCP Server 自动对应一个 MCP 工具。
_English_：MCP tool
_Avoid_：MCP 权限

**内置工具**：
由某个 Agent 自身提供的工具，如 Claude Code 的 `Read`、Antigravity 的 `read_file`。只属于这个 Agent，不跨 Agent 对应。
_English_：Built-in tool
_Avoid_：原生工具、Agent 内置工具、Agent 预设工具

**权限规则**：
对一个工具（可附带模式）给出一个决策的条目。指向内置工具的权限规则只属于该 Agent，其余规则所有 Agent 共享。
_English_：Permission rule
_Avoid_：规则（单独使用时有歧义）、权限项

**模式**：
权限规则中限定工具作用范围的部分，如命令前缀 `git push` 或路径 glob `./src/**`。可省略，省略时表示整个工具。
_English_：Pattern
_Avoid_：参数、匹配串

**决策**：
权限规则的结果，取值只有 `allow`、`ask`、`deny` 三种。
_English_：Decision
_Avoid_：动作、级别、策略

**标签**：
工具的分组与筛选标记，不影响任何输出。
_English_：Tag
_Avoid_：分类、类别

**跳过的规则**：
某个 Agent 定义无法表达、因而没有写进该 Agent 输出的权限规则，会在输出旁列出。
_English_：Skipped rule
_Avoid_：丢弃、失败规则

**冲突提示**：
同一工具、同一模式同时出现不同决策时给出的提醒。只提醒，不阻止生成。
_English_：Conflict notice
_Avoid_：冲突错误

**高危提示**：
对决策为 `allow` 的高危权限规则给出的提醒。只提醒，不阻止生成。
_English_：High-risk notice
_Avoid_：拦截、校验错误

**高危说明**：
标记为高危的命令工具、MCP Server、内置工具或权限规则上可选填写的原因，如“删除后无法恢复”。悬停高危徽标或规则的高危图标时显示；取消高危标记时一并清空。
_English_：High-risk reason

### MCP

**MCP Server**：
一个可接入 Agent 的 MCP 服务条目，由标识、内容和描述组成。
_English_：MCP server
_Avoid_：MCP 配置、MCP 插件

### 输出

**提示**：
生成某个 Agent 的输出时，伴随输出给出的各类提醒的总称，包括冲突提示、高危提示、跳过的规则、无法写成 TOML 而被跳过的字段，以及因本机设置不完整而原样保留的路径占位符。提示不改变输出内容，也不阻止生成。
_English_：Notices
_Avoid_：警告、错误、通知

## 界面

**对话框**：
带遮罩的弹出层，对应 shadcn/ui（Base UI）的 `Dialog`。带输入、需要保存或取消的用表单对话框；只有按钮的确认框用 `AlertDialog`。
_English_：Dialog
_Avoid_：弹窗、模态框、模态窗

**界面语言**：
站点界面显示的语言，与主题一样是只保存在当前设备的界面偏好，不属于工作区，也不同步。它只决定界面文字，以及之后从预设新加入工作区的条目用哪种语言的文字；已在工作区中的文字不随它改变。
_English_：Interface language
_Avoid_：语言设置、地区、locale
