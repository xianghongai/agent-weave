import { json } from '@codemirror/lang-json';
import { HighlightStyle, StreamLanguage, foldService, syntaxHighlighting } from '@codemirror/language';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

import { tomlTableFoldEnd } from '@/lib/toml-fold';

/*
 * CodeMirror 的外观与语言，只读的代码视图和可编辑的输入框共用。
 * 颜色全部取自 `src/index.css` 的 CSS 变量，深浅色由 `<html>` 的 `dark` class 切换，主题本身不区分深浅。
 * 字号继承自容器，由使用方用 class 设置。
 */

export type CodeLanguage = 'json' | 'toml';

const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--foreground)',
    backgroundColor: 'transparent',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.625',
  },
  '.cm-content': {
    padding: '0.75rem 0',
    caretColor: 'var(--foreground)',
  },
  '.cm-line': {
    padding: '0 0.75rem',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--foreground)',
  },
  // 可编辑实例启用 drawSelection 时生效；只读实例用浏览器原生选区，跟随全局的 ::selection。
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'color-mix(in oklab, var(--brand) 30%, transparent)',
  },
  // 行号不参与选区：拖动选择时不会选中行号，复制的文本也不带行号。
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--muted-foreground)',
    borderRight: '1px solid var(--border)',
    userSelect: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 0.5rem 0 0.75rem',
  },
  // 折叠栏只在只读的代码视图中出现。
  '.cm-foldGutter .cm-gutterElement': {
    padding: '0 0.25rem',
    cursor: 'pointer',
  },
  '.cm-foldGutter .cm-gutterElement:hover': {
    color: 'var(--foreground)',
  },
  '.cm-foldPlaceholder': {
    margin: '0 0.25rem',
    padding: '0 0.25rem',
    border: '1px solid var(--border)',
    borderRadius: '0.25rem',
    backgroundColor: 'var(--muted)',
    color: 'var(--muted-foreground)',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in oklab, var(--muted) 60%, transparent)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
  },
  // 以下只在可编辑实例中出现。
  '.cm-placeholder': {
    color: 'var(--muted-foreground)',
  },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'color-mix(in oklab, var(--brand) 25%, transparent)',
  },
  '&.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: 'color-mix(in oklab, var(--destructive) 25%, transparent)',
  },
});

const highlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--syntax-property)' },
  { tag: tags.string, color: 'var(--syntax-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--syntax-literal)' },
  { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: [tags.brace, tags.squareBracket, tags.bracket, tags.separator], color: 'var(--syntax-punctuation)' },
]);

/** 主题与高亮颜色。 */
export const codeTheme: Extension = [editorTheme, syntaxHighlighting(highlightStyle)];

/** TOML 的 legacy mode 没有语法树，按表折叠：从表头行末折叠到这个表的最后一个非空行。 */
const tomlFolding = foldService.of((state, lineStart) => {
  const line = state.doc.lineAt(lineStart);
  const end = tomlTableFoldEnd(state.doc.toJSON(), line.number - 1);
  return end === null ? null : { from: line.to, to: state.doc.line(end + 1).to };
});

const tomlLanguage = [StreamLanguage.define(toml), tomlFolding];

/** 语言支持：JSON 用 Lezer 语法，按对象和数组折叠；TOML 用 legacy mode，按表折叠。 */
export function codeLanguage(language: CodeLanguage): Extension {
  return language === 'json' ? json() : tomlLanguage;
}
