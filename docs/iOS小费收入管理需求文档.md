# 服务员小费收入管理 iOS 需求文档

最后更新：2026-08-24

本文是 React Native（Expo）iOS App 的产品需求。产品规则、计算口径和 V1 范围继承 [H5 小费收入管理需求文档](H5小费收入管理需求文档.md)；界面以 [Figma App 设计稿](https://www.figma.com/design/ifAdYyy4qP0UXjbj7AX7Jx/%E5%B0%8F%E8%B4%B9%E8%AE%B0%E5%BD%95app?node-id=48-195) 为准；工程实现见 [Expo 移动 App 开发技术文档](Expo移动App开发技术文档.md)。

H5 已完成规则验证。iOS 不再重新定义收入算法，只把已确认的体验做成原生应用。

## 1. 产品概述

为美国餐饮服务员提供一个轻量、私密、快速且可信的 iPhone 小费收入记录工具。用户在每次下班后，用约 30 秒记录一班收入，目标体验为 20 秒；App 自动计算净收入和实际时薪，并在日、周、月维度帮助用户回顾收入表现。数据默认只保存在本机，可备份和导出。

本 App 是 H5 产品的 iOS 交付形态，不是另一套记账产品。V1 只发 iOS；同一套 React Native 代码可在 Android 运行，但不纳入本需求的验收范围。

## 2. 与 H5 的关系

| 项目 | 以谁为准 |
|---|---|
| 收入计算、tip-out、跨午夜归属、本地日期、CSV/JSON 字段 | H5 需求文档 + `h5/src/domain/` 已有测试 |
| 页面布局、组件样式、导航与状态页 | Figma 设计稿 |
| 路由、目录、NativeWind、EAS | Expo 技术文档 |
| 界面与需求冲突时 | 界面跟 Figma，规则跟 H5 |

iOS 必须复用 H5 已验证的领域函数，而不是在页面里重写一套计算。不要把 H5 的 `localStorage` 实现直接搬进 App。

## 3. 目标用户

- 美国餐厅服务员（Server）。
- 收入由时薪、小费和可能的 tip-out 构成的从业者。
- 希望了解每班实际收入，但不想维护复杂表格或完整财务系统的人。
- 主要在 iPhone 上、下班后单手使用。

## 4. V1 产品目标

- 让用户快速、准确地记录一班收入。
- 让用户即时知道本班的净收入与实际时薪。
- 让用户轻松查看日、周、月收入趋势。
- 提供可追溯、可编辑的个人收入历史。
- 让用户能安全保留并带走自己的收入数据。
- 让班次记录和保存过程不受广告、升级提示或复杂配置打断。
- 让疲惫的下班用户无需重新配置规则，只填写当班变化的数据即可保存。

## 5. 核心使用流程

1. 首次打开 App：走三步 Onboarding，创建第一家餐厅（薪资和 tip-out 可跳过）。完成后进入空日历。
2. 之后在 Calendar 点某一天：无班次日期直接进入绑定该本地日期的新增班次表单；有一条或多条班次的日期才打开 Day Details 底部 sheet。日期自动带入，不需填写或编辑。一个日期可包含多条班次记录。
3. 选择餐厅，填写班次时间或工时、现金小费、信用卡小费、其他收入，以及可选的 tip-out。
4. 应用即时展示总小费、工资收入、tip-out、净收入和实际时薪。
5. 用户保存记录，并在 Calendar 查看当天更新，在 Stats 查看本周、本月与长期趋势。

## 6. 功能需求

功能优先级与 H5 第 5 节一致。下列条款是 iOS 必须实现的产品行为。

### 6.1 首次使用 / Onboarding（P0，必须）

对应 Figma：`onboarding-step1-restaurant`、`onboarding-step2-base-pay`、`onboarding-step3-tipout`、`calendar-empty-state`。

- 本机没有餐厅时，进入三步 Onboarding，不先进入空日历再逼用户找设置。
- Step 1：填写餐厅名称。该餐厅设为常用餐厅。名称未填时不可进入下一步。
- Step 2：选择时薪或每班固定工资，并填写金额。可 Skip。
- Step 3：选择默认 tip-out（无 / 固定金额 / 销售额百分比 / 总小费百分比）。可 Skip。
- Skip 后餐厅仍然创建成功，缺失的薪资与 tip-out 视为未设置，稍后可在 Restaurant settings 补全。
- Onboarding 完成后落地 `calendar-empty-state`：用户能立刻从日历开始记第一班。
- `[old] onboarding-welcome` 不实现。
- 已有餐厅的用户再次打开 App，不再显示 Onboarding。

### 6.2 班次快速记录（P0，必须）

对应 Figma：`record-shift-form`、`record-shift-form-more-options`、`edit-shift-form`、`record-shift-no-restaurant`。

- 新增一条班次记录。
- 同一日期可新增、查看与编辑多条班次记录，例如午班和晚班；日历只汇总显示当天总净收入。
- 日期由用户在日历中点选后自动带入；班次页在标题下以只读副标题展示，例如 “Thursday, August 21”，不作为独立表单项，也不提供填写或修改。
- 选择餐厅：
  - 只有一个已设置餐厅时，自动选中该餐厅；页面可仅以小字展示。
  - 有多个餐厅时，默认选中用户设定的常用餐厅，用户可通过选择器一键切换。
  - 选择餐厅后，自动带入对应的基础薪资和默认 tip-out 规则。
- 记录工作时长：默认直接输入工作时长，这是快速记录路径的唯一时间输入；用户可在 More options 切换为 Clock in / Clock out，系统自动计算并回填工作时长。两种方式不得要求同时填写，最终只保存一个有效工作时长。
- 支持跨午夜班次：班次归属到上班开始的本地日历日期；若结束时间早于开始时间，系统按次日结束计算，并在详情中标注跨日班次。
- 可选填写未付休息时长，并从工时中扣除；该字段位于 More options，不出现在默认快速录入路径。
- 班次标签为可选项，默认不显示也不要求填写；在 More options 中仅提供 Lunch 与 Dinner 两个首版标签。不预设开班、收班或自定义标签。
- 可添加简短备注。
- 表单应优先展示用户上次使用的设置与默认值。
- 保存须提供及时反馈：Saving / Saved；保存成功后当天日历金额和相关汇总立即更新。保存成功可使用轻微触感反馈。
- 对熟练用户，默认记录路径只需填写工时、现金小费、信用卡小费，以及按需填写的 tip-out。
- 本机没有餐厅时，不得进入空白表单；展示 `record-shift-no-restaurant`，引导去创建餐厅。
- iOS 金额与工时输入使用小数键盘；主操作按钮固定在安全区之上，不被 Home Indicator 挡住。

### 6.3 收入拆分（P0，必须）

- 分别记录现金小费与信用卡小费。
- 支持两种基础薪资方式：时薪或每班固定工资。
- 时薪模式下，工资收入 = 时薪 × 有效工作时长；每班固定工资模式下，工资收入直接计入。
- 支持其他收入类别，例如服务费、奖金或补贴；该字段在 More options。
- 自动计算总小费、工资收入和总收入。

### 6.4 Tip-out（P0，必须支持但按需展示）

- 当所选餐厅未设置 tip-out 规则时，默认收起，用户可在记录班次时选择添加。
- 支持固定金额、按销售额百分比、按总小费百分比三种计算方式；默认规则随所选餐厅带入。
- 用户可在本班临时调整 tip-out 规则或最终金额，不影响餐厅的长期设置。
- tip-out 自动从总收入中扣除，并纳入净收入和实际时薪计算。
- 不包含多人分配、团队确认流程或复杂的小费池规则。
- 每种百分比规则旁提供一句就地说明，解释其计算基数。
- 使用自动 tip-out 时，班次记录须保存规则快照：规则类型、用户填写的计算基数、比例与最终 tip-out 金额。

### 6.5 实时收入计算（P0，必须）

对应 Figma：`calculation-breakdown`、`form-validation-errors`。

- 用户输入任一字段后，实时更新：
  - 总小费 = 现金小费 + 信用卡小费。
  - 工资收入：时薪模式为时薪 × 有效工作时长；每班固定工资模式为固定工资金额。
  - 总收入 = 总小费 + 工资收入 + 其他收入。
  - 净收入 = 总收入 − tip-out。
  - 实际时薪 = 净收入 ÷ 有效工作时长。
- 当有效工作时长为 0 或未填写时，不计算实际时薪，并给出清晰提示；有效工作时长为原始工时减去未付休息时长，不得小于 0。
- V1 只承诺展示净收入，不展示现金到手。结果区须说明「净收入不等于当班现金到手」。
- 净收入结果支持展开计算说明，逐项展示小费、工资、其他收入与 tip-out 的计算依据；百分比 tip-out 必须显示计算基数与比例。
- 主动防止明显错误：tip-out 高于本班总收入、金额格式无效、休息时长不小于原始工时等情况，应在保存前即时指出；结束时间早于开始时间时默认按跨午夜班次处理，而非直接报错。
- 错误信息使用普通语言，不展示错误代码；对于可继续保存的非关键问题，采用提示而非强制阻断。
- 金额计算使用与 H5 相同的分位舍入策略，避免浮点误差。

### 6.6 Calendar 与 Stats（P0，必须）

对应 Figma：`calendar-home`、`calendar-empty-state`、`day-details-sheet`、`day-details-multi-shift`、`stats`、`stats-month-view`。

- Calendar 是默认首页。月历每一天直接显示当天净收入。
- 点击无记录日期：直接进入绑定该本地日期的新增班次表单，不先显示空的 Day Details。
- 点击有记录日期：打开 Day Details 底部 sheet。
- 班次日期以用户选择的本地日历日期（`YYYY-MM-DD`）保存与展示，不以 UTC 时间戳推断日期。
- 底部主导航必须为 Calendar / Stats / Me。不得增加常驻 Record Shift、Calculator 或 Settings Tab。
- Calendar 首页视觉以 Figma `calendar-home` 为准：全页白底；大号粗体左对齐 “Tips Calendar”；月份左对齐，右侧用 chevron 切换；下方三张浅灰摘要卡（This Week / This Month / Hourly）；日期格无边框无阴影；有收入日只显示绿色金额；选中日使用蓝色圆角矩形，白字。
- Calendar 可保留轻量本周、本月和实际时薪摘要卡；完整周/月切换、餐厅筛选、趋势图必须属于 Stats。
- Stats 提供周/月切换；周统计按 Me → Preferences 的每周起始日计算。
- Stats 顶部展示：Net Income、Total Tips、Average Hourly、Shifts Worked、Hours Worked。
- Stats 提供按日收入趋势图或按日汇总列表。
- Stats 支持全部餐厅与单餐厅筛选；切换后指标即时重算。
- Stats 中点击某日应跳回 Calendar 并选中对应本地日期：无记录走新增表单，有记录打开 Day Details。

### 6.7 当天详情、历史编辑与删除（必须）

对应 Figma：`day-details-sheet`、`day-details-multi-shift`、`edit-shift-form`、`delete-shift-confirmation`、`delete-undo-toast`。

- Day Details 仅在当天已有班次时打开，使用 iOS 底部 sheet：半透明深色蒙层、顶部短拖拽条、大号只读日期标题。点蒙层或下拉可关闭。
- 单班：展示一张完整班次详情卡（班次名称、餐厅、工时、跨午夜时间、现金小费、信用卡小费、工资、Tip-out、绿色 Net Income）。
- 多班：纵向排列同样结构的详情卡，并提供新增同日班次入口。日历只显示当天净收入总和。
- 跨午夜班次显示在上班开始日期，卡片标注跨日；日历不把同一条班次拆到两个日期。
- 编辑、删除入口跟 Figma：每张班次卡提供编辑与删除。单班不另外做一套「只有卡外 Edit Shift 文字」的交互。
- 删除前必须确认；删除成功后提供短暂 Undo。Undo 消失前，用户可以一键恢复该班次。
- 修改或删除后，Calendar、Day Details 和 Stats 立即重算。
- 历史编辑如需改日期，放入更多操作，不进入默认表单。

### 6.8 餐厅与工作设置（V1 必须）

对应 Figma：`me`、`restaurant-settings`、`add-restaurant-form`。

- 在 Restaurant settings 中新增、编辑、删除餐厅，并设置一个常用餐厅。
- 每个餐厅只维护：
  1. 餐厅名称
  2. 薪资方式与金额：时薪或每班固定工资
  3. 信用卡小费到账方式：当班拿到或随工资发放（只作记录上下文，V1 不据此推断现金到手）
  4. 默认 tip-out：无、固定金额、销售额百分比或总小费百分比
- V1 不在餐厅模板中加入岗位、食品/酒水拆分、多人分配或多条 tip-out 规则。
- 班次页自动带入所选餐厅设置，并允许只对当前班次临时覆盖。

### 6.9 数据、备份与隐私（P0，必须）

对应 Figma：`data-and-backup`、`about-and-privacy`、`json-restore-confirmation`。

- 收入数据默认保存在本机，不要求账号，V1 不做 iCloud / 云同步。
- CSV 导出覆盖所有餐厅、班次与收入字段；导出不受付费墙限制。
- JSON 导出用于完整备份；JSON 导入必须二次确认，不得静默覆盖本机数据。
- iOS 导出走系统分享表，用户可存到文件、隔空投送或其它 App。
- iOS 导入走系统文件选择器。
- About & privacy 须说明：数据保存在本机、无账号、无云同步、无广告、无追踪。
- App Store 隐私营养标签与上述说明一致：不收集用户数据。

### 6.10 无打扰与收费原则（P0，必须）

- 保存、编辑和查看班次历史的关键流程中不展示广告、不弹出升级提示。
- 餐厅数量、基础班次记录、历史查看、CSV 导出与数据恢复不应被付费墙拦住。
- 若后续引入付费，优先用于高级分析、预测或团队协作，并在购买前说清权益。V1 不接入 IAP。

### 6.11 UI 与交互规范（P0，必须）

- 视觉与交互以 Figma 为准，并遵循 [UI 原型设计说明](design/UI原型设计说明.md) 与 [Apple Design 参考文档](design/apple.design.md) 中适用于产品界面的部分。不照搬 Apple 官网营销页布局。
- 系统字体优先（San Francisco）；主交互色 `#0066CC`；页面背景以白色为主；浅灰 `#F5F5F7` 只用于分组、输入底和摘要卡。
- 不用阴影做层级，不用紫色渐变或装饰插画。
- 底部 Tab 仅三个：Calendar、Stats、Me。Me 使用人物图标。
- Me 首屏只显示四个列表入口：Restaurant settings、Preferences、Data & backup、About & privacy。不做账号、主题、通知或帮助中心。
- Preferences 至少包含每周起始日；可预留显示偏好。
- 默认路径只服务于「记录一班净收入」。More options 才出现：Lunch / Dinner、Clock in / Clock out、未付休息、其他收入、销售额、自动 tip-out、备注。
- 全局统一术语及展示顺序：总小费、工资收入、tip-out、净收入、实际时薪。
- 适配 Dynamic Type 与 VoiceOver：金额、按钮、Tab 必须有无障碍标签。点击区域不小于 44pt。
- 尊重 Safe Area；横屏不是 V1 目标，以 iPhone 竖屏为准。
- 界面文案 V1 使用英文，与 Figma 一致。

## 7. V1 范围外

- 复杂的多岗位管理与跨餐厅对比分析。
- 小费池分配、团队协作、电子签收或经理审批。
- 收入预测、收入目标与「多上一个班能赚多少」情景分析。
- 税务估算、报税文件或专业财务建议。
- 跨设备云同步、iCloud 同步、第三方支付或 POS 集成。
- 高级提醒、推送与自动抓取排班。
- 账号体系、Apple 登录、广告、订阅墙。
- Android 发布与 Android 特有交互验收。
- iPad 优化布局。

## 8. 成功指标

- 新用户能在首次打开后完成一条班次记录。
- 熟练用户在默认餐厅和默认规则下完成一次真实班次记录：30 秒以内。
- 目标体验：熟练用户在默认路径下 20 秒内完成一次记录。
- 用户无需手动计算，即可得知本班净收入和实际时薪。
- Calendar 的每日金额、Stats 的周/月统计与班次明细加总保持一致。
- 用户可在不创建账号的情况下导出完整收入数据，并能确认后恢复 JSON 备份。
- 每次保存班次均在无广告、无升级弹窗的情况下完成。
- 核心流程在真机 iPhone 上可单手完成。

## 9. 后续版本候选

1. 多工作地点/岗位与对比分析。
2. 收入预测、目标与排班决策。
3. 小费池与团队协作工具。
4. 云同步、iCloud 与税务汇总。
5. Android 发布。

## 10. iOS 开发规格

### 10.1 目标与工程位置

- 用 Expo + React Native 实现本需求，优先交付 iOS。
- 应用代码位于仓库 `tip-calendar-rn/`。开发、安装、测试和构建命令均在该目录执行。
- 领域计算从 `h5/src/domain/` 迁移或复写为平台无关 TypeScript，并带上对等单元测试。
- 当前不包含账号、云同步、真实支付、POS 或生产后端。

### 10.2 页面与 Figma 对照

| iOS 页面 | Figma 画板 | 关键交互 |
|---|---|---|
| Onboarding | `onboarding-step1-restaurant`、`onboarding-step2-base-pay`、`onboarding-step3-tipout` | 创建第一家餐厅；薪资与 tip-out 可 Skip |
| Calendar | `calendar-home`、`calendar-empty-state` | chevron 换月；无记录日直达新增；有记录日打开 sheet |
| Day Details | `day-details-sheet`、`day-details-multi-shift` | 底部 sheet；单班/多班详情；编辑、删除、同日新增 |
| Record / Edit Shift | `record-shift-form`、`edit-shift-form`、`record-shift-form-more-options` | 只读日期；默认短表单；实时计算；固定保存 |
| 计算说明 / 校验 | `calculation-breakdown`、`form-validation-errors` | 展开计算依据；保存前用白话提示错误 |
| 无餐厅拦截 | `record-shift-no-restaurant` | 引导去创建餐厅 |
| 删除确认 / 撤销 | `delete-shift-confirmation`、`delete-undo-toast` | 确认后删除；短暂 Undo |
| Stats | `stats`、`stats-month-view` | 周/月切换；五项指标；筛选；点某日回 Calendar |
| Me | `me` | 四个列表入口 |
| Restaurant settings | `restaurant-settings`、`add-restaurant-form` | 增删改餐厅；常用餐厅；薪资与 tip-out |
| Preferences | `preferences` | 每周起始日 |
| Data & backup | `data-and-backup`、`json-restore-confirmation` | 分享 CSV/JSON；确认后导入 |
| About & privacy | `about-and-privacy` | 本地保存与隐私说明 |

不实现：`[old] onboarding-welcome`。

### 10.3 导航规则

- Tab：`Calendar` 默认首页，`Stats`，`Me`。
- 新增班次：`shift/new`，通过 query 传入本地日期。
- 编辑班次：`shift/[id]`。
- Day Details 是 Calendar 上的 modal sheet，不是独立 Tab。
- Onboarding 在无餐厅时全屏插入，完成后进入 Calendar。
- Me 的四个入口进入二级 Stack 页。

### 10.4 班次表单边界

- 默认可见：餐厅、工作时长、现金小费、信用卡小费、可选手动 tip-out、净收入、实际时薪。
- More options：Lunch / Dinner、Clock in / Clock out、未付休息、其他收入、销售额、信用卡到账方式、自动 tip-out、备注。
- 销售额字段仅在 tip-out 为销售额百分比时出现。
- Clock in / Clock out 与直接工时二选一；结束早于开始时显示次日结束，并回填唯一工时。
- 底部固定 Save shift；保存流程无广告、无升级弹窗。

### 10.5 必须覆盖的界面状态

- 首次使用：Onboarding 创建第一家餐厅。
- 空日历：能从任意日期开始记第一班。
- 无记录日期直达新增表单。
- 有记录日期打开 Day Details。
- 同日多班与当日汇总。
- 无 tip-out：不展示复杂字段。
- 无餐厅：拦截并引导创建。
- 编辑历史班次后，日历、详情、统计即时重算。
- Stats 周/月、餐厅筛选、点日期回 Calendar。
- 删除确认与 Undo。
- 表单校验错误。
- 跨午夜班次。
- JSON 导入确认与失败白话提示。
- 保存中 / 已保存 / 保存失败。

### 10.6 技术与平台约束

- TypeScript + Expo Router + NativeWind。
- 本地持久化，领域层不直接依赖具体存储库。
- 离线可用：记录、计算、保存、查看历史不依赖网络。
- iOS 最低验收机型：当前主流 iPhone 逻辑宽度 390pt（与 Figma 画板一致），并检查较小机型（例如 SE）上主按钮与金额仍可读、可点。
- 依赖优先 `npx expo install`。发布走 EAS。细节见 Expo 技术文档。

### 10.7 测试要求

- 单元测试：收入计算、tip-out、跨午夜、统计汇总、周起始日；与 H5 用例对齐。
- 组件测试：表单输入、错误提示、保存状态。
- iOS E2E 至少覆盖：Onboarding、空日期直达新增、保存后日历更新、编辑删除撤销、Stats 周/月与筛选、CSV/JSON 导出与确认导入。

## 11. 开发阶段与验收

按用户路径分期，不按 Figma 画板从左到右做。同一页面的多种状态放在同一阶段。

### 阶段 0：地基

**范围：** Expo 项目壳、NativeWind、Calendar / Stats / Me Tab、theme、从 H5 迁移 domain 与单测、本地存储接口。

**验收：** 三个 Tab 可切换；领域计算测试通过；尚未要求像素级页面。

### 阶段 1：首次使用 + 空日历

**范围：** Onboarding 三步、创建第一家餐厅、`calendar-empty-state`。

**Figma：** `onboarding-step1-restaurant`、`onboarding-step2-base-pay`、`onboarding-step3-tipout`、`calendar-empty-state`。

**验收：** 新用户能建好餐厅并看到空日历；Skip 薪资/tip-out 后仍能进入日历；再次打开不再走 Onboarding。

### 阶段 2：20 秒记录闭环（MVP）

**范围：** 默认 Record Shift 表单、实时计算、保存、`calendar-home` 显示每日净收入和三张摘要卡。

**Figma：** `record-shift-form`、`calendar-home`。

**验收：** 点无记录日期进入绑定该日的表单；填写工时与小费后净收入实时变化；保存后日历出现绿色金额；刷新 App 后数据仍在。熟练路径可按 30 秒验收、20 秒为目标。

阶段 2 完成即具备可自用的记账闭环。

### 阶段 3：当天详情与改删

**范围：** Day Details sheet、同日多班、编辑、删除确认、Undo。

**Figma：** `day-details-sheet`、`day-details-multi-shift`、`edit-shift-form`、`delete-shift-confirmation`、`delete-undo-toast`。

**验收：** 有记录日期打开 sheet；多班分别展示且日历为当日总和；编辑后立即重算；删除需确认且可短暂撤销。

### 阶段 4：表单进阶状态

**范围：** More options、计算说明、校验、无餐厅拦截、跨午夜与未付休息。

**Figma：** `record-shift-form-more-options`、`calculation-breakdown`、`form-validation-errors`、`record-shift-no-restaurant`。

**验收：** 默认表单仍短；展开后可处理 Clock in/out、Lunch/Dinner、自动 tip-out；错误用白话提示；无餐厅时被拦截。

### 阶段 5：Stats + Me + 备份

**范围：** Stats 周/月与筛选、Me 四个入口、餐厅设置、偏好、CSV/JSON、隐私页。

**Figma：** `stats`、`stats-month-view`、`me`、`restaurant-settings`、`add-restaurant-form`、`preferences`、`data-and-backup`、`about-and-privacy`、`json-restore-confirmation`。

**验收：** Stats 与日历、明细加总一致；周起始日生效；CSV 可分享；JSON 导入必须勾选确认；隐私文案与本机存储策略一致。

### 阶段 6：iOS 真机与发布准备

**范围：** 真机单手走查、Dynamic Type / VoiceOver 抽查、Expo Doctor、EAS preview、隐私与权限检查。

**验收：** 在真机 iPhone 上完成 Onboarding → 记一班 → 看日历 → 看 Stats → 导出备份；无广告无升级弹窗；不申请与功能无关的系统权限。

阶段 5 产品验收通过、阶段 6 真机通过后，才视为 iOS V1 可提交商店候选。
