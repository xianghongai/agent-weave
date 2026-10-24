import { foldGutter } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { useMemo } from 'react';

import { type CodeLanguage, codeLanguage, codeTheme } from '@/components/code-theme';
import { useCodeMirror } from '@/hooks/use-code-mirror';

interface CodeViewProps {
  value: string;
  language: CodeLanguage;
  /** 读屏软件读出的名称。 */
  label: string;
  className?: string;
}

/**
 * 只读的代码视图：语法高亮、行号，长行折行；点击行号旁的箭头折叠或展开对象、数组和 TOML 表。
 * 高度随内容展开，自身不出现滚动条，由所在页面负责滚动。
 */
export function CodeView({ value, language, label, className }: CodeViewProps) {
  const config = useMemo(
    () => [codeLanguage(language), EditorView.contentAttributes.of({ 'aria-label': label })],
    [language, label]
  );
  const { parentRef } = useCodeMirror({
    value,
    extensions: () => [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      lineNumbers(),
      foldGutter(),
      codeTheme,
    ],
    config,
  });

  return <div ref={parentRef} className={className} />;
}
