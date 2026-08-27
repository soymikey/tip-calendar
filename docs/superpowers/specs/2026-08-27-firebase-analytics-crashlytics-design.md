# Firebase 匿名用量与崩溃上报

日期：2026-08-27  
范围：`tip-calendar-rn/` iOS。回答「有没有人在用、有没有人在记班次」，并收集崩溃。不上报班次内容。

## 目标

V1 本地记账，没有账号。产品上仍需要知道：

- 有多少独立安装在打开 App
- 有没有人真正保存班次
- 发布后有没有崩溃

用 Firebase Analytics + Crashlytics 做这件事。收入、餐厅名、日期、备注留在本机。

## 已确认的产品决定

1. 用 **React Native Firebase**（`@react-native-firebase/app` + `analytics` + `crashlytics`），不用 Firebase JS SDK，也不用 Sentry 另开一套。
2. 匿名统计。关掉 iOS 广告 ID / IDFA。不上 ATT。`NSPrivacyTracking` 保持 `false`。
3. 独立用户数、打开次数靠 SDK 自带事件（`first_open`、session）。自定义事件只补业务动作。
4. 自定义事件可以带布尔或枚举参数，**禁止**金额、店名、`localDate`、备注、班次 id、餐厅 id。
5. 埋点失败不得挡住保存、导出、删除。用户操作成功，上报失败就丢掉。
6. Expo Go 里原生 Firebase 模块不存在：App 必须仍能跑，事件变成 no-op。真正上报只发生在 EAS development / preview / production 包。
7. 同步改 About & privacy 文案，以及 App Store / `privacyManifests` 声明。

## 明确不做

- 不做 Authentication、Remote Config、Cloud Messaging、AdMob、Dynamic Links。
- 不弹 ATT，不读 IDFA，Android 若以后打包则 block `AD_ID` 权限。
- 不上报班次或收入内容，不做用户画像，不用数据做广告。
- 不改 H5（`src/`）。
- 不把 Firebase 初始化失败当成致命错误。

## SDK 与工程约束

- Expo SDK 57。按 [React Native Firebase + Expo](https://rnfirebase.io/) 接 config plugin。
- iOS Analytics plugin：`withoutAdIdSupport: true`（`$RNFirebaseAnalyticsWithoutAdIdSupport`）。
- `firebase.json`：`google_analytics_adid_collection_enabled: false`，并且关闭广告个性化信号。
- iOS `googleServicesFile`：`GoogleService-Info.plist`，bundle id 必须是 `app.tipcalendar`。
- 需要 `expo-build-properties` 做 iOS static linking（RN Firebase 在 Expo prebuild 下的常规要求）。
- 仓库可以提交 `GoogleService-Info.plist`（这是客户端配置，不是服务端密钥）。没有这份文件时，开发仍应能在 Expo Go 启动。

实现前需要产品提供 Firebase 项目和 plist。没有 plist 时：代码与 plugin 可以先接上，EAS iOS 构建会失败，直到文件就位。

## 事件

业务侧只通过一个薄封装发送，例如 `track(name, params?)`。测试断言调用了封装，不连真 Firebase。

| 事件名 | 何时 | 参数 |
|---|---|---|
| （SDK）`first_open` / session | 打开 App | 无自定义 |
| `shift_saved` | 新建或编辑班次保存成功之后 | `is_edit`: boolean |
| `onboarding_completed` | 第一家餐厅写入成功之后 | `skipped`: boolean |
| `backup_exported` | CSV 或 JSON 分享成功之后 | `kind`: `"csv"` \| `"json"` |
| `backup_imported` | JSON 覆盖本机成功之后 | 无 |
| `data_deleted` | 清空本机数据成功之后 | 无 |

不打：屏幕浏览、每次日历翻月、输入过程、删除单条班次（有 Undo，容易吵）。

Crashlytics：启动时启用收集。不额外打 log。致命 JS 错误交给 SDK。

## 架构

```
UI / 保存路径
  → src/features/analytics/track.ts   // 唯一入口
       → native Firebase（EAS 包）
       → 或 no-op（Expo Go / 测试）
```

- `track` 必须吞掉异常。
- 测试用可注入的 reporter，默认生产 reporter 才碰 RN Firebase。
- 不要在 `createShift` / `localStore` 里直接 import Firebase。保存成功的 UI 层（记班次、onboarding、backup）再 `track`。

## 隐私与上架

About & privacy 增加一节，大意：

- 这版会把匿名使用次数（例如打开 App、保存班次）和崩溃报告发到分析服务
- 不会上传班次金额、餐厅名或日期
- 不用这些数据做广告，也不与账号关联（这版没有账号）

`app.json`：

- `NSPrivacyTracking`: `false`（不变）
- `NSPrivacyCollectedDataTypes` 从空数组改为声明 Usage Data 与 Crash Data（分析 App 功能 / 稳定性；不用于追踪；不关联用户身份）
- 不加 `NSUserTrackingUsageDescription`

App Store Connect 隐私问答与上述一致。现有 `appConfig.test.ts` 里「collected data types 必须为空」要改成断言新的声明，而不是继续要求空数组。

## 验收

- EAS iOS 包：Firebase 控制台能看到 `first_open` 和一次 `shift_saved`。
- 人为制造的测试崩溃能出现在 Crashlytics（仅 development / preview，不要留在生产代码里）。
- Expo Go：打开 App、Skip onboarding、记一班，不崩溃，控制台可以打开发日志说明 analytics 被跳过。
- 保存班次在 analytics 抛错时仍然成功。
- 自定义事件 payload 的测试锁定：没有 cents、name、date、note 字段。

## 测试注意

Jest 默认 mock reporter。断言：

- `completeOnboarding` 成功路径会 `onboarding_completed`（`skipped` 与 Skip / Get Started 一致）
- 新建班次 `shift_saved` 且 `is_edit: false`；编辑为 `true`
- 导出 / 导入 / 清空在成功之后打对应事件
- reporter 抛错时保存/导出仍成功
