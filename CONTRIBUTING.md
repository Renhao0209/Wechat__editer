# 贡献指南（Contributing）

感谢你愿意为本项目贡献主题/组件/模板/套版。

在参与前请阅读：

- 行为准则：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Issue/PR 模板：`.github/` 目录下（GitHub 会自动加载）

本项目的核心目标是：在 **公众号编辑器/粘贴环境** 下尽量保持「预览 / 导出 / 复制（含内联）」一致，因此贡献时会更偏向**稳定、可复用、可维护**。

## 快速开始

- Node.js 20+（推荐 LTS；仓库 CI 使用 Node 24）

```bash
npm install
npm run dev
```

自检：

```bash
npm run lint
npm run build
```

## 贡献范围与目录约定

为了让 PR 更容易 review，也方便后续按分区更新，请尽量按下面目录提交：

- 主题（内置主题注册表）：`src/wechat/themes/`
- 组件/模板/套版：`src/wechat/library/`
- 样式与导出（预览/导出 CSS、内联导出）：`src/wechat/wechatStyles.ts`、`src/wechat/inlineWeChat.ts`
- 编辑器 UI/交互逻辑：`src/wechat/WeChatEditor.tsx`
- 文档：`README.md`、`CONTRIBUTING.md`

## 提交规范（推荐 Conventional Commits）

建议使用以下前缀（不强制，但强烈推荐）：

- `theme:` 主题变更（新增/修改内置主题）
- `library:` 组件/模板/套版变更
- `style:` 预览/导出/内联样式变更
- `core:` 编辑器逻辑/UI 变更
- `docs:` 文档变更
- `fix:` Bug 修复

示例：

- `theme: add ocean built-in theme`
- `library: add callout/guide components`
- `style: inline export supports new class`

## 新增/修改内置主题

内置主题采用“一主题一文件”的分区，便于 review 与按主题独立提交。

文件：

- 主题文件：`src/wechat/themes/builtins/<themeId>.ts`
- 注册聚合：`src/wechat/themes/builtins/index.ts`
- 主题 id 类型：`src/wechat/themes/themeTypes.ts`（`BuiltInWeChatThemeId`）

步骤：

1. 新增主题文件（例如 `ocean.ts`）：
   - `id`：小写英文短 id，保持唯一
   - `label`：UI 下拉展示名
   - `vars`：仅放 `--wechat-*` 变量
   - `extraCss`（可选）：额外规则，建议尽量限制在 `.wechat-article` 范围内
2. 在 `src/wechat/themes/builtins/index.ts` 里把新主题加入 `BUILT_IN_THEMES_LIST`
3. 在 `src/wechat/themes/themeTypes.ts` 里把新主题 id 加进 `BuiltInWeChatThemeId`
2. 约束建议：
   - 不使用外链资源（字体/图片/JS 等）
   - 选择器尽量简单，避免过深嵌套
   - 避免依赖复杂布局（公众号粘贴环境会丢样式）
3. 自检：
   - UI 下拉能选到主题
   - 预览与导出 CSS 生效
   - “复制内联 HTML（更稳）”结果颜色一致

## 新增组件（组件化素材库）

组件采用“一组件一文件”的分区，便于 review 与按组件独立提交。

文件：

- 组件文件：`src/wechat/library/components/<componentId>.ts`
- 注册聚合：`src/wechat/library/components/index.ts`
- 旧入口（保留，供 UI 使用）：`src/wechat/library/components.ts`

步骤：

1. 新增组件文件（例如 `calloutWarn.ts`），导出一个组件定义：
   - `id`：唯一（建议 `camelCase` 或 `kebab-case`）
   - `name/desc/category`：用于面板展示
   - `html`：大多数组件使用 HTML 字符串即可
   - `content`：如果组件包含自定义节点（例如滚动容器 `scrollBox`），请使用结构化内容插入
2. 在 `src/wechat/library/components/index.ts` 里把新组件加入 `BUILT_IN_COMPONENTS_LIST`
2. 兼容性建议：
   - 优先使用编辑器已支持的结构：标题/段落/列表/blockquote/hr/img/link
   - 需要自定义容器（`div` 等）时，请先做 Tiptap Node 扩展（参考 `src/wechat/extensions/scrollBox.ts`）
3. 样式一致性（重要）：
   - 新增了新的 `class` 时，请同时补齐：
     - `src/wechat/wechatStyles.ts`（预览/导出 CSS）
     - `src/wechat/inlineWeChat.ts`（内联导出映射，提升公众号粘贴稳定性）

## 新增模板/整篇套版

- 模板：`src/wechat/library/templates.ts`
- 套版：`src/wechat/library/layoutPresets.ts`

建议复用现有样式类：`lead / section / titlebar / badge / callout / card / guide / divider`。

## PR 提交前检查清单

- [ ] `npm run lint` 通过
- [ ] `npm run build` 通过
- [ ] 新主题/组件在 UI 可见（组件能插入到光标位置）
- [ ] 导出 CSS 与“复制内联 HTML（更稳）”表现合理
- [ ] PR 内容聚焦（尽量只改一个分区）

说明：仓库已配置 GitHub Actions，PR 会自动跑 `npm ci` / `npm run lint` / `npm run build`。

## 版本与发布（最小策略）

目标：让后续“主题/组件/套版”的更新在 GitHub 上更容易追踪和回滚。

### 版本号约定（SemVer）

- `MAJOR`：破坏性变更（例如导出/内联规则调整导致旧内容表现不一致、数据结构变更等）
- `MINOR`：新增向后兼容能力（新增主题/组件/模板/套版、增加导出选项等）
- `PATCH`：修复/小优化（不新增能力，或仅修复 bug/样式细节）

### Tag 规则

- 统一使用：`vMAJOR.MINOR.PATCH`
   - 示例：`v0.1.0`、`v0.1.1`、`v0.2.0`

### 发布流程（维护者执行）

1. 更新变更记录：修改 `CHANGELOG.md`
    - 将 `Unreleased` 下本次内容整理到新版本段落（例如 `## [0.2.0] - 2026-01-28`）
2. 更新版本号：修改 `package.json` 的 `version`
3. 生成构建产物自检：`npm run lint`、`npm run build`
4. 打 tag（建议 annotated tag）：

```bash
git tag -a v0.2.0 -m "v0.2.0"
git push origin v0.2.0
```

说明：如果你不确定该升 `MINOR` 还是 `PATCH`，一般“新增主题/组件/套版”优先用 `MINOR`。
