/** Markdown 中有特殊含义的 ASCII 标点，即 CommonMark 允许用反斜杠转义的那些字符。 */
const SPECIAL_CHARACTERS = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g;

/**
 * 转义 Markdown 特殊字符，让插进 Markdown 文案的用户数据（如 Agent 名称）按原文显示。
 * 凡是把用户数据插进交给 `<Markdown>` 渲染的文案，都先经过这个函数。
 */
export function escapeMarkdown(text: string): string {
  return text.replace(SPECIAL_CHARACTERS, (character) => `\\${character}`);
}
