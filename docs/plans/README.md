# Tips Calendar iOS 路线图

[Figma 小费记录 App](https://www.figma.com/design/ifAdYyy4qP0UXjbj7AX7Jx/%E5%B0%8F%E8%B4%B9%E8%AE%B0%E5%BD%95app?node-id=0-1) 按用户路径拆成 7 个阶段。产品行为以 [iOS 小费收入管理需求文档](../iOS小费收入管理需求文档.md) 为准；视觉以 Figma 为准；工程在 `tip-calendar-rn/`。

本文只锁定**阶段边界、验收和顺序**。每个阶段的任务拆解、文件路径和测试代码，在**开始该阶段开发之前**再写成独立实现计划。

## 怎么推进

1. 看本文件，确认当前阶段的范围和验收。
2. 用 writing-plans 为**当前这一阶段**生成 `docs/plans/YYYY-MM-DD-phase-N-<name>.md`。实现计划必须对照当时的代码和 Figma，不要提前写后面的阶段。
3. 按该阶段计划开发、验收。
4. 阶段完成后，把本文件「状态」列改成完成，再对下一阶段重复 2–3。

不要一次写完 7 份实现计划。后面阶段的目录、类型和交互会随前面的实现变化，提前写的任务会过期。

## 阶段总览

按用户路径分期，不按 Figma 画布从左到右做。同一页面的多种状态放在同一阶段。

| 阶段 | 状态 | 范围 | 结束后用户能做什么 |
|---|---|---|---|
| 0 地基 | 完成 | Tab 壳、theme、领域计算、本地存储接口 | 三个 Tab 可切换；收入计算与本地存储有测试 |
| 1 首次使用 | 完成 | Onboarding 三步、空日历 | 新用户建好餐厅，落到空日历 |
| 2 记录闭环 | 完成 | 默认 Record Shift、实时计算、日历绿色金额 | 点日期记一班并在日历看见（MVP，此后可自用） |
| 3 当天详情 | 完成 | Day Details、同日多班、编辑、删除确认与 Undo | 查看、改、删当天班次 |
| 4 表单进阶 | 进行中 | More options、计算说明、校验、无餐厅拦截、跨午夜 | 默认表单仍短，复杂规则可展开 |
| 5 Stats / Me / 备份 | 未开始 | 周月统计、餐厅设置、偏好、CSV/JSON、隐私 | 看趋势、改设置、带走数据 |
| 6 真机发布 | 未开始 | 真机走查、无障碍抽查、EAS、隐私权限 | iOS V1 商店候选 |

阶段 2 完成即可自用记账。阶段 5 产品通过、阶段 6 真机通过后，才视为可提交商店候选。

当前实现计划：

- [阶段 0 地基](./2026-08-24-phase-0-foundation.md)
- [阶段 1 首次使用](./2026-08-24-phase-1-onboarding-empty-calendar.md)
- [阶段 2 记录闭环](./2026-08-24-phase-2-record-loop.md)
- [阶段 3 当天详情](./2026-08-24-phase-3-day-details.md)
- [阶段 4 表单进阶](./2026-08-24-phase-4-form-advanced.md)

## 全阶段约定

后续阶段必须沿用阶段 0 锁定的类型、函数名、文件路径和存储 schema。不要另起一套金额或日期模型。

- 工程根目录：`tip-calendar-rn/`
- 路由：Expo Router，入口在 `src/app/`
- 金额：整数美分（`Cents`），展示前再格式化
- 日期：本地日历 `YYYY-MM-DD`，禁止用 UTC 时间戳反推日期
- 界面文案：英文，与 Figma 一致
- 底部 Tab 仅三个：Calendar / Stats / Me
- 不实现 `[old] onboarding-welcome`
- V1 不做账号、云同步、广告、IAP、Android 商店验收

## 各阶段边界

### 阶段 0：地基

**范围：** Expo 项目壳、NativeWind、Calendar / Stats / Me Tab、theme、领域计算与单测、本地存储接口。

**验收：** 三个 Tab 可切换；领域计算测试通过；尚未要求像素级页面。

### 阶段 1：首次使用 + 空日历

**Figma：** `onboarding-step1-restaurant`、`onboarding-step2-base-pay`、`onboarding-step3-tipout`、`calendar-empty-state`。

**验收：** 新用户能建好餐厅并看到空日历；Skip 薪资/tip-out 后仍能进入日历；再次打开不再走 Onboarding。

### 阶段 2：20 秒记录闭环（MVP）

**Figma：** `record-shift-form`、`calendar-home`。

**验收：** 点无记录日期进入绑定该日的表单；填写工时与小费后净收入实时变化；保存后日历出现绿色金额；刷新 App 后数据仍在。

### 阶段 3：当天详情与改删

**Figma：** `day-details-sheet`、`day-details-multi-shift`、`edit-shift-form`、`delete-shift-confirmation`、`delete-undo-toast`。

**验收：** 有记录日期打开 sheet；多班分别展示且日历为当日总和；编辑后立即重算；删除需确认且可短暂撤销。

### 阶段 4：表单进阶状态

**Figma：** `record-shift-form-more-options`、`calculation-breakdown`、`form-validation-errors`、`record-shift-no-restaurant`。

**验收：** 默认表单仍短；展开后可处理 Clock in/out、Lunch/Dinner、自动 tip-out；错误用白话提示；无餐厅时被拦截。

### 阶段 5：Stats + Me + 备份

**Figma：** `stats`、`stats-month-view`、`me`、`restaurant-settings`、`add-restaurant-form`、`preferences`、`data-and-backup`、`about-and-privacy`、`json-restore-confirmation`。

**验收：** Stats 与日历、明细加总一致；周起始日生效；CSV 可分享；JSON 导入必须二次确认；隐私文案与本机存储策略一致。

### 阶段 6：iOS 真机与发布准备

**范围：** 真机单手走查、Dynamic Type / VoiceOver 抽查、Expo Doctor、EAS preview、隐私与权限检查。

**验收：** 在真机 iPhone 上完成 Onboarding → 记一班 → 看日历 → 看 Stats → 导出备份；无广告无升级弹窗；不申请与功能无关的系统权限。

## Figma 画板索引

文件 key：`ifAdYyy4qP0UXjbj7AX7Jx`

写某一阶段的实现计划时，只对该阶段的画板调用 `get_design_context`。返回代码当参考，按当时仓库里的组件和 token 改写。

| 画板 | node id | 阶段 |
|---|---|---|
| `onboarding-step1-restaurant` | `71:7` | 1 |
| `onboarding-step2-base-pay` | `71:40` | 1 |
| `onboarding-step3-tipout` | `71:85` | 1 |
| `calendar-empty-state` | `48:49` | 1 |
| `record-shift-form` | `3:208` | 2 |
| `calendar-home` | `3:7` | 2 |
| `day-details-sheet` | `3:160` | 3 |
| `day-details-multi-shift` | `48:195` | 3 |
| `edit-shift-form` | `48:260` | 3 |
| `delete-shift-confirmation` | `48:555` | 3 |
| `delete-undo-toast` | `48:678` | 3 |
| `record-shift-form-more-options` | `41:4` | 4 |
| `calculation-breakdown` | `48:811` | 4 |
| `form-validation-errors` | `48:884` | 4 |
| `record-shift-no-restaurant` | `56:4` | 4 |
| `stats` | `27:162` | 5 |
| `stats-month-view` | `48:326` | 5 |
| `me` | `3:269` | 5 |
| `restaurant-settings` | `30:101` | 5 |
| `add-restaurant-form` | `48:420` | 5 |
| `preferences` | `43:4` | 5 |
| `data-and-backup` | `43:124` | 5 |
| `about-and-privacy` | `43:235` | 5 |
| `json-restore-confirmation` | `48:927` | 5 |
