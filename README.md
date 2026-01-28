# 公众号排版编辑器（135 风格 · MVP）

一个基于 **Vite + React + TypeScript + Tiptap** 的公众号文章排版工具：左侧写作编辑，右侧手机预览，内置模板/组件/套版，并支持 **自定义主题（JSON / CSS 导入）** —— 让你能把「自己的品牌色与版式风格」稳定地应用到预览、复制与导出。

> 说明：本项目为个人学习/工具性质实现，不隶属于 135 编辑器/秀米/微信官方。

## 参与贡献

欢迎提交主题/组件/套版。规范流程与目录约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

- 行为准则：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- 提交前可先开 Issue（Bug / 主题提案 / 组件提案），仓库已提供模板（`.github/ISSUE_TEMPLATE/`）
- License：[LICENSE](LICENSE)
- 建议的 Issue/PR Labels：见 [.github/labels.md](.github/labels.md)

## 版本与发布（最小策略）

为了让“主题/组件/套版”的迭代更好追踪，本项目采用最小发布策略：

- 版本号：遵循 SemVer（`MAJOR.MINOR.PATCH`）
  - `MINOR`：新增主题/组件/模板/套版等向后兼容能力
  - `PATCH`：修复/小优化（不新增能力，或仅调整样式细节）
  - `MAJOR`：有破坏性变更（例如导出格式/数据结构变更导致旧内容不兼容）
- Tag 规则：`vMAJOR.MINOR.PATCH`（例：`v0.2.0`）
- 变更记录：见 [CHANGELOG.md](CHANGELOG.md)

## 特性

- 自定义主题（项目核心卖点）：
  - 支持导入主题变量 `--wechat-*` + 追加 `extraCss`
  - 预览与导出一致：复制富文本 / 复制内联HTML / 导出 HTML 都会应用同一套主题
  - 持久化保存：自定义主题与选择会保存在 `localStorage`
- 富文本编辑：标题（H1/H2/H3）、加粗/斜体/下划线/删除线、列表、引用、分割线、对齐、撤销/重做、链接、图片（URL/本地上传 Base64）
- 模板插入：章节标题、导语、花纹分隔、金句引用、Q&A、清单、图片+图注、提示框等
- 组件化模板库：标题条/徽章小标题/内容卡片/引导块等，一键插入到光标位置
- 一键整篇套版：内置整篇结构模板（覆盖套用）+ 智能套版（不覆盖，自动增强导语/章节/引用样式）
- 多主题：内置主题 + 自定义主题
- 预览模式：编辑 / 分屏 / 预览 三种视图切换（适配小屏幕）
- 复制/导出：
  - **复制富文本**：写入剪贴板 `text/html`，尽可能保留样式
  - **复制内联 HTML（更稳）**：将样式内联到节点上，更适合粘贴到公众号后台
  - 完整 HTML（含 `<style>`）/ 正文 HTML / CSS
  - 导出 HTML 文件（含内联版本）
- 本地持久化：文章内容、主题选择、自定义主题列表保存到 `localStorage`

## 快速开始

### 环境要求

- Node.js 18+（推荐 LTS）

### 安装与运行

```bash
npm install
npm run dev
```

构建与检查：

```bash
npm run lint
npm run build
npm run preview
```

## 使用指南

### 推荐工作流（更贴近公众号后台）

1. 写作 → 套模板 → 右侧预览确认
2. 点击 **“复制内联HTML（更稳）”**
3. 打开公众号后台（图文消息编辑）直接粘贴

如果你希望保留可维护的 CSS，而不是内联：

- 用 **“复制完整 HTML”**（含 `<style>`）导出整页
- 或 **“复制 CSS” + “复制文章 HTML”** 分开管理

### 智能套版会做什么？

在「套版」页签里点击 **“智能套版（不覆盖）”**，会基于内容做一些保守但实用的增强：

- 首段自动标记为导语（`p.lead`）
- 二级标题自动选择标题样式（`h2.section` / `h2.titlebar`）
- 三级标题自动加徽章（`h3.badge`，适合 Q/A 或短标题）
- 顶层段落里形如 `提示：...` / `注意：...` / `信息：...` / `结论：...` 会自动转换成 callout
- 多个章节之间会自动插入分隔符（若中间没有 `hr` 或 `p.divider`）

### 自定义主题导入

这是本项目的一个重要特点：你可以把主题当成“品牌皮肤”。

- 主题核心：`--wechat-*` CSS 变量（控制强调色、标题色、引用样式、背景等）
- 主题补充：`extraCss`（写额外规则，建议尽量限制在 `.wechat-article` 范围内）
- 应用范围：预览 + 导出 CSS/完整 HTML + 复制富文本 + 复制内联HTML（尽量保持一致）
- 持久化：导入的主题会保存在 `localStorage`，下次打开仍然可用

#### 方式 1：导入 JSON 主题

在页面中选择 **“导入JSON主题”**，粘贴如下结构：

```json
{
  "name": "自定义主题示例",
  "vars": {
    "--wechat-accent": "#2563eb",
    "--wechat-accent-soft": "rgba(37, 99, 235, 0.10)",
    "--wechat-accent-softer": "rgba(37, 99, 235, 0.06)",
    "--wechat-heading": "#111827",
    "--wechat-quote-border": "rgba(37, 99, 235, 0.28)",
    "--wechat-quote-bg": "rgba(37, 99, 235, 0.06)",
    "--wechat-pre-bg": "rgba(2, 6, 23, 0.06)"
  },
  "extraCss": ".wechat-article h1 { box-shadow: 0 10px 24px rgba(37, 99, 235, 0.10); }"
}
```

#### 方式 2：导入 CSS 主题

选择 **“导入CSS主题”**：

- 自动提取所有 `--wechat-*` 变量为主题变量
- 其余 CSS 会作为额外样式保存（建议尽量写在 `.wechat-article` 范围内）

示例：

```css
:root {
  --wechat-accent: #16a34a;
  --wechat-quote-bg: rgba(22, 163, 74, 0.06);
}

.wechat-article h1 {
  box-shadow: 0 10px 24px rgba(22, 163, 74, 0.10);
}
```

## 项目结构

核心代码集中在：

- src/wechat/WeChatEditor.tsx：主编辑器 UI、模板、主题、导入导出、剪贴板复制
- src/wechat/wechatStyles.ts：基础排版 CSS + 主题 CSS + 完整 HTML 文档构建
- src/wechat/inlineWeChat.ts：生成“内联样式 HTML”（更稳粘贴到公众号）
- src/wechat/wechatEditor.css：编辑器 UI（顶栏/工具栏/预览/弹窗等）
- src/wechat/extensions/*WithClass.ts：Tiptap 扩展（保留 `class`，用于模板样式）

为方便后续在 GitHub 上“只更新主题/只更新组件”分区提交，已拆分：

- src/wechat/themes/themeTypes.ts：主题类型定义（内置主题/自定义主题）
- src/wechat/themes/builtInThemes.ts：内置主题注册表（新增/修改主题优先改这里）
- src/wechat/library/templates.ts：模板插入列表
- src/wechat/library/components.ts：组件库列表
- src/wechat/library/layoutPresets.ts：整篇套版列表

## 贡献指南（欢迎提交主题/组件）

本项目非常欢迎大家提交：**新主题**、**新组件**、**新模板/套版**。为了让 PR 更容易 review、也方便你后续按分区更新，请尽量按下面约定提交。

### 提交范围（建议的 Commit/PR 分区）

- 只改主题：仅改 `src/wechat/themes/`（commit 前缀建议：`theme:`）
- 只改组件/模板/套版：仅改 `src/wechat/library/`（commit 前缀建议：`library:`）
- 只改样式与导出：改 `src/wechat/wechatStyles.ts` / `src/wechat/inlineWeChat.ts`（前缀建议：`style:`）
- 只改文档：改 `README.md`（前缀建议：`docs:`）
- 改编辑器逻辑/UI：改 `src/wechat/WeChatEditor.tsx`（前缀建议：`core:`）

### 如何新增/修改内置主题

目标：让主题在 **下拉选择 / 预览 / 导出 CSS / 复制内联 HTML** 中保持一致。

1. 在 `src/wechat/themes/builtInThemes.ts` 中新增一条主题：
  - `id`：英文短 id（小写、唯一）
  - `label`：下拉里显示的中文名
  - `vars`：只放 `--wechat-*` 变量（如强调色、标题色、引用背景等）
  - `extraCss`（可选）：额外规则（建议尽量限制在 `.wechat-article` 范围内）
2. 约束建议：
  - 避免外部字体/外链资源（公众号粘贴环境不稳定）
  - 尽量使用简单选择器，避免过深嵌套
3. 自检：`npm run build`，页面里主题下拉能看到新主题，并能正常复制/导出。

### 如何新增组件（组件化素材库）

1. 在 `src/wechat/library/components.ts` 新增一项：
  - `id`：唯一，建议用 `camelCase` 或 `kebab-case`
  - `name/desc/category`：用于面板展示与分类
  - `html`：大多数组件用字符串 HTML 即可
  - `content`：如果组件依赖自定义节点（例如滚动容器 `scrollBox`），用结构化内容插入更稳
2. 兼容性建议：
  - 优先用编辑器已支持的结构（段落/标题/列表/blockquote/hr/img/link 等）
  - 如果需要 `div` 等自定义容器，请先做 Tiptap Node 扩展（参考 `src/wechat/extensions/scrollBox.ts`）
3. 样式一致性（很重要）：
  - 如果你新增了新的 `class`，请同时补齐：
    - `src/wechat/wechatStyles.ts`（预览/导出 CSS）
    - `src/wechat/inlineWeChat.ts`（复制内联 HTML 的样式映射，保证粘贴更稳）

### 如何新增模板/整篇套版

- 模板：改 `src/wechat/library/templates.ts`
- 套版：改 `src/wechat/library/layoutPresets.ts`

建议：模板/套版尽量复用现有样式类（如 `lead / section / titlebar / badge / callout / card / guide / divider`），这样预览、导出和内联复制都会更一致。

### PR 自检清单（建议）

- 能正常运行：`npm run dev`
- 能正常构建：`npm run build`
- 组件/主题在右侧预览可见
- “复制内联 HTML（更稳）”粘贴到公众号后台不至于大面积丢样式

## FAQ / 设计取舍

- 为什么要“内联 HTML”？
  - 公众号后台对外部样式/选择器支持有限，且粘贴时容易丢失 class；内联样式通常更稳定。
- 为什么模板用 `blockquote.callout` 而不是 `div.callout`？
  - Tiptap/ProseMirror 会过滤不支持的节点/属性；因此模板尽量使用编辑器支持的结构，并通过扩展保留 `class`。

## Roadmap（可选增强）

- 更多组件与套版（更接近 135 的组件化素材库）
- 大纲目录（根据标题生成）、字数/阅读时间、敏感词/错别字提醒
- 图片上传到图床（替换 Base64）、批量压缩与宽度适配
- 导出为公众号更友好的“粘贴包”（含图片与 HTML/CSS）
