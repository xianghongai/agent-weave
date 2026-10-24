import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { useLayoutEffect, useRef, useState } from 'react';

import { type CodeLanguage, codeLanguage, codeTheme } from '@/components/code-theme';

interface CodeViewProps {
  value: string;
  language: CodeLanguage;
  /** 读屏软件读出的名称。 */
  label: string;
  className?: string;
}

/**
 * 只读的代码视图：语法高亮、行号，长行折行。
 * 高度随内容展开，自身不出现滚动条，由所在页面负责滚动。
 */
export function CodeView({ value, language, label, className }: CodeViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // 语言和名称会随属性变化，放进同一个 Compartment，变化时重新配置，不重建编辑器。
  // 创建和更新都在绘制前完成，挂载时不会先闪一下空白的编辑器。
  const [config] = useState(() => new Compartment());

  useLayoutEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }
    const view = new EditorView({
      parent,
      state: EditorState.create({
        extensions: [
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          EditorView.lineWrapping,
          lineNumbers(),
          codeTheme,
          config.of([]),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [config]);

  useLayoutEffect(() => {
    viewRef.current?.dispatch({
      effects: config.reconfigure([codeLanguage(language), EditorView.contentAttributes.of({ 'aria-label': label })]),
    });
  }, [config, language, label]);

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={parentRef} className={className} />;
}
