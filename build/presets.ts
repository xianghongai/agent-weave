import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

import { type Language, byLanguage } from '../src/lib/language';
import { type PresetFile, type PresetWarning, composePresets } from '../src/lib/preset-composition';
import type { Workspace } from '../src/lib/workspace';

/*
 * 预设插件：读取仓库根目录 `presets/` 下的 JSONC，按每种界面语言各交给 `composePresets` 合成一次，
 * 以虚拟模块 `virtual:preset-workspace` 提供 `Record<Language, Workspace>`（默认导出），见 ADR 0005。
 * 语法错误让构建失败；逻辑问题只输出警告，由单元测试在 CI 中拦截，见 ADR 0004。
 */

export const PRESET_DIR = fileURLToPath(new URL('../presets', import.meta.url));

/** 某种语言的语言文件，相对预设目录。 */
function localePath(language: Language): string {
  return `locales/${language}.json`;
}

const VIRTUAL_ID = 'virtual:preset-workspace';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/** 读取预设目录：全部 `.jsonc` 数据文件（不含语言目录），以及每种语言的语言文件。路径相对预设目录，用 `/` 分隔。 */
export function readPresetFiles(dir: string = PRESET_DIR): {
  files: PresetFile[];
  locales: Record<Language, PresetFile>;
} {
  const read = (path: string): PresetFile => ({ path, text: readFileSync(join(dir, path), 'utf8') });
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((path) => path.split(sep).join('/'))
    .filter((path) => path.endsWith('.jsonc') && !path.startsWith('locales/'))
    .toSorted()
    .map(read);
  return { files, locales: byLanguage((language) => read(localePath(language))) };
}

/**
 * 构建警告的文字，路径相对仓库根目录。`locale` 是这次合成用的语言文件，指明警告来自哪种语言。
 * 只给维护者看，不翻译。
 */
export function formatPresetWarning(warning: PresetWarning, locale: PresetFile): string {
  switch (warning.kind) {
    case 'invalidFile':
      return warning.key === undefined
        ? `presets/${warning.path}：顶层不是对象`
        : `presets/${warning.path}：顶层键 ${warning.key} 不是已知的键，或取值类型不对`;
    case 'invalidWorkspace':
      return `按 presets/${locale.path} 合成的预设没有通过工作区校验：${warning.problem}${warning.entryId ? `（${warning.entryId}）` : ''}`;
    case 'missingMessage':
      return `presets/${locale.path} 中缺少文案键 ${warning.key}`;
    case 'unusedMessage':
      return `presets/${locale.path} 中的文案键 ${warning.key} 没有被任何条目使用`;
  }
}

export function presets(): Plugin {
  return {
    name: 'presets',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) {
        return undefined;
      }
      const { files, locales } = readPresetFiles();
      for (const file of [...files, ...Object.values(locales)]) {
        this.addWatchFile(join(PRESET_DIR, file.path));
      }
      // 数据文件的问题每种语言都会报一次，去重后再输出。
      const syntaxErrors = new Set<string>();
      const warnings = new Set<string>();
      // 有语法错误的语言得到 `null`，随后构建失败，不会输出。
      const workspaces = byLanguage((language): Workspace | null => {
        const locale = locales[language];
        const result = composePresets(files, locale);
        if ('syntaxErrors' in result) {
          for (const error of result.syntaxErrors) {
            syntaxErrors.add(`presets/${error.path}:${error.line}:${error.column} ${error.code}`);
          }
          return null;
        }
        for (const warning of result.warnings) {
          warnings.add(formatPresetWarning(warning, locale));
        }
        return result.workspace;
      });
      if (syntaxErrors.size > 0) {
        this.error(`预设文件有语法错误：\n${[...syntaxErrors].join('\n')}`);
      }
      for (const warning of warnings) {
        this.warn(warning);
      }
      return `export default JSON.parse(${JSON.stringify(JSON.stringify(workspaces))});\n`;
    },
    // 开发服务器：预设目录中增删改文件时重新合成，新增的文件也能被发现。
    configureServer(server) {
      server.watcher.add(PRESET_DIR);
      server.watcher.on('all', (_event, path) => {
        if (relative(PRESET_DIR, path).startsWith('..')) {
          return;
        }
        const module = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) {
          void server.reloadModule(module);
        }
      });
    },
  };
}
