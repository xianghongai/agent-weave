import type { DeviceSettings, JsonObject, JsonValue, OperatingSystem } from '@/lib/workspace';

/*
 * 路径占位符：输出时把规则模式和 MCP Server 内容中的 `{{home}}`、`{{user}}` 展开为本机的真实路径。
 * 由生成调用，不单独暴露给界面。`${VAR}` 等其他写法不做任何处理。
 * 展开时只用所选操作系统的用户名。
 * 本机设置不完整（没有选择操作系统或所选系统的用户名为空）时，占位符一律原样保留，由生成给出提示。
 */

const HOME_BY_OS: Record<OperatingSystem, (userName: string) => string> = {
  linux: (userName) => `/home/${userName}`,
  macos: (userName) => `/Users/${userName}`,
  windows: (userName) => `C:\\Users\\${userName}`,
};

const PLACEHOLDER = /\{\{(home|user)\}\}/g;

/** 展开结果。`unexpanded` 表示其中有占位符因本机设置不完整而原样保留。 */
export interface Expanded<T> {
  value: T;
  unexpanded: boolean;
}

/** 本机设置是否完整：选择了操作系统，且该系统的用户名去掉首尾空白后不为空。 */
export function isDeviceSettingsComplete(device: DeviceSettings): boolean {
  return device.os !== null && device.user_names[device.os].trim() !== '';
}

/** 展开一段文本。 */
export function expandText(text: string, device: DeviceSettings): Expanded<string> {
  if (device.os === null || !isDeviceSettingsComplete(device)) {
    return { value: text, unexpanded: new RegExp(PLACEHOLDER.source).test(text) };
  }
  const userName = device.user_names[device.os].trim();
  const values = { home: HOME_BY_OS[device.os](userName), user: userName };
  // 用函数替换，避免用户名中的 `$` 被当作替换模式。
  return { value: text.replace(PLACEHOLDER, (_, name: keyof typeof values) => values[name]), unexpanded: false };
}

/** 展开 MCP Server 内容中的所有字符串值，包括嵌套在对象和数组中的；对象的键、数字、布尔值和 `null` 不变。 */
export function expandContent(content: JsonObject, device: DeviceSettings): Expanded<JsonObject> {
  let unexpanded = false;
  const walkValue = (node: JsonValue): JsonValue => {
    if (typeof node === 'string') {
      const result = expandText(node, device);
      unexpanded ||= result.unexpanded;
      return result.value;
    }
    if (Array.isArray(node)) {
      return node.map(walkValue);
    }
    return node !== null && typeof node === 'object' ? walkObject(node) : node;
  };
  const walkObject = (node: JsonObject): JsonObject =>
    Object.fromEntries(Object.entries(node).map(([key, child]) => [key, walkValue(child)]));
  return { value: walkObject(content), unexpanded };
}
