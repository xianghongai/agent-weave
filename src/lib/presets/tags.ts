import type { Tag } from '@/lib/workspace';

/** 预设标签，按工具用途分组。内部 ID 是固定值，“合并预设”按它判断条目是否已存在。 */
export const PRESET_TAGS: Tag[] = [
  { id: 'preset-tag-vcs', key: 'vcs', name: '版本控制' },
  { id: 'preset-tag-package-manager', key: 'package-manager', name: '包管理' },
  { id: 'preset-tag-search', key: 'search', name: '搜索' },
  { id: 'preset-tag-filesystem', key: 'filesystem', name: '文件系统' },
  { id: 'preset-tag-network', key: 'network', name: '网络' },
  { id: 'preset-tag-container', key: 'container', name: '容器' },
  { id: 'preset-tag-system', key: 'system', name: '系统' },
  { id: 'preset-tag-browser', key: 'browser', name: '浏览器' },
  { id: 'preset-tag-build', key: 'build', name: '编译构建' },
  { id: 'preset-tag-hardware', key: 'hardware', name: '硬件' },
];
