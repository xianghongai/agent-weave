/**
 * 标签的配色序号：按内部 ID 散列，同一个标签在任何设备上都是同一种颜色，改名也不变。
 * 用 FNV-1a 散列，结果在 `[0, count)` 之内。
 */
export function tagToneIndex(id: string, count: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}
