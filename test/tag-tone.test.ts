import { describe, expect, it } from 'vitest';

import { tagToneIndex } from '@/lib/tag-tone';

describe('标签配色', () => {
  it('同一个标签每次得到同一种配色，且在配色数之内', () => {
    for (const id of ['new-1', 'tag-vcs', '6f1c2e0a-0000-4000-8000-000000000000']) {
      const index = tagToneIndex(id, 6);
      expect(index).toBe(tagToneIndex(id, 6));
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(6);
      expect(Number.isInteger(index)).toBe(true);
    }
  });

  it('不同标签分散到不同配色上', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `new-${i + 1}`);
    expect(new Set(ids.map((id) => tagToneIndex(id, 6))).size).toBeGreaterThanOrEqual(4);
  });
});
