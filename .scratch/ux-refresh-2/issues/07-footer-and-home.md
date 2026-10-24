# 07: 页脚与宣传首页

**What to build:** 按 spec 的“页脚”和“首页”两节，更新页脚文案并加 GitHub 链接，新增作为默认入口的宣传首页。

**Blocked by:** 无

**Status:** done

- [x] 页脚左侧文案改为“数据只保存在你的浏览器和你选择的同步位置，本站不收集任何数据”；右侧放 GitHub 图标链接，指向 `https://github.com/xianghongai/agent-weave`，新标签页打开，带 `rel="noreferrer"`，无障碍标签为“GitHub 仓库”
- [x] GitHub 标志用内联 SVG，放在单独的组件中；不加版权声明
- [x] 新建 `src/pages/home/`，路由 `/` 指向首页，打开站点默认进入首页；首页不在 `registry.ts` 中登记，在首页时导航不高亮任何一项；删除“`/` 显示第一个登记页面”的逻辑
- [x] 首页包含主标语、介绍、三张可点击的流程卡片（分别进入权限规则、Agent、输出页）和“开始编写规则”按钮，文案见 spec；介绍中的 Agent 名单以省略号结尾，不写具体数量
- [x] 宽屏下一屏放下，窄屏可以滚动；进场动效用 `motion/react`，遵循 `reducedMotion="user"`
- [x] 检查 `registry.ts` 的注释与 `AGENTS.md` 中关于首页的描述是否一致
- [x] 在浏览器中验证：打开站点进入首页，点击 Logo 回到首页；宽屏和窄屏、深浅主题下布局正常
