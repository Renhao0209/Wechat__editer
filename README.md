# 公众号排版编辑器（WeChat Editor）

[![CI](https://github.com/Renhao0209/Wechat__editer/actions/workflows/ci.yml/badge.svg)](https://github.com/Renhao0209/Wechat__editer/actions/workflows/ci.yml)
[![Sync Labels](https://github.com/Renhao0209/Wechat__editer/actions/workflows/labels.yml/badge.svg)](https://github.com/Renhao0209/Wechat__editer/actions/workflows/labels.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个基于 **Vite + React + TypeScript + Tiptap** 的公众号文章排版工具：左侧写作编辑，右侧手机预览，内置模板/组件/套版，并支持 **自定义主题（JSON / CSS 导入）**。

> 说明：本项目为个人学习/工具性质实现。

## 目录

- [特性](#特性)
- [快速开始](#快速开始)
- [推荐工作流（更贴近公众号后台）](#推荐工作流更贴近公众号后台)
- [自定义主题导入](#自定义主题导入)
- [项目结构](#项目结构)
- [参与贡献](#参与贡献)
- [版本与发布（最小策略）](#版本与发布最小策略)
- [FAQ](#faq)
- [Roadmap](#roadmap)

## 特性

- 自定义主题（项目核心卖点）：导入 `--wechat-*` 变量 + `extraCss`，并保持预览/复制/导出一致
- 富文本编辑：标题、加粗/斜体/下划线/删除线、列表、引用、分割线、对齐、撤销/重做、链接、图片（URL/本地上传 Base64）
- 模板插入 + 组件化素材库：一键插入到光标位置
- 一键整篇套版：覆盖套用 + 智能套版（不覆盖、自动增强结构样式）
- 复制/导出：复制富文本、复制内联 HTML（更稳）、导出完整 HTML/正文 HTML/CSS
- 本地持久化：文章内容、主题选择、自定义主题列表保存到 `localStorage`

## 快速开始

环境要求：Node.js 20+（推荐 LTS；仓库 CI 使用 Node 24）

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

## 在线预览 / 快速部署（GitHub Pages）

仓库已配置 Pages 自动部署工作流：推送到 `main` 后会自动构建并发布到 GitHub Pages。

1. 在 GitHub 仓库设置里启用 Pages（Source 选 GitHub Actions）
2. 等待 Actions 跑完 `Deploy to GitHub Pages`
3. 通过 Actions 输出的 `page_url` 访问在线预览

## 在 Issue 里一键下载构建包（ZIP）

为了让任何人都能快速拿到可用构建包，仓库提供了 Issue 触发打包：

1. 打开 Issues → New issue
2. 选择「一键下载构建包（ZIP）」模板并提交
3. 等待 Actions 完成后，会在该 Issue 评论区给出 ZIP 下载链接

说明：会同步一份到 Release（`nightly`）作为公网直链（仓库公开时免登录），同时保留 Actions artifact 备选链接。

## 推荐工作流（更贴近公众号后台）

1. 写作 → 套模板/插组件 → 右侧预览确认
2. 点击 **“复制内联HTML（更稳）”**
3. 打开公众号后台（图文消息编辑）直接粘贴

如果你希望保留可维护的 CSS（不内联）：

- 用 **“复制完整 HTML”**（含 `<style>`）导出整页
- 或 **“复制 CSS” + “复制文章 HTML”** 分开管理

## 自定义主题导入

你可以把主题当成“品牌皮肤”：通过 `--wechat-*` 变量控制强调色、标题色、引用样式、背景等；再用 `extraCss` 做少量细节增强（建议尽量限制在 `.wechat-article` 范围内）。

<details>
<summary>方式 1：导入 JSON 主题（点击展开）</summary>

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

</details>

<details>
<summary>方式 2：导入 CSS 主题（点击展开）</summary>

```css
:root {
  --wechat-accent: #16a34a;
  --wechat-quote-bg: rgba(22, 163, 74, 0.06);
}

.wechat-article h1 {
  box-shadow: 0 10px 24px rgba(22, 163, 74, 0.10);
}
```

</details>

## 项目结构

| 目录/文件 | 作用 |
| --- | --- |
| `src/wechat/WeChatEditor.tsx` | 主编辑器 UI、模板/组件/套版、导入导出、剪贴板复制 |
| `src/wechat/wechatStyles.ts` | 基础排版 CSS + 主题 CSS + 完整 HTML 文档构建 |
| `src/wechat/inlineWeChat.ts` | 生成“内联样式 HTML”（更稳粘贴到公众号） |
| `src/wechat/wechatEditor.css` | 编辑器 UI（顶栏/工具栏/预览/弹窗等） |
| `src/wechat/themes/` | 主题分区（内置主题注册表 / 类型） |
| `src/wechat/library/` | 组件/模板/套版分区 |
| `.github/` | Issue/PR 模板、labels 同步配置与工作流 |

## 参与贡献

欢迎提交主题/组件/套版。规范流程与目录约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

- 行为准则：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Issue 模板：`.github/ISSUE_TEMPLATE/`
- License：[LICENSE](LICENSE)
- 建议的 labels：见 [.github/labels.md](.github/labels.md)

### 贡献主题（30 秒上手）

1. 在 `src/wechat/themes/builtins/` 新增主题文件（一个主题一个文件）
2. 在 `src/wechat/themes/builtins/index.ts` 把主题加入 `BUILT_IN_THEMES_LIST`
3. 在 `src/wechat/themes/themeTypes.ts` 把主题 id 加进 `BuiltInWeChatThemeId`
2. 本地跑 `npm run build`
3. 提交 PR

说明：仓库已配置 GitHub Actions，PR 会自动跑 `npm ci` / `npm run lint` / `npm run build`。

## 版本与发布（最小策略）

- 版本号：遵循 SemVer（`MAJOR.MINOR.PATCH`）
  - `MINOR`：新增主题/组件/模板/套版等向后兼容能力
  - `PATCH`：修复/小优化（不新增能力，或仅调整样式细节）
  - `MAJOR`：有破坏性变更（例如导出格式/数据结构变更导致旧内容不兼容）
- Tag 规则：`vMAJOR.MINOR.PATCH`（例：`v0.2.0`）
- 变更记录：见 [CHANGELOG.md](CHANGELOG.md)

## FAQ

- 为什么要“复制内联 HTML”？
  - 公众号后台对样式支持有限，粘贴时容易丢 class；内联样式通常更稳定。
- 为什么模板尽量不用 `div`？
  - Tiptap/ProseMirror 会过滤不支持的节点/属性；因此更偏向使用编辑器支持结构，并通过扩展保留 class。

## Roadmap

- 更多主题/组件/套版
- 大纲目录（根据标题生成）、字数/阅读时间、敏感词/错别字提醒
- 图片上传到图床（替换 Base64）、批量压缩与宽度适配
- 导出为公众号更友好的“粘贴包”（含图片与 HTML/CSS）
