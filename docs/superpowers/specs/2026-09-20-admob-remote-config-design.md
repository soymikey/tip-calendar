# AdMob Banner 与 Remote Config 广告开关

日期：2026-09-20
范围：`tip-calendar-rn/` iOS。为 Calendar 与 Stats 页面增加可远程关闭的底部 Banner 广告，同时保持核心记账功能、隐私选择和离线体验不受影响。

## 背景

Tip Calendar 1.0 是无账号、本地存储的收入记录工具。产品希望通过 AdMob Banner 获得广告收入，并使用 Firebase Remote Config 的 `showAd` 字段控制广告是否启用。

已提供配置：

- Bundle ID：`app.tipcalendar`
- AdMob App ID：`ca-app-pub-3534156575856999~3337306828`
- AdMob Banner Ad Unit ID：`ca-app-pub-3534156575856999/7356442883`

## 产品目标

- 只在 Calendar 与 Stats 两个主页面底部展示自适应 Banner。
- 通过 Remote Config 在无需发布新版本的情况下关闭或开启广告。
- 广告加载、配置请求或隐私流程失败时，核心功能继续正常工作。
- 遵守 Google UMP、Apple App Tracking Transparency 和 App Store 隐私披露要求。
- 开发与自动化测试绝不请求或点击真实广告。

## 非目标

- 不做插屏、开屏、激励视频或原生信息流广告。
- 不做按用户、餐厅、收入、班次或地理位置的广告定向。
- 不把本地班次、收入、餐厅、日期或备注传给 AdMob 或 Remote Config。
- 不使用 Firebase Remote Config 绕过 UMP 或用户的隐私选择。
- 本版本不主动请求 IDFA，不展示 ATT 系统弹窗。
- 不在录入班次、餐厅设置、Preferences、备份、隐私或 onboarding 页面展示广告。

## 展示规则

广告只有在以下条件全部满足时才可显示：

```text
Remote Config showAd === true
AND UMP canRequestAds === true
AND 当前页面是 Calendar 或 Stats
AND Banner 已成功加载
```

任意条件不满足时，不渲染广告内容，也不保留空白占位。

### Remote Config

- 参数名：`showAd`
- 类型：Boolean
- App 内默认值：`false`
- Firebase 控制台初始生产值：`false`
- App 启动时执行一次 `setDefaults`、`fetchAndActivate`。
- 正常生产环境最短拉取间隔为 12 小时；开发构建可缩短以便测试。
- 拉取超时、网络失败、字段缺失或类型异常均回退为 `false`。
- 页面切换不得重复拉取 Remote Config。
- Remote Config 只决定广告功能是否启用，不保存或替代隐私同意状态。

## 隐私与同意

### UMP

- 使用 Google User Messaging Platform 获取广告请求资格。
- 每次冷启动调用 consent info update，让 SDK 判断当前地区是否需要表单。
- 如果需要，展示 Google 配置的 European regulations 或 US state regulations 表单。
- 只有 `canRequestAds` 为 `true` 时才初始化和加载广告。
- 如果 UMP 表示需要 Privacy options，Preferences 页面显示 `Ad privacy choices` 入口。
- 用户必须能从 Preferences 重新打开隐私选项并撤回选择。

### ATT 与广告类型

- 当前方案不主动访问 IDFA，不添加自定义 ATT 前置弹窗。
- 不主动调用 `requestTrackingAuthorization`。
- 使用 Google Mobile Ads 在没有 IDFA 时允许的广告请求方式。
- 如果未来启用个性化广告、跨 App 跟踪或 IDFA，必须另立需求，添加 `NSUserTrackingUsageDescription`、ATT 流程并重新填写 App Privacy。

### 与 Analytics 同意分离

- 现有 `analyticsConsent` 只控制 Firebase Analytics 与 Crashlytics。
- UMP 单独管理广告相关同意。
- 用户拒绝 Analytics 不应自动阻止合法的广告请求；用户的广告隐私选择也不应自动开启 Analytics。
- `showAd=false` 时不初始化广告 SDK，不发起广告请求。

## 页面与布局

### Calendar

- Banner 固定在底部 Tab Bar 上方。
- 广告宽度基于当前安全区域内可用宽度计算，使用 anchored adaptive banner。
- 广告不得覆盖日历最后一行、日期详情面板或 Undo 提示。
- 广告出现或消失时应调整内容底部空间，不得遮挡或让 Tab Bar 跳动。

### Stats

- Banner 固定在底部 Tab Bar 上方，规则与 Calendar 一致。
- 统计内容必须保持可滚动，最后一项不能被广告遮挡。

### 可访问性

- 广告由 Google SDK 提供的可访问性语义负责。
- App 自有容器不添加误导性的按钮角色。
- 广告不可用时不能留下可聚焦的空容器。

## 技术方案

### 依赖

- `react-native-google-mobile-ads`
- `@react-native-firebase/remote-config`
- 继续使用现有 `@react-native-firebase/app`
- 继续使用 iOS static frameworks 配置

### Expo 配置

- 在 `app.json` 注册 Google Mobile Ads config plugin。
- 配置 iOS AdMob App ID。
- 保留 `useFrameworks: "static"`，并满足 Google Mobile Ads 静态链接要求。
- 插件生成 Google 要求的 `SKAdNetworkItems` 和原生配置。
- 不在代码日志中输出完整广告响应、设备标识或 consent 字符串。

### 模块边界

```text
App 启动
  -> remoteConfig/adConfig.ts
       -> 默认 showAd=false
       -> fetchAndActivate 一次
  -> ads/consent.ts
       -> UMP consent info update
       -> 必要时显示表单

Calendar / Stats
  -> AdBannerSlot
       -> useAdAvailability
       -> showAd && canRequestAds
       -> BannerAd
```

- Remote Config、UMP 与 Banner UI 分为三个边界清晰的模块。
- 页面只能消费最终的广告可用状态，不直接调用 Firebase 或 UMP。
- 原生模块在 Expo Go 不存在时，广告功能安全退化为关闭。

## 广告 ID 与环境

- 生产 App ID：`ca-app-pub-3534156575856999~3337306828`
- 生产 Banner ID：`ca-app-pub-3534156575856999/7356442883`
- `__DEV__`、development 和 preview 构建必须使用 Google 官方测试 Banner ID。
- 只有 production 构建可使用真实 Banner ID。
- 测试代码不得断言或加载真实广告内容，只测试状态与组件边界。

## 状态与错误处理

| 场景 | 期望行为 |
|---|---|
| `showAd=false` | 不初始化/加载 Banner，不显示占位 |
| Remote Config 离线或失败 | 使用默认 `false` |
| UMP 表单需要展示 | 完成表单前不请求广告 |
| UMP 请求失败 | 使用 SDK 当前有效状态；仍不允许时保持无广告 |
| 用户拒绝个性化 | 按 UMP/SDK 允许范围请求无 IDFA 广告 |
| Banner 加载失败 | 隐藏广告位，核心页面不报错 |
| 页面切换 | 仅目标页面渲染广告，不重复拉取配置 |
| Expo Go | 广告功能 no-op，App 正常运行 |

广告错误可以在开发环境记录简短错误码，生产环境不得弹窗或阻挡用户。

## 后台配置要求

### AdMob

- iOS App 必须绑定 `app.tipcalendar`。
- Banner 广告单元已创建并处于可用状态。
- 完成付款资料、身份验证和适用的税务资料。
- 在 Privacy & messaging 创建所需的欧洲与美国州法规消息。
- 发布可随时访问的 Privacy options 表单。

### Firebase

- 在当前 Tip Calendar Firebase 项目启用 Remote Config。
- 创建 Boolean 参数 `showAd`，初始值为 `false`。
- 首次生产验证完成后再将目标条件改为 `true`。

### app-ads.txt

- 在最终公开开发者网站根目录发布：

```text
google.com, pub-3534156575856999, DIRECT, f08c47fec0942fa0
```

- AdMob 后台的开发者网站需要与承载 `app-ads.txt` 的域名一致。

## 隐私政策与 App Store

加入 AdMob 后必须更新：

- App 内 About & privacy。
- 网站 Privacy Policy。
- App Store Connect App Privacy。
- App Store 年龄评级和广告相关问项。
- 审核说明，注明广告由 Remote Config 控制以及如何测试。

App Privacy 至少重新评估：Device ID、Advertising Data、Product Interaction、Coarse Location、Other Usage Data、Diagnostics、Third-Party Advertising 和 Tracking。最终答案以构建中的 Google SDK privacy manifest、UMP 配置及实际广告请求行为为准。

## 测试策略

### 单元测试

- 缺失配置时 `showAd` 默认 `false`。
- Remote Config 返回布尔值时正确解析。
- Remote Config 异常时保持 `false`。
- 广告可用状态要求 `showAd` 与 `canRequestAds` 同时为真。
- development/preview 使用测试广告 ID，production 使用真实 ID。
- UMP 未完成时不创建 Banner。

### 组件测试

- Calendar 与 Stats 在允许时渲染广告位。
- 其他页面不渲染广告位。
- Banner 加载失败后广告位消失。
- 广告出现时内容和 Tab Bar 不被遮挡。

### 真机验证

- TestFlight 或 development build 验证 UMP 表单、Privacy options 和测试 Banner。
- 分别验证 `showAd=false`、`showAd=true`、离线、拒绝同意与允许同意。
- 使用 Ad Inspector 检查广告请求，不点击真实广告。

## 验收标准

1. Remote Config 默认或远程值为 `false` 时，所有页面均无广告请求和广告空间。
2. `showAd=true` 且 UMP 允许时，Calendar 与 Stats 底部显示测试 Banner。
3. 其他页面永远不显示 Banner。
4. UMP 未允许请求广告时，不初始化或加载 Banner。
5. Preferences 在需要时提供 `Ad privacy choices`。
6. 广告和 Remote Config 失败不影响新增班次、查看统计、导入导出和删除数据。
7. 开发与 preview 包中不会加载真实广告单元。
8. TypeScript、ESLint、Jest 与现有发布检查全部通过。
9. 生成的新 IPA 包含正确 AdMob App ID、Remote Config 和 Google SDK privacy manifests。
10. App Store Connect 隐私标签、隐私政策和审核说明与实际构建一致后才允许提交审核。

## 发布顺序

1. 完成 AdMob Privacy & messaging 和 Remote Config 后台配置。
2. 按测试驱动方式实现 Remote Config、UMP 和 Banner。
3. 使用测试广告完成模拟器/真机验证。
4. 部署更新后的隐私政策与 `app-ads.txt`。
5. 生成新的生产构建；由于 Build 4 不包含广告，广告版本必须使用 Build 5 或更高编号。
6. 上传并等待 App Store Connect 处理。
7. 根据最终 IPA 更新并发布 App Privacy。
8. 选择新 Build，完成价格、地区和审核说明后提交审核。
