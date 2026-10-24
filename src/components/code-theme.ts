import { json } from '@codemirror/lang-json';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

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

const tomlLanguage = StreamLanguage.define(toml);

/** 语言支持：JSON 用 Lezer 语法，TOML 用 legacy mode。 */
export function codeLanguage(language: CodeLanguage): Extension {
  return language === 'json' ? json() : tomlLanguage;
}
