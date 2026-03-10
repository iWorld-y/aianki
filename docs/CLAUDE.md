# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供了在此仓库中处理代码时的指导说明。

## 项目概览

这是一个基于 TypeScript 和 Less 开发的微信小程序项目，采用 Skyline 渲染器和 glass-easel 组件框架。

## 开发流程

本项目使用**微信开发者工具**进行开发（不提供 npm 构建脚本，代码编译由 IDE 自动完成）。

### 打开项目

1. 打开微信开发者工具  
2. 导入当前目录下的项目  
3. 应用 ID（appId）已在 `project.config.json` 文件中配置（wx1f0edb2d79745277）

### 项目结构

```
miniprogram/
├── app.ts              # 应用入口文件 (App<IAppOption>)
├── app.json            # 全局配置（页面列表、窗口样式、渲染器选项等）
├── app.less            # 全局样式
├── sitemap.json        # 搜索/站点地图配置
├── pages/              # 页面组件
│   └── [page]/
│       ├── index.ts    # 页面逻辑（使用 Component()）
│       ├── index.json  # 页面配置
│       ├── index.wxml  # 模板标记
│       └── index.less  # 页面样式
├── components/         # 可复用组件
│   └── [component]/
│       ├── *.ts        # 组件逻辑
│       ├── *.json      # 组件配置
│       ├── *.wxml      # 模板
│       └── *.less      # 样式
├── utils/              # 工具函数
│   └── util.ts
└── typings/            # TypeScript 类型定义
    ├── index.d.ts      # 自定义应用类型 (IAppOption)
    └── types/index.d.ts
```

## 架构说明

### 页面/组件模式

页面使用 `Component()` 构造函数（而非 `Page()`），这是 Skyline 渲染器推荐的现代开发模式：

```typescript
// pages/index/index.ts
Component({
  data: { /* ... */ },
  methods: {
    // 事件处理函数及页面方法
  }
})
```

组件遵循标准微信小程序模式，包含 `properties`（属性）、`data`（数据）、`lifetimes`（生命周期）和 `methods`（方法）。

### TypeScript 配置

- 启用严格模式（含空值检查）
- 编译目标：ES2020
- 类型定义文件位于 `typings/` 目录
- 全局应用接口：`IAppOption` 定义于 `typings/index.d.ts`
- 微信小程序 API 类型通过 `miniprogram-api-typings` 包提供

### 样式系统

- 使用 Less（由微信开发者工具自动编译）
- Skyline 渲染器配置 `defaultDisplayBlock: true`
- 自定义导航栏（`navigationStyle: custom`，配置于 app.json）
- 针对带刘海屏设备的 safe area 处理（由 navigation-bar 组件实现）

### 关键配置文件

- `project.config.json`：微信开发者工具设置、编译器插件（TypeScript、Less）
- `app.json`：小程序全局配置、页面列表、Skyline 渲染器选项
- `tsconfig.json`：TypeScript 严格模式配置