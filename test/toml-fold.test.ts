import { describe, expect, it } from 'vitest';

import { tomlTableFoldEnd } from '@/lib/toml-fold';

const lines = [
  '[mcp_servers.github]',
  'command = "npx"',
  'args = ["-y", "@modelcontextprotocol/server-github"]',
  '',
  '[mcp_servers.github.env]',
  'GITHUB_TOKEN = "x"',
  '',
  '[mcp_servers.empty]',
  '',
  '[[mcp_servers.list]]',
  'name = "a"',
];

describe('TOML 按表折叠', () => {
  it('表头折叠到下一个表头之前的最后一个非空行', () => {
    expect(tomlTableFoldEnd(lines, 0)).toBe(2);
    expect(tomlTableFoldEnd(lines, 4)).toBe(5);
  });

  it('最后一个表折叠到文件末尾，数组表同样可以折叠', () => {
    expect(tomlTableFoldEnd(lines, 9)).toBe(10);
  });

  it('不是表头的行、没有内容的表都不能折叠', () => {
    expect(tomlTableFoldEnd(lines, 1)).toBeNull();
    expect(tomlTableFoldEnd(lines, 7)).toBeNull();
  });
});
