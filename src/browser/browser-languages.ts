/** 浏览器的语言偏好，按偏好顺序排列。有的浏览器 `navigator.languages` 为空，这时只用 `navigator.language`。 */
export function browserLanguages(): readonly string[] {
  return navigator.languages.length > 0 ? navigator.languages : [navigator.language];
}
