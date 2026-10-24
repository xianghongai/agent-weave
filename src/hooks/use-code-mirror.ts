import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type RefObject, useLayoutEffect, useRef, useState } from 'react';

interface CodeMirrorOptions {
  /** 编辑器的内容。外部改写时整体替换；与编辑器当前内容一致时不派发，编辑器自己产生的变化不会再写回。 */
  value: string;
  /** 创建编辑器时的固定扩展，只在挂载时读取一次。 */
  extensions: () => Extension;
  /** 随属性变化的配置，如语言、内容区属性。由调用方用 `useMemo` 保持引用稳定，变化时重新配置，不重建编辑器。 */
  config: Extension;
}

export interface CodeMirror {
  /** 挂载编辑器的容器元素。 */
  parentRef: RefObject<HTMLDivElement | null>;
  /** 当前的编辑器实例，挂载前和卸载后为 `null`。 */
  viewRef: RefObject<EditorView | null>;
}

/**
 * CodeMirror 编辑器的生命周期：挂载时在容器中创建编辑器，卸载时销毁。
 * 创建、重新配置和同步内容都在绘制前完成，挂载时不会先闪一下空白的编辑器。
 */
export function useCodeMirror({ value, extensions, config }: CodeMirrorOptions): CodeMirror {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [compartment] = useState(() => new Compartment());
  const [initialExtensions] = useState(extensions);

  useLayoutEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }
    const view = new EditorView({
      parent,
      state: EditorState.create({ extensions: [initialExtensions, compartment.of([])] }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [compartment, initialExtensions]);

  useLayoutEffect(() => {
    viewRef.current?.dispatch({ effects: compartment.reconfigure(config) });
  }, [compartment, config]);

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return { parentRef, viewRef };
}
