# 本地存储数据结构（schemaVersion 2）

日期：2026-08-27  
范围：`tip-calendar-rn/` 本机 JSON 文档。为以后上后端做形状对齐，本阶段不接登录、不接 API、不加同步字段。

## 目标

本地备份必须是一份可迁移的业务文档，而不是 UI 状态转储。以后后端按用户拆成三张表：`restaurants`、`shifts`、`preferences`。现在改本地结构，是为了历史班次在餐厅规则变化或餐厅被删除后仍然能解释「当时为什么是这个数字」。

## 已确认的产品决定

1. 班次和餐厅都有稳定 ID。新记录用客户端 UUID；已有记录保留原 ID，不重写。
2. 班次保存计算快照，不只保存规则输入。
3. 班次日期用本地日历日 `localDate: "YYYY-MM-DD"`，不用 UTC timestamp 反推日期。
4. 餐厅是默认模板，班次是历史事实。
5. 文档最外层有 `schemaVersion`。现有本机数据是 `version: 1`，本次升为 `schemaVersion: 2`。
6. Tab、sheet、表单草稿不进这份文档。
7. 允许硬删除餐厅。班次保留 `restaurantId` 和当时的 `restaurantName`。店还在时界面显示当前店名；店删了用快照店名。
8. 保存时冻住当时屏幕上的收入数字（`incomeSnapshot`）。日历和统计读这份数字，不再用当前餐厅规则重算。编辑班次时整份快照一起重写。

## 明确不做

- 不在这版加 `userId`、`syncStatus`、`deletedAt`、冲突版本、outbox。
- 不把金额改回美元小数。持久化一律用整数分（`Cents`）。
- 不把 `localDate` 改名为 `businessDate`。
- 不改 H5（`src/`）存储。H5 JSON 导入不在本次范围。
- 不更换 AsyncStorage key。继续用 `tips-calendar/v1`，版本只写在文档里。

## 文档形状

```ts
type AppState = {
  schemaVersion: 2
  restaurants: Restaurant[]
  shifts: Shift[]
  preferences: Preferences
}
```

空文档：

```ts
{
  schemaVersion: 2,
  restaurants: [],
  shifts: [],
  preferences: {
    weekStartsOn: 0,
    currencySymbol: "$",
    timeFormat: "12h",
    defaultRestaurantId: null,
  }
}
```

`needsOnboarding` 仍为 `restaurants.length === 0`。删光餐厅会再次进入 Onboarding；已有班次留在 `shifts` 里，不清除。

## Preferences

跟用户走，不跟某一班走。

```ts
type Preferences = {
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  currencySymbol: string
  timeFormat: "12h" | "24h"
  defaultRestaurantId: string | null
}
```

- `defaultRestaurantId` 从餐厅上的 `isDefault` 挪到这里。
- 必须指向现有餐厅，或为 `null`。
- 第一家餐厅创建时写成它的 `id`。用户在餐厅设置里点常用餐厅，只改这个字段，不改餐厅行。
- 删除的若是默认餐厅：改成剩余列表里的第一家；一家都不剩则为 `null`。
- 最后看的月份、打开的 sheet、表单草稿不进 Preferences。

## Restaurant

默认模板。可以硬删除。

```ts
type Restaurant = {
  id: string
  name: string
  payType: PayType
  payAmountCents: Cents
  creditCardTipPayout: CreditCardTipPayout
  defaultTipOutRule: TipOutRule
  createdAt: string
  updatedAt: string
}

type PayType = "hourly" | "fixed" | "none"

type CreditCardTipPayout = "same_day" | "paycheck"

type TipOutRule =
  | { type: "none" }
  | { type: "fixed"; amountCents: Cents }
  | { type: "sales_percent"; percent: number }
  | { type: "tips_percent"; percent: number }
```

- 新餐厅 `id` 用 `crypto.randomUUID()`。
- `createdAt` / `updatedAt` 是 UTC ISO 瞬时，不是营业日。
- 没有 `isDefault`。
- `creditCardTipPayout` 只留在餐厅上。V1 不据此算现金到手，班次不冻这份字段。
- `defaultTipOutRule` 没有 `manual`。手改金额只发生在班次。

## Shift

历史事实。一天可以有多条，主键是 `id`，不是日期。

```ts
type Shift = {
  id: string
  localDate: string
  restaurantId: string
  restaurantName: string
  hours: number
  unpaidBreakHours: number
  clockIn?: string
  clockOut?: string
  overnight: boolean
  cashTipsCents: Cents
  cardTipsCents: Cents
  otherIncomeCents: Cents
  salesCents?: Cents
  note?: string
  tag?: ShiftTag
  paySnapshot: PaySnapshot
  tipOutSnapshot: TipOutSnapshot
  incomeSnapshot: IncomeSnapshot
  createdAt: string
  updatedAt: string
}

type ShiftTag = "lunch" | "dinner"

type PaySnapshot = {
  payType: PayType
  payAmountCents: Cents
}

type TipOutSnapshot =
  | { type: "none"; amountCents: 0 }
  | { type: "fixed"; amountCents: Cents }
  | { type: "sales_percent"; baseAmountCents: Cents; percent: number; amountCents: Cents }
  | { type: "tips_percent"; baseAmountCents: Cents; percent: number; amountCents: Cents }
  | { type: "manual"; amountCents: Cents }

type IncomeSnapshot = {
  totalTipsCents: Cents
  wageIncomeCents: Cents
  otherIncomeCents: Cents
  grossIncomeCents: Cents
  tipOutCents: Cents
  netIncomeCents: Cents
  effectiveHours: number
  effectiveHourlyCents: Cents | null
}
```

### 日期与时间

- `localDate` 是用户选中的本地日历日，格式 `YYYY-MM-DD`。跨午夜班次归属开工那天。
- `overnight` 在 clock-out 早于 clock-in 时为 `true`。
- `clockIn` / `clockOut` 为 `HH:mm`，仅在用户用打卡方式记录时存在。
- `createdAt` / `updatedAt` 是 UTC ISO 瞬时。

### 快照写入规则

保存和编辑都走同一条路径：用当前表单输入调用 `calculateShiftIncome`，把结果整份写入，不局部打补丁。

1. `restaurantName` 拷自当时选中餐厅的 `name`。若保存时餐厅已不存在，保留班次上已有的 `restaurantName`，不要改成空字符串。
2. `paySnapshot` 必填，来自当班实际使用的薪资（餐厅默认或本班覆盖）。
3. `tipOutSnapshot` 必填：
   - 无 tip-out → `{ type: "none", amountCents: 0 }`
   - 固定金额规则 → `{ type: "fixed", amountCents }`
   - 销售额百分比 → `{ type: "sales_percent", baseAmountCents, percent, amountCents }`，`baseAmountCents` 为当时销售额
   - 总小费百分比 → `{ type: "tips_percent", baseAmountCents, percent, amountCents }`，`baseAmountCents` 为当时现金小费 + 信用卡小费
   - 用户手改最终金额 → `{ type: "manual", amountCents }`
4. `incomeSnapshot` 必填，等于当时屏幕上的计算结果。
5. `incomeSnapshot.tipOutCents` 必须等于 `tipOutSnapshot.amountCents`。
6. `incomeSnapshot.effectiveHourlyCents` 在有效工时为 0 时为 `null`。

现有 v1 把「手改金额」存成 `fixed`。migration 按字面保留为 `fixed`，不猜测当时是不是 manual。新保存的手改金额用 `manual`。

### 读取规则

| 场景 | 读什么 |
|---|---|
| 日历当天金额、Stats 汇总、Day Details 数字 | `shift.incomeSnapshot`，不按当前餐厅重算 |
| 计算说明里的 tip-out 基数和比例 | `shift.tipOutSnapshot` |
| 店名：餐厅还在 | 当前 `restaurant.name` |
| 店名：餐厅已删 | `shift.restaurantName` |
| 记录表单预览（未保存） | 继续用 `calculateShiftIncome` 现场算 |
| 编辑已保存班次的表单初值 | 用班次快照，不用餐厅当前默认值去覆盖用户当时的选择 |

`netIncomeCentsForShift` / `incomeForShift` / `summarizeStats` 改为读 `incomeSnapshot`。找不到餐厅时不得把净收入当成 `0`。

### 删除餐厅之后的班次

- 餐厅数组里那一行消失。班次行保留。
- 查看：店名用 `restaurantName`，金额用 `incomeSnapshot`。
- 编辑：表单用快照当初值；选择器只列出仍存在的餐厅。用户不换店则 `restaurantId` 和 `restaurantName` 不变。用户换到另一家店，则拷新店名，并带入新店默认薪资/tip-out（用户仍可本班覆盖），保存时重写全部快照。
- 新增班次：选择器不含已删餐厅。没有餐厅时仍走 `record-shift-no-restaurant`。

允许删掉最后一家餐厅。结果是 Onboarding 再次出现，历史班次仍在。

## 展示状态（禁止写入 AppState）

下列内容只存在内存或路由里：

- 当前 Tab、当前日历月、Day Details 是否打开
- Record / Edit 表单草稿
- Undo toast 里待恢复的班次（恢复成功后再写入 `shifts`）
- Onboarding 三步的未提交草稿

JSON 备份只导出 `schemaVersion`、`restaurants`、`shifts`、`preferences`。

## ID

- 新餐厅、新班次：`crypto.randomUUID()`。
- 已有 `rst_…` / `sft_…` ID 保持不变。
- 禁止用数组下标、日期、或「某天唯一一条」定位记录。
- 编辑班次必须保留原 `id` 和 `createdAt`，只更新 `updatedAt` 和业务字段。

## 金额与舍入

与现有 `calculateShiftIncome` 一致：

- 百分比 tip-out：`Math.round(baseAmountCents * percent / 100)`
- 时薪工资：`Math.round(payAmountCents * effectiveHours)`
- 实际时薪：有效工时 > 0 时 `Math.round(netIncomeCents / effectiveHours)`，否则 `null`
- 有效工时：`max(0, hours - unpaidBreakHours)`

CSV 导出仍把分格式化成美元字符串。店名列与界面相同：餐厅还在用当前名，已删用 `restaurantName`。金额列用 `incomeSnapshot`。JSON 备份保持分。

## v1 → v2 migration

加载本机数据或导入 JSON 时识别版本：

- 有 `schemaVersion === 2`，且 `restaurants` / `shifts` / `preferences` 都是数组或对象：当 v2 用。
- 有 `version === 1`（无 `schemaVersion`）：当 RN v1 用，迁移后再写入。
- 其它形状：拒绝导入；本机加载则回退到空文档（与现在 invalid JSON 行为一致）。

v1 迁移步骤，必须纯函数、可单测：

1. 文档改为 `schemaVersion: 2`，去掉 `version`。
2. `preferences.defaultRestaurantId` = 带 `isDefault: true` 的餐厅 id；若没有则用第一家；若没有餐厅则为 `null`。
3. 从每家餐厅去掉 `isDefault`。
4. 每条仍有 `id` 和 `localDate` 的班次：
   - `restaurantName` = 当时能找到的餐厅 `name`，找不到则为 `"Unknown restaurant"`。
   - 若缺少 `paySnapshot`，从对应餐厅拷 `payType` / `payAmountCents`；餐厅也不在则为 `{ payType: "none", payAmountCents: 0 }`。
   - 先用 v1 的 `tipOutSnapshot.rule`（以及已有 `paySnapshot` 或餐厅薪资）调用现有 `calculateShiftIncome`，写入 `incomeSnapshot`。
   - 再把 `{ rule, salesCents?, amountCents }` 展平为 v2 `TipOutSnapshot`。`tips_percent` 的 `baseAmountCents` 用 `cashTipsCents + cardTipsCents`。`sales_percent` 的 `baseAmountCents` 用 `salesCents ?? shift.salesCents ?? 0`。
   - 保留原 `id`、`localDate`、`createdAt`。
5. 不改 ID。本机加载时：完全无法解析的 JSON 仍回退空文档；v1 里缺少 `id` 或 `localDate` 的单条丢掉，其余照常迁移。JSON 导入更严：任一班次缺少 `id` 或 `localDate`，整份拒绝，不替换本机数据。

导入 JSON 仍须二次确认后才替换本机数据。导入 v2 文件不需要再算一遍收入；以文件里的 `incomeSnapshot` 为准。

## 以后后端怎么映射

现在不实现。形状按这个对应，避免以后再拆字段：

| 本地 | 后端 |
|---|---|
| `restaurants[]` | `restaurants` 表，外键用户 |
| `shifts[]` | `shifts` 表，外键用户和 `restaurant_id`（允许餐厅已删后仍保留行） |
| `preferences` | 每用户一行 |
| `shift.localDate` | `date` 列，不是 timestamptz |
| `shift.incomeSnapshot` | 列或 JSONB；服务端统计直接读，不按当前餐厅规则重算 |
| 客户端 UUID | 主键，服务端接受客户端生成的 ID |

上后端时再加的字段（现在不加）：`userId`、`deletedAt`、同步状态。

## 实现落点（实现计划再拆任务）

改 RN，不改 H5：

- `src/domain/restaurant.ts` — 去掉 `isDefault`，Preferences 加上 `defaultRestaurantId`
- `src/domain/shift.ts` — 展平 `TipOutSnapshot`，`paySnapshot` 必填，加上 `restaurantName`、`incomeSnapshot`；新 ID 用 UUID
- `src/storage/types.ts` — `schemaVersion: 2`
- `src/storage/localStore.ts` — 加载时跑 migration
- `src/features/shift/shiftDraft.ts` — `toShift` 写齐三份快照和店名
- `src/features/shift/shiftIncome.ts`、`src/features/stats/statsSummary.ts`、日历汇总、Day Details — 读 `incomeSnapshot`
- `src/features/restaurant/restaurantList.ts` — 删除餐厅时改 `defaultRestaurantId`，不碰班次
- `src/features/backup/backup.ts` — 导出 v2；导入识别 v1/v2

## 验收

- 新班次保存后，改餐厅时薪或 tip-out 默认规则，日历和 Stats 上该班次金额不变。
- 删除餐厅后，该店历史班次仍显示当时店名和当时净收入，不显示 `$0`。
- 同一本地日期可有多条班次，编辑/删除按 `id`，不按日期。
- 跨午夜班次的 `localDate` 仍是开工日。
- 从 v1 本机数据或 v1 JSON 备份打开 App 后，班次条数、日期、净收入与迁移前一致（按当时快照能还原的值）。
- JSON 导出含 `schemaVersion: 2`，不含当前 Tab 或表单草稿。
- 领域计算和 migration 有单测；Stats 在餐厅缺失时仍累加 `incomeSnapshot.netIncomeCents`。
