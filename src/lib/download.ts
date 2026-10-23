/** 让浏览器把一段文本保存为文件。 */
export function downloadText(fileName: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // 给浏览器一点时间开始下载，再释放 URL。
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
