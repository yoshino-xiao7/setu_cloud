# P17 · Web 收敛

正式依据：独立 architecture 仓库 `11-execution-tasks.md` 的完整 P17 段落，以及直接引用的 07、05、08 §1、10 §O。依赖 P3/P5/P7，属于可与 iOS 并行的 Web 轨道；没有 M-13 PASS 开发前置条件。未开始 P18。

## 实现

- 旧删歌接口仍删除 playlist membership：路由用 `relationId`，不传 `trackId`。本地歌单计数拒绝 provider ID；来源歌单只读，本地歌单仅所有者展示编辑入口。
- 全部音乐 API ID 改 string，旧 JSON 在数值 token 转换前保留 ID 字面量；localStorage 兼容可精确表示的旧 number，已损坏的大整数拒绝恢复。
- v2 读模型校验 required-nullable、实体判别与分页，未知 Home section/item kind 跳过。独立的 Web reader schema 从 FINAL 资源抽取读端所需约束，容忍额外字段及非判别枚举扩展，并将 PlaybackSource 消费形式调整为 accepted Contract 3.0.0；原 FINAL/Frozen 未改。
- 播放显式协商/校验 Contract 3.0.0；`refreshAt` 与 nullable `sourceExpiresAt` 分开，拒绝 legacy `expiresAt`，拒绝 denied/身份错配/非法 URL，不在 v2 失败后回落 v1。
- 歌词使用结构化行与翻译；word 只显示权威行文本，没有逐字动画。legacy LRC 兼容仅留在关闭切换开关的适配器中，store 不再解析 LRC。
- 音乐首页、四类内容组件、榜单、喜欢歌曲、收藏歌单、provider/local 详情及分页接线完成。新增入口仅在 mock 下可见，真实开关均 false。
- 同一个 Music Pinia store 承载用户库状态，复用 P15 模式：乐观写、单项失败回滚、GET 后台对账、账户代际隔离；未知写结果不重放 mutation。
- 只读音乐 GET 缓存 60 秒，按用户及参数分隔；排除 playback/FM；写后清除，阻止迟到请求重新填入旧值，缓存命中不延长原 TTL。认证、签名、错误拦截逻辑未改。
- Token 页面保留既有状态并明确说明：当前后端没有自动降级原因字段，不能把所有 disabled 状态冒称自动降级。没有变更 token CRUD 行为。

## 验证

- 最终 phase targeted + 必要直接单测：36/36 PASS。
- Web full unit：74/74 PASS，执行一次；随后窄范围修复仅补 targeted。
- 1440/390 UI：54 个独立用例最终全部 PASS，包括各页面四态、分页/回滚入口、关系删除、来源歌单播放、翻译、历史、MV 拖拽/位置持久化和 token 页面。首轮失败与定向复验均保存在 `ui-results.json`。
- Media Session：实际浏览器 metadata、5 个注册 handler 和 pause 接线通过。未把这些结果称为物理 OS 锁屏分发的证据。
- Web client/SSR 编译、预渲染完成一次。tsx IPC 被沙箱拒绝后仅补构建后 AASA/sitemap 步骤，均通过；动态站点地图源 403，仍生成 3 个静态 URL。构建生成的 tracked 日期已恢复。
- iOS main `ee6e01c957a39ba2de53aba9c3bae266fe5fdc78`：Swift full 仅一次，311/312；旧认证测试异步探针捕获读取 nil。该项不改代码定向复验 1/1 PASS。不得将原 full 结果改写为 312/312 PASS。connected physical-device build 一次 PASS。
- FINAL 71 boundary / 85 evidence cases PASS；Frozen 74 artifacts PASS；diff check PASS。
- 最大音乐命名 JS chunk gzip 10,205 bytes；同 P0 文件名筛选口径的 JS/CSS 合计 gzip 65,434 bytes，小于 120 KiB。这不是路由全部传递依赖下载体积。

## 保留的基线限制

正式 `npm run typecheck` 脚本 exit 0，但 root tsconfig 的项目引用没有被该命令遍历。额外 `vue-tsc --noEmit -p tsconfig.app.json` 保留 184 条已有诊断，当前新音乐实现无诊断。未修无关 UI/type baseline。包括旧 MiniPlayerBar 的模板 ref 未使用提示和旧 MusicHistory 的 retry 接线问题；此次没有把额外应用类型检查标为全绿。

P0 Web LCP 采样实际跳转登录页，音乐 LCP 为 null。没有可比较的有效 baseline，因此不宣称 LCP 不退化或性能改善。真实切换仍关闭；浏览器 mock 软件验收不替代真实 cutover 或物理锁屏验收。

四种播放模式、`<audio>` 与 HTTPS fallback、Media Session 实现、GlobalMvPlayer 与拖拽实现字节保持不变。MV 相关唯一类型传播是 number 0 比较改为 string '0'；没有更改 MV 行为。Backend 无修改，无新生产依赖，无用户数据迁移。

## P16 与 M-13

P16 原诊断 `30870fd` 来自独立 docs 仓库，原文及 closure 经正常非 fast-forward merge 合入 iOS main `ee6e01c`。P16 DIAGNOSIS COMPLETE / TARGET SATISFIED / OPTIMIZATION NOT JUSTIFIED BY CURRENT EVIDENCE / ZERO-CODE CLOSURE ACCEPTED。20 prepared-hit 样本 P50 157.09 ms、P90 201.88 ms；保留采集偏差，不宣称 audible latency、性能提升或长期稳定性。production playback code 未变。

P14 M-13 EVIDENCE DEFERRED。本 Goal 未重试。以后先验证 1–2 分钟 Instruments trace 正常 Stop、保存、重新打开以及 memory/stall/audio 数据可读取，成功后才允许正式 30 分钟采样。

## 交付状态

P17 IMPLEMENTED / MERGE-READY，保留上述 baseline/外部证据限制；CLIENT CUTOVER OFF。详细结果、证据路径与 SHA-256 见 `verification.json`。
