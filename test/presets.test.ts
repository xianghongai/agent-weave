import { describe, expect, it } from 'vitest';

import { readPresetFiles } from '../build/presets';
import { generate } from '@/lib/generate';
import { composePresets } from '@/lib/preset-composition';
import { createPresetWorkspace } from '@/lib/presets';
import type { DeviceSettings } from '@/lib/workspace';
import { exportWorkspace, importWorkspace } from '@/lib/workspace-file';

/*
 * 预设内容：读取 `presets/` 下的实际文件交给合成函数，再复用已有接缝：导入校验与生成。
 * 构建只对逻辑问题出警告，这里的失败才是拦住坏预设的关口（ADR 0004）。
 * 快照使用固定的本机设置，`{{home}}` 展开为 `/home/alice`，结果不随运行环境变化。
 */

const preset = createPresetWorkspace();
const DEVICE: DeviceSettings = { os: 'linux', user_names: { linux: 'alice', macos: '', windows: '' } };

function agentId(name: string): string {
  return preset.agents.find((agent) => agent.name === name)?.id ?? '';
}

describe('预设：合成与导入校验', () => {
  it('实际的预设文件合成时没有语法错误和警告', () => {
    const { files, locale } = readPresetFiles();
    const result = composePresets(files, locale);
    expect(result).not.toHaveProperty('syntaxErrors');
    expect('warnings' in result && result.warnings).toEqual([]);
  });

  it('预设工作区导出后再导入，通过校验且内容不变', () => {
    expect(importWorkspace(exportWorkspace(preset).text)).toEqual({ workspace: preset });
  });

  it('Agent 按优先级排列：Claude Code、Codex CLI 在前，Antigravity、Qwen Code 居中', () => {
    expect(preset.agents.map((agent) => agent.name)).toEqual([
      'Claude Code',
      'Codex CLI',
      'Antigravity',
      'Qwen Code',
      'CodeBuddy Code',
      'Devin CLI',
    ]);
  });
});

describe('预设：内容整理', () => {
  it('高危命令工具恰好是 rm、sudo、dd、mkfs、chmod、chown、curl、wget、nc、socat', () => {
    const highRisk = preset.command_tools.filter((tool) => tool.high_risk).map((tool) => tool.key);
    expect(highRisk.toSorted()).toEqual(
      ['rm', 'sudo', 'dd', 'mkfs', 'chmod', 'chown', 'curl', 'wget', 'nc', 'socat'].toSorted()
    );
  });

  it('每个 MCP Server 各有一条允许整个 Server 的共享规则', () => {
    for (const server of preset.mcp_servers) {
      const allowWhole = preset.rules.filter(
        (rule) =>
          rule.tool.type === 'mcp' && rule.tool.id === server.id && rule.pattern === '' && rule.decision === 'allow'
      );
      expect(allowWhole, server.key).toHaveLength(1);
    }
  });

  it('新增命令工具时要补规则：没有规则的命令只能是交给 Agent 默认行为的 dd、mkfs、chmod、chown', () => {
    const EXEMPT = new Set(['dd', 'mkfs', 'chmod', 'chown']);
    const ruled = new Set(preset.rules.filter((rule) => rule.tool.type === 'command').map((rule) => rule.tool.id));
    const withoutRules = preset.command_tools.filter((tool) => !ruled.has(tool.id) && !EXEMPT.has(tool.key));
    expect(withoutRules.map((tool) => tool.key)).toEqual([]);
  });

  it('MCP 内容不带 description，说明写在 Server 的描述字段', () => {
    for (const server of preset.mcp_servers) {
      expect(Object.keys(server.content), server.key).not.toContain('description');
      expect(server.description, server.key).not.toBe('');
    }
  });

  it('不收录不是真实命令名的条目', () => {
    const keys = preset.command_tools.map((tool) => tool.key);
    expect(keys).not.toContain('ripgrep');
    expect(keys).not.toContain('tealdeer');
    expect(keys).toEqual(expect.arrayContaining(['rg', 'tldr']));
  });

  it('工具引用的标签都是预设标签', () => {
    const tagIds = new Set(preset.tags.map((tag) => tag.id));
    const tools = [
      ...preset.command_tools,
      ...preset.mcp_servers,
      ...preset.agents.flatMap((agent) => agent.built_in_tools),
    ];
    for (const tool of tools) {
      for (const tagId of tool.tag_ids) {
        expect(tagIds.has(tagId), `${tool.key} → ${tagId}`).toBe(true);
      }
    }
  });

  it('不含个人绝对路径：主目录一律写成 {{home}} 或 ~', () => {
    const text = JSON.stringify(preset);
    expect(text).not.toMatch(/\/home\/|\/Users\/|[A-Za-z]:\\\\Users/);
    expect(text).toContain('{{home}}');
  });

  it('Claude Code 权限输出的作用域依次为用户级、项目级、项目本地级', () => {
    const scopes = generate(preset, agentId('Claude Code'), DEVICE)?.permission?.scopes ?? [];
    expect(scopes.map((scope) => scope.name)).toEqual(['用户级', '项目级', '项目本地级']);
  });

  it('Claude Code 的权限不使用 {{home}}：单个前导 / 在它的路径规则里表示相对路径', () => {
    const permission = generate(preset, agentId('Claude Code'), DEVICE)?.permission;
    expect(permission?.copyText).not.toContain('{{home}}');
    expect(permission?.copyText).not.toContain('/home/alice');
  });
});

describe('预设：与 Claude Code 写法相近的 Agent', () => {
  function allowOf(name: string): string[] {
    return (
      generate(preset, agentId(name), DEVICE)?.permission?.decisions.find((d) => d.decision === 'allow')?.entries ?? []
    );
  }

  it('Qwen Code 的命令规则写作 Bash(git *)，整个 MCP Server 写作 mcp__server', () => {
    expect(allowOf('Qwen Code')).toEqual(expect.arrayContaining(['Bash(git *)', 'mcp__memory']));
  });

  it('CodeBuddy Code 的命令规则用文档给出的 :* 前缀写法', () => {
    expect(allowOf('CodeBuddy Code')).toEqual(expect.arrayContaining(['Bash(git:*)', 'mcp__memory']));
  });

  it('Devin CLI 的命令规则写作 Exec(prefix)，整个 MCP Server 写作 mcp__server__*', () => {
    expect(allowOf('Devin CLI')).toEqual(expect.arrayContaining(['Exec(git)', 'mcp__memory__*']));
  });
});

describe('预设：各 Agent 的生成快照', () => {
  it.each(['Claude Code', 'Antigravity', 'Codex CLI', 'Qwen Code', 'CodeBuddy Code', 'Devin CLI'])('%s', (name) => {
    const output = generate(preset, agentId(name), DEVICE);
    expect(output).not.toBeNull();
    expect(output).toMatchSnapshot();
  });
});
