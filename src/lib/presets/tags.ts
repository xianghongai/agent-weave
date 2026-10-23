import type { Tag } from '@/lib/workspace';

/** 预设标签的标识。内部 ID 是 `preset-tag-<标识>`，供其他预设文件引用。 */
export type PresetTagKey =
  | 'vcs'
  | 'package-manager'
  | 'search'
  | 'filesystem'
  | 'text'
  | 'network'
  | 'container'
  | 'system'
  | 'browser'
  | 'build'
  | 'hardware';

function tag(key: PresetTagKey, name: string): Tag {
  return { id: presetTagId(key), key, name };
}

/** 预设标签的内部 ID。 */
export function presetTagId(key: PresetTagKey): string {
  return `preset-tag-${key}`;
}

/** 预设标签，按工具用途分组。内部 ID 是固定值，“合并预设”按它判断条目是否已存在。 */
export const PRESET_TAGS: Tag[] = [
  tag('vcs', '版本控制'),
  tag('package-manager', '包管理'),
  tag('search', '搜索'),
  tag('filesystem', '文件系统'),
  tag('text', '文本处理'),
  tag('network', '网络'),
  tag('container', '容器'),
  tag('system', '系统'),
  tag('browser', '浏览器'),
  tag('build', '编译构建'),
  tag('hardware', '硬件'),
];
