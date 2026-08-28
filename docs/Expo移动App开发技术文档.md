# Tips Calendar Expo 移动 App 开发技术文档

最后更新：2026-08-24

## 1. 技术选型

本项目的移动 App 使用 Expo + React Native 开发，目标是在 H5 产品规则稳定后，快速迁移为 iOS / Android 原生体验。

核心选择：

| 分类 | 选型 | 说明 |
|---|---|---|
| App 框架 | Expo | 使用 Expo SDK、Expo CLI 和 EAS，降低原生构建与发布成本 |
| 初始化模板 | `create-expo-app` default | 默认包含 TypeScript、Expo Router 和基础项目结构 |
| UI 样式 | NativeWind | 使用 Tailwind 风格的 `className` 编写 React Native UI |
| 路由 | Expo Router | 文件路由，适合 Calendar / Stats / Me 三个主入口 |
| 构建发布 | EAS | 用于 development build、preview build、production build 和提交商店 |
| 参考实现 | Expo examples | 遇到相机、文件、分享、本地通知等能力时优先参考官方示例 |

初始化命令：

```bash
npx create-expo-app@latest tip-calendar --template default
```

进入项目：

```bash
cd tip-calendar
npx expo start
```

主要参考资料：

- [Figma App 设计稿](https://www.figma.com/design/ifAdYyy4qP0UXjbj7AX7Jx/%E5%B0%8F%E8%B4%B9%E8%AE%B0%E5%BD%95app?node-id=48-195&t=667Wh3iFka1PCGs9-0)
- [Expo NativeWind UI 文章](https://expo.dev/blog/building-high-quality-uis-with-expo-and-nativewind)
- [Expo examples](https://github.com/expo/examples)
- [Expo guides](https://docs.expo.dev/guides/overview/)
- [Expo SDK reference](https://docs.expo.dev/versions/latest/)
- [EAS docs](https://docs.expo.dev/eas/)
- [NativeWind installation](https://www.nativewind.dev/docs/getting-started/installation)

## 2. 项目边界

移动 App 应继承 H5 已确认的产品规则，不重新扩大 V1 范围。

App 首版目标：

- 快速记录一班小费收入。
- 展示总小费、工资收入、tip-out、净收入、实际时薪。
- 支持 Calendar / Stats / Me 三个底部主入口。
- 支持本地保存、CSV 导出、JSON 备份与恢复。
- 保持无账号、无广告、无升级弹窗的核心记录体验。

App 首版不做：

- 云同步。
- POS 集成。
- 税务申报。
- 团队小费池协作。
- 收入预测和预算管理。
- 复杂账号体系。

产品与交互依据：

- [Figma App 设计稿](https://www.figma.com/design/ifAdYyy4qP0UXjbj7AX7Jx/%E5%B0%8F%E8%B4%B9%E8%AE%B0%E5%BD%95app?node-id=48-195&t=667Wh3iFka1PCGs9-0)
- [iOS 小费收入管理需求文档](iOS小费收入管理需求文档.md)（React Native iOS 产品需求）
- [H5 小费收入管理需求文档](H5小费收入管理需求文档.md)（已验证的计算与数据规则）
- [UI 原型设计说明](design/UI原型设计说明.md)
- [Apple Design 参考文档](design/apple.design.md)

## 3. 推荐目录结构

使用 Expo Router 的 `app/` 目录承载页面路由，业务逻辑与组件放在 `src/`。

```text
tip-calendar/
  app/
    _layout.tsx
    (tabs)/
      _layout.tsx
      index.tsx
      stats.tsx
      me.tsx
    shift/
      new.tsx
      [id].tsx
    restaurant/
      index.tsx
      [id].tsx
    preferences.tsx
    data-backup.tsx
    about-privacy.tsx
  src/
    components/
    features/
      calendar/
      shifts/
      stats/
      restaurants/
      backup/
    domain/
      shift.ts
      restaurant.ts
      calendar.ts
      money.ts
    storage/
      localStore.ts
      backup.ts
    theme/
      colors.ts
      tokens.ts
    fixtures/
    test/
  assets/
  global.css
  tailwind.config.js
  metro.config.js
  app.json
```

目录职责：

| 目录 | 职责 |
|---|---|
| `app/` | 路由、页面外壳、导航层 |
| `src/components/` | 可复用基础组件，如 Button、AmountText、SectionRow、BottomSheet |
| `src/features/` | 按业务模块组织页面内部组件、hooks 和状态 |
| `src/domain/` | 纯计算逻辑，不依赖 React Native |
| `src/storage/` | 本地持久化、导入导出 |
| `src/theme/` | 颜色、间距、字体、NativeWind token |
| `src/fixtures/` | Demo 数据和测试数据 |

## 4. NativeWind 配置

安装 NativeWind 和必要依赖时，优先使用官方安装文档中的 Expo 方案，并通过 `npx expo install` 保持与当前 Expo SDK 兼容。

推荐流程：

```bash
npx expo install nativewind react-native-reanimated react-native-safe-area-context
npm install --save-dev tailwindcss prettier-plugin-tailwindcss babel-preset-expo
npx tailwindcss init
```

`tailwind.config.js` 的 `content` 必须覆盖 `app/` 和 `src/`：

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

创建 `global.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

在应用最顶层入口引入：

```ts
import "../global.css"
```

创建或修改 `metro.config.js`：

```js
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")

const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, { input: "./global.css" })
```

TypeScript 类型文件建议命名为 `nativewind-env.d.ts`：

```ts
/// <reference types="nativewind/types" />
```

如果样式不生效，先清缓存：

```bash
npx expo start --clear
```

注意：NativeWind 官方文档同时存在稳定版与预览版配置。项目初期优先选择稳定配置；升级 Expo SDK 或 NativeWind 大版本时，再按当时官方文档同步调整 `metro.config.js`、`tailwind.config.js`、`global.css` 和类型声明。

## 5. UI 实现原则

App UI 以 H5 已确认的移动端体验为准，并使用 NativeWind 加快样式开发。

基础视觉规则：

- 系统字体优先。
- 主交互色使用 Apple 风格蓝色 `#0066CC`。
- 页面背景以白色为主，浅灰只用于列表分组、输入背景和摘要区域。
- Calendar、Stats、Me 使用底部主导航。
- 关键金额使用清晰的大字号和稳定数字排版。
- 默认记录路径只展示必要字段，复杂配置放入“更多选项”。

建议优先封装这些组件：

| 组件 | 用途 |
|---|---|
| `Screen` | 安全区、背景、页面内边距 |
| `Header` | 页面标题、返回按钮、右侧图标操作 |
| `AmountText` | 金额展示，统一颜色和数字格式 |
| `MetricCard` | 本周、本月、实际时薪等摘要 |
| `FormField` | 输入项、错误提示、辅助说明 |
| `SegmentedControl` | 周/月切换、收入类型切换 |
| `BottomSheet` | Day Details |
| `RestaurantPicker` | 餐厅选择 |
| `CalculationBreakdown` | 净收入计算说明 |

NativeWind 使用建议：

- 页面布局优先使用 `className`。
- 金额、图表、复杂动态尺寸可以使用 `StyleSheet` 或 inline style 辅助。
- 不把复杂业务状态写进 class 字符串；通过组件 props 决定样式分支。
- 颜色 token 统一放在 `src/theme/`，避免页面里散落硬编码颜色。

## 6. 路由规划

推荐使用 Expo Router 的文件路由。

底部主导航：

| 路由 | 页面 | 说明 |
|---|---|---|
| `app/(tabs)/index.tsx` | Calendar | 默认首页 |
| `app/(tabs)/stats.tsx` | Stats | 周/月统计 |
| `app/(tabs)/me.tsx` | Me | 设置与数据管理入口 |

二级页面：

| 路由 | 页面 |
|---|---|
| `app/shift/new.tsx` | 新增班次 |
| `app/shift/[id].tsx` | 编辑班次 |
| `app/restaurant/index.tsx` | 餐厅列表 |
| `app/restaurant/[id].tsx` | 餐厅编辑 |
| `app/preferences.tsx` | 偏好设置 |
| `app/data-backup.tsx` | 数据导入导出 |
| `app/about-privacy.tsx` | 隐私说明 |

Calendar 交互规则：

- 点击无记录日期：直接跳转到 `shift/new`，并通过 query 参数传入本地日期。
- 点击有记录日期：打开 Day Details bottom sheet。
- Day Details 中点击编辑：跳转到 `shift/[id]`。
- Stats 中点击某日：返回 Calendar 并选中该本地日期。

## 7. 领域模型

移动 App 继续沿用 H5 的核心领域对象。

`Restaurant`：

```ts
type Restaurant = {
  id: string
  name: string
  isDefault: boolean
  payType: "hourly" | "fixed"
  payAmount: number
  creditCardTipPayout: "same_day" | "paycheck"
  defaultTipOutRule: TipOutRule
}
```

`Shift`：

```ts
type Shift = {
  id: string
  localDate: string
  restaurantId: string
  role?: string
  hours: number
  cashTips: number
  cardTips: number
  otherIncome: number
  tipOutSnapshot: TipOutSnapshot
  note?: string
  tag?: "lunch" | "dinner"
  createdAt: string
  updatedAt: string
}
```

`TipOutRule`：

```ts
type TipOutRule =
  | { type: "none" }
  | { type: "fixed"; amount: number }
  | { type: "sales_percent"; percent: number }
  | { type: "tips_percent"; percent: number }
```

核心计算函数应保持纯函数：

- `calculateTotalTips(shift)`
- `calculateWageIncome(shift, restaurant)`
- `calculateTipOut(shift, restaurant)`
- `calculateNetIncome(shift, restaurant)`
- `calculateEffectiveHourly(shift, restaurant)`
- `groupShiftsByLocalDate(shifts)`
- `summarizeStats(shifts, range, restaurantId?)`

计算逻辑必须有单元测试，并优先复用 H5 中已验证的领域规则。

## 8. 本地存储与备份

V1 默认本地保存，不要求账号。

可选存储方案：

| 方案 | 适用 |
|---|---|
| `AsyncStorage` | 简单键值数据，容易上手 |
| `react-native-mmkv` | 更高性能，适合长期本地数据 |
| SQLite | 数据量较大、查询复杂时使用 |

快速开发建议先使用 `AsyncStorage` 或 MMKV。无论使用哪种存储，领域层都不要直接依赖具体存储库，应通过 `storage` 模块隔离。

备份要求：

- CSV 导出覆盖所有班次和餐厅字段。
- JSON 导出用于完整备份。
- JSON 导入必须二次确认。
- 导入不得静默覆盖本机数据。
- 隐私页清楚说明数据默认保存在本机。

## 9. 测试策略

最低测试要求：

| 类型 | 工具 | 覆盖范围 |
|---|---|---|
| 单元测试 | Jest | 收入计算、tip-out、跨午夜、统计汇总 |
| 组件测试 | React Native Testing Library | 表单输入、错误提示、保存状态 |
| E2E | Maestro 或 Detox | 首次使用、快速记录、编辑删除、导入导出 |

必须覆盖的 P0 用例：

- 无记录日期直达新增表单。
- 默认餐厅自动带入。
- 工时 + 现金小费 + 信用卡小费实时计算。
- 固定金额 tip-out。
- 销售额百分比 tip-out。
- 总小费百分比 tip-out。
- 跨午夜班次归属开始日期。
- 删除确认与撤销。
- Stats 周/月切换和餐厅筛选。
- CSV / JSON 导出。

常用命令：

```bash
npm test
npx expo start --clear
npx expo-doctor
```

## 10. EAS 构建与发布

安装并登录 EAS CLI：

```bash
npm install --global eas-cli
eas login
```

初始化 EAS：

```bash
eas init
eas build:configure
```

建议构建环境：

| Profile | 用途 |
|---|---|
| `development` | 本地调试原生能力 |
| `preview` | 内测分发 |
| `production` | App Store / Google Play 发布 |

示例命令：

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
eas build --profile preview --platform all
eas build --profile production --platform all
```

发布前检查：

- `app.json` / `app.config.ts` 中的 app name、slug、bundle identifier、package name 已确认。
- 图标、启动图、权限说明完整。
- 隐私说明与本地数据策略一致。
- iOS 和 Android 至少各完成一次真机测试。
- EAS production build 通过。

## 11. Expo examples 使用方式

遇到平台能力时，优先从 [Expo examples](https://github.com/expo/examples) 找相近项目，而不是先引入非官方方案。

可能会用到的方向：

| 能力 | 参考方向 |
|---|---|
| 文件导出 | 文件系统、分享、DocumentPicker 示例 |
| JSON 导入 | DocumentPicker、FileSystem 示例 |
| 本地通知 | Notifications 示例 |
| 图表 | React Native SVG 或 Skia 示例 |
| Web 兼容 | Expo Router / web 示例 |
| 构建配置 | EAS 和 prebuild 示例 |

使用示例仓库时只借鉴 API 用法，不直接复制无关页面结构。

## 12. 开发里程碑

### M1：项目初始化

- 创建 `tip-calendar` Expo 项目。
- 配置 NativeWind。
- 配置底部导航 Calendar / Stats / Me。
- 搭建基础 theme、components、domain、storage 目录。

### M2：领域逻辑迁移

- 迁移或重写 H5 已验证的收入计算逻辑。
- 完成 shift、restaurant、calendar、stats 的单元测试。
- 准备 demo 数据。

### M3：核心记录流程

- Calendar 月历。
- 无记录日期直达新增班次。
- 班次表单实时计算。
- 保存后 Calendar 金额更新。

### M4：详情、编辑与统计

- Day Details bottom sheet。
- 编辑、删除、撤销。
- Stats 周/月统计。
- 餐厅筛选。

### M5：设置与备份

- Me 入口。
- Restaurant settings。
- Preferences。
- CSV 导出。
- JSON 导出与导入。
- About & privacy。

### M6：移动端验证与 EAS

- iOS / Android 真机验证。
- Expo Doctor 检查。
- EAS development build。
- EAS preview build。
- 发布前隐私与权限检查。

## 13. 开发注意事项

- 每次安装 Expo 相关依赖优先使用 `npx expo install`。
- 升级 Expo SDK 后运行 `npx expo-doctor`。
- 日期归属必须使用用户选择的本地日期，不能从 UTC 时间戳反推。
- 金额计算统一使用整数分或明确的小数处理策略，避免浮点误差。
- NativeWind 配置变化较快，升级时必须核对官方安装文档。
- 不要把 H5 的浏览器存储实现直接搬到 App；只迁移领域逻辑和测试用例。
- 默认记录流程中不要提前暴露销售额、到账方式、复杂 tip-out 设置。
