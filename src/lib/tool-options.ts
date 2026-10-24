import type { ToolRef, Workspace } from '@/lib/workspace';
import { compareText } from '@/lib/workspace-operations';

/** 规则可以指向的一个工具，以及在界面上显示的文本。 */
export interface ToolOption {
  /** 命令工具和 MCP 工具是标识；内置工具带所属 Agent 的名称，以便区分同名工具。 */
  label: string;
  ref: ToolRef;
}

/**
 * 规则可以指向的全部工具：先按类型（命令、MCP、内置），同类内按标识排序，
 * 与规则列表和输出的顺序一致。内置工具按 Agent 的顺序排列。
 */
export function toolOptions(workspace: Workspace): ToolOption[] {
  return [
    ...sharedOptions('command', workspace.command_tools),
    ...sharedOptions('mcp', workspace.mcp_servers),
    ...workspace.agents.flatMap((agent) =>
      agent.built_in_tools
        .toSorted((a, b) => compareText(a.key, b.key))
        .map((tool) => ({ label: `${tool.key} · ${agent.name}`, ref: { type: 'built_in' as const, id: tool.id } }))
    ),
  ];
}

function sharedOptions(type: 'command' | 'mcp', tools: { id: string; key: string }[]): ToolOption[] {
  return tools
    .toSorted((a, b) => compareText(a.key, b.key))
    .map((tool) => ({ label: tool.key, ref: { type, id: tool.id } }));
}

/** 按输入过滤工具：不区分大小写的子串匹配，查询为空时返回全部。 */
export function filterToolOptions(options: ToolOption[], query: string): ToolOption[] {
  const text = query.trim().toLowerCase();
  if (text === '') {
    return options;
  }
  return options.filter((option) => option.label.toLowerCase().includes(text));
}
