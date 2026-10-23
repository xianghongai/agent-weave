import { describe, expect, it } from 'vitest';

import { CONTENT_SECURITY_POLICY } from '../build/content-security-policy';

/** 把策略拆成“指令 → 来源列表”，便于逐条断言。 */
function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter((tokens) => tokens[0] !== '')
      .map(([name = '', ...sources]) => [name, sources])
  );
}

describe('构建产物的 CSP', () => {
  const policy = directives(CONTENT_SECURITY_POLICY);

  it('网络请求只放行本站和 GitHub API', () => {
    expect(policy.get('connect-src')).toEqual(["'self'", 'https://api.github.com']);
  });

  it('未声明的资源类型一律禁止', () => {
    expect(policy.get('default-src')).toEqual(["'none'"]);
  });

  it('脚本、样式、字体只从本站加载，不引用 CDN', () => {
    expect(policy.get('script-src')).toEqual(["'self'"]);
    expect(policy.get('style-src')).toEqual(["'self'", "'unsafe-inline'"]);
    expect(policy.get('font-src')).toEqual(["'self'"]);
  });

  it('除 connect-src 外，没有任何指令放行外部域名', () => {
    for (const [name, sources] of policy) {
      const external = name === 'connect-src' ? [] : sources.filter((source) => /^(https?:|\*|\/\/)/.test(source));
      expect({ name, external }).toEqual({ name, external: [] });
    }
  });
});
