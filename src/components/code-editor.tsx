import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
} from '@codemirror/view';
import { cn } from 'cn';
import { type Ref, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';

import { type CodeLanguage, codeLanguage, codeTheme } from '@/components/code-theme';
import { useCodeMirror } from '@/hooks/use-code-mirror';

export interface CodeEditorHandle {
  focus: () => void;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  /** 编辑区域的 id。 */
  id?: string;
  /** 标签元素的 id。编辑区域不是表单控件，`<label htmlFor>` 对它无效，名称通过 `aria-labelledby` 关联。 */
  labelId?: string;
  /** 说明或错误提示元素的 id。 */
  describedBy?: string;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  /** 点击标签时用 `focus()` 把焦点移进编辑区域。 */
  ref?: Ref<CodeEditorHandle>;
}

/*
 * 编辑器自身的尺寸：高度随内容增长，超出后在编辑器内滚动。
 * 长行折行，窄屏下不出现横向滚动条。
 */
const sizeTheme = EditorView.theme({
  '&': { maxHeight: '20rem' },
  '.cm-scroller': { minHeight: '8rem' },
});

/*
 * Esc 留给 CodeMirror：它在按 Esc 后的两秒内放行 Tab，让键盘用户离开编辑器。
 * 不阻止冒泡的话，所在的对话框会先响应 Esc 关闭，所以在编辑器内阻止冒泡；离开编辑器后再按 Esc 照常关闭对话框。
 */
const keepEscape = EditorView.domEventHandlers({
  keydown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
    }
    return false;
  },
});

/**
 * 可编辑的代码输入框：语法高亮、行号、括号匹配、自动缩进，Tab 缩进，可撤销。
 * 不提供自动补全和实时报错，内容的校验由使用方在提交时进行。
 * 字号窄屏 16px、宽屏 14px，避免 iOS Safari 在获得焦点时放大页面。
 */
export function CodeEditor({
  value,
  onChange,
  language,
  id,
  labelId,
  describedBy,
  invalid,
  placeholder,
  className,
  ref,
}: CodeEditorProps) {
  // 编辑器只创建一次，回调通过 ref 取最新的 onChange。
  const onChangeRef = useRef(onChange);

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  const config = useMemo(() => {
    const attributes: Record<string, string> = {};
    if (id) {
      attributes.id = id;
    }
    if (labelId) {
      attributes['aria-labelledby'] = labelId;
    }
    if (describedBy) {
      attributes['aria-describedby'] = describedBy;
    }
    if (invalid) {
      attributes['aria-invalid'] = 'true';
    }
    return [
      codeLanguage(language),
      EditorView.contentAttributes.of(attributes),
      placeholder ? placeholderExtension(placeholder) : [],
    ];
  }, [language, id, labelId, describedBy, invalid, placeholder]);

  const { parentRef, viewRef } = useCodeMirror({
    value,
    extensions: () => [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      EditorView.lineWrapping,
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      keepEscape,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      codeTheme,
      sizeTheme,
    ],
    config,
  });

  useImperativeHandle(ref, () => ({ focus: () => viewRef.current?.focus() }), [viewRef]);

  return (
    <div
      ref={parentRef}
      data-invalid={invalid ? true : undefined}
      className={cn(
        'w-full overflow-hidden rounded-lg border border-input bg-transparent font-mono text-base transition-colors md:text-sm dark:bg-input/30',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        'data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40',
        className
      )}
    />
  );
}
