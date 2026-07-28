# 前端设计评审与重构计划

更新时间：2026-07-08
评审对象：`setu_cloud`（Vue 3 控制台）视觉与设计系统层
评审基准：`docs/agents/ui-guidelines.md`、`src/styles/liquid-glass.css`，以及 43 个视图 / 28 个组件的实际用法
范围约束：不改后端接口语义、不改 API 路径、不改现有 UI 观感与技术栈（Vue 3 / Router / Pinia / Naive UI）。本轮只治理「设计系统 / 样式」这一层，与已完成的架构重构（见 `frontend-refactor-summary.md`）互补。
本轮结论：**深色模式暂不纳入范围**，保持浅色品牌观感；语义 token 仅作为「统一真源」的手段，不引入深色主题。

---

## 1. 总体结论

当前前端**部分达标**。`ui-guidelines.md` 规则本身写得具体、方向正确，较新的 `--ui-*` 产品层也是可靠底座（`ui-card` 使用 125 次、`ui-page` 98 次）。但**设计系统本身仍处于迁移中途**，是主要短板：两套并存的 token / 组件语言、token 未真正成为唯一真源、缺少共享展示组件。你感受到的「某些区域还有不少问题」是结构性的，而不是个别页面的美化问题。

---

## 2. 现状优点（保留）

- 有成文、可执行的 UI 标准（token、断点、状态覆盖、验收视口）。
- `--ui-*` 产品层（`ui-page` / `ui-card` / `ui-stat-card` / `ui-pill`）克制、比例合理，适合控制台。
- 响应式基础设施已完备：`useBreakpoint()`、`.responsive-table`、`.mobile-action-bar`、`prefers-reduced-motion` 与低性能设备降级媒体查询。
- 架构层（API unwrap、chunk 拆分、断点统一）已由上一轮重构完成，本轮可专注设计层。

---

## 3. 问题清单（按严重度，附证据）

### P0 · 两套设计系统并存于同一文件（根因）
`liquid-glass.css`（863 行）同时承载重型 `--lg-*`「液态玻璃」系统（`lg-card` / `glass-card`，带持续动画）与更克制的 `--ui-*` 产品系统。指南本身把这种分裂固化为规则（「新页面用 `ui-*`，遗留区用 `lg-*` / `glass-*`」）。实际用量：`glass-card` **56 次**、`lg-button` 11 次、`lg-card` 6 次 —— 遗留系统仍与 125 个 `ui-card` 大量共存。**两个真源 → 页面间表面不一致，且无法一处调整全站风格。**

### P0 · token 并非真正的唯一真源
指南要求「CSS 变量是唯一真源」，但实际：**42 个视图文件含硬编码 hex**；内联 `style="…"` 散落（`ImageAudit` 16 处、`AdminImageDeleteRequests` 9 处、`ProfileView` 8 处）；**68 个 `<style scoped>` 块**各自重复定义卡片 / 间距 / 颜色。token 存在但持续泄漏。

### P1 · 缺少共享展示组件 → 重复与超大 SFC
没有 `<UiPage>` / `<UiCard>` / `<PageHeader>` / `<StatCard>` 这类通用展示组件，只有业务专用组件（`ai-draw/`、`points-call/`）。于是每个页面手工拼 `div.ui-page > header + div.ui-card` 并各写一份 CSS。这直接导致最大页面体量失控：`CollectionSquare` **1254**、`ProfileView` **1222**、`AiDraw` 1080、`UsageGuide` 1050 行。

### P1 · 玻璃层的性能与脆弱性成本
持续无限动画（`lgRefraction` 8s、`lgButtonShimmer` 3s）叠加大量 `backdrop-filter: blur(28px) saturate(200%)`；并有 **25 处 `!important`**，`glass-card` / `glass-table` 借此覆盖 Naive UI 内部样式 —— 对 Naive UI 升级很脆弱。虽有低性能媒体查询兜底，但默认路径偏昂贵。

### P2 · 可访问性 / 对比度
`--ui-text-soft: #8a94a6` 在白底上约 **2.9:1**，低于正文 AA 所需的 4.5:1；半透明玻璃叠在任意背景上，也使对比度不确定。指南覆盖了状态与标签，但未规定对比度阈值。

### P2 · 内联样式与一次性配色
散落的内联 `style` 与一次性 hex 违反「避免一次性配色」原则，且绕开断点与降级策略，是移动端溢出 / 遮挡的潜在来源。

---

## 4. 重构计划（分阶段、低风险、观感不变）

原则：每个阶段独立编译、独立上线、独立验收；用 Phase 0 的基线证明「观感未变」。**不新增深色主题。**

### Phase 0 · 冻结与度量（约 0.5 天）
- 新增对比度 / token 校验脚本（可挂到 `npm run check`）。
- 在 1440 / 390（浅色）截图关键路由，作为后续阶段的视觉基线。

### Phase 1 · token 归一为唯一真源
- 拆分 `liquid-glass.css` → `tokens.css`（全部变量：颜色 / 间距 / 圆角 / 阴影 / 层级）、`primitives.css`（`.ui-*`）、`effects-legacy.css`（`lg-*` / `glass-*` 玻璃效果）。
- 增加**语义 token**（`--surface`、`--surface-elevated`、`--text-1/2/3`、`--border`），让两套系统映射到同一语义层。
- 修正 `--ui-text-soft` 至通过 AA。
- 说明：语义层的目的是「统一真源」，不是引入深色主题；仍保持浅色品牌观感。

### Phase 2 · 引入共享组件
- 封装 `<UiPage>` / `<PageHeader>` / `<UiCard>` / `<StatCard>` / `<PillTag>` / `<SectionTitle>`（内部就是现有 `ui-*` 类）。
- 先迁移 3–4 个代表页（`ProfileView`、`AiHistory`、一个后台表格页），删除其 scoped CSS，验证组件可行且超大文件显著瘦身。

### Phase 3 · 退役重复的玻璃系统
- 将剩余 56 处 `glass-card` / `lg-*` 收敛到 `ui-card` / 组件。
- 移除 `effects-legacy.css` 与相关 `!important` 覆盖。
- 将持续动画改为「按需 opt-in」类，默认路径廉价。

### Phase 4 · 清扫硬编码与内联样式
- 用 Phase 0 校验强制：视图内不得出现裸 hex / 内联 `style`，一律走 token 或组件。
- 更新 `ui-guidelines.md`：补充对比度阈值与「组件优先」指引。

---

## 5. 验收

- 每阶段跑 `npm run typecheck && npm run lint && npm run build`。
- 按指南在 1440px 与 390px 复核：无横向滚动、无卡片 / 按钮 / 文本 / 浮条重叠、加载 / 空 / 错 / 已填充状态合理。
- 用 Phase 0 视觉基线对比，确认观感未变（仅结构与 token 收敛）。
- 对比度：正文 ≥ 4.5:1、大字 / 图标 ≥ 3:1。

---

## 6. 附录：证据数据（2026-07-08 采集）

| 指标 | 数值 |
| --- | --- |
| `ui-card` / `ui-page` 用量 | 125 / 98 |
| `glass-card` / `lg-button` / `lg-card` 用量 | 56 / 11 / 6 |
| `liquid-glass.css` 行数 / `!important` | 863 / 25 |
| 含硬编码 hex 的视图文件 | 42 |
| 内联 `style` 高发页 | ImageAudit 16、AdminImageDeleteRequests 9、ProfileView 8 |
| `<style scoped>` 块总数 | 68 |
| 最大视图（行） | CollectionSquare 1254、ProfileView 1222、AiDraw 1080、UsageGuide 1050 |
| 深色模式 | 无（本轮维持浅色，不新增） |
| 通用展示组件 | 无（仅业务专用组件） |

---

## 7. 参考

- `docs/agents/ui-guidelines.md` — 评审基准
- `src/styles/liquid-glass.css` — 现有设计系统
- `docs/frontend-refactor-summary.md` / `docs/frontend-refactor-plan.zh.md` — 上一轮架构重构（本轮与之互补，不重复）
- `docs/optimization-recommendations.md` — 既有优化建议
