import { devtools } from 'zustand/middleware';

/**
 * 只在开发环境接入 Redux DevTools 的 `devtools` 中间件。
 * 生产构建中 `import.meta.env.DEV` 是常量 `false`，这里退化为原样返回，`devtools` 的实现随之被摇树移除。
 * 退化后 `set` 的第三个参数（action 名称）会被忽略，类型仍按 `devtools` 声明，store 的写法不用区分环境。
 */
export const devtoolsInDev = (
  import.meta.env.DEV ? devtools : (initializer: unknown) => initializer
) as typeof devtools;
