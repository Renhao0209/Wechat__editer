# Changelog

本项目的变更记录。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 

### Changed

- 

### Fixed

- 

### Removed

- 

## [0.1.1] - 2026-01-28

### Added

- 新增桌面版（Windows）打包与发布：支持生成 NSIS 安装包，并可通过 GitHub Releases 分发。

### Changed

- 应用信息：桌面版显示名调整为「微信排版助手」，并同步设置应用/安装包图标。

## [0.1.0] - 2026-01-28

### Added

- 新增编辑格式切换：支持“富文本 / Markdown 源码”模式，Markdown 可实时渲染到预览并可切回富文本覆盖写入。

### Changed

- UI 交互：编辑区与预览区支持双向滚动同步，并修复同步导致的“自动回滚/抖动”。
- 滚动条样式：编辑区/预览/素材库滚动条改为更接近 macOS 的半透明浮层风格；同时避免外层页面出现多余滚动条。

### Fixed

- 组件「可滚动框/活动公告」内部滚动条隐藏（保留可滚动），预览/导出与编辑器内表现一致。
