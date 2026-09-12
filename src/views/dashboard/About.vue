<script setup lang="ts">
import {
  DocumentTextOutline,
  HeartCircleOutline,
  HeartOutline,
  ImagesOutline,
  KeyOutline,
  RocketOutline,
} from '@vicons/ionicons5'
import { NIcon, NNumberAnimation } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { unwrapApiData } from '@/api/response'
import { fetchImageCount, normalizeImageCount } from '@/api/status'

import suzukiBack from '@/assets/mascots/suzuki-back.webp'
import suzukiFront from '@/assets/mascots/suzuki-front.webp'
import xueliangBack from '@/assets/mascots/xueliang-back.webp'
import xueliangFront from '@/assets/mascots/xueliang-front.webp'
import MascotHoloCard from '@/components/MascotHoloCard.vue'
import { safePush } from '@/utils/navigation'

const router = useRouter()

const totalImages = ref(0) // 收录总数

function goTo(path: string) {
  void safePush(router, path)
}

// 获取统计数据
onMounted(async () => {
  try {
    const res = await fetchImageCount()
    const data = unwrapApiData(res, 0)
    totalImages.value = normalizeImageCount(data)
  }
  catch {}
})
</script>

<template>
  <div class="about-page ui-page">
    <div class="page-header">
      <h2 class="page-title">
        关于亦可
      </h2>
      <p class="page-subtitle">
        了解这里的初衷，以及背后的看板娘们
      </p>
    </div>

    <div class="about-hero glass-card">
      <div class="about-hero-copy">
        <span class="hero-eyebrow">YIKE · YK</span>
        <h3>亦可 YK（原雪涼云）</h3>
        <p>
          从雪涼云到亦可 YK，我们把图片浏览、音乐播放、AI 绘画和收藏分享汇聚在一起。你可以在 Web 与 iOS 客户端探索喜欢的内容，也可以通过 API 为自己的 bot 和小工具接入服务。
        </p>
      </div>

      <div class="hero-stat-panel">
        <div class="stat-icon">
          <NIcon size="30">
            <ImagesOutline />
          </NIcon>
        </div>
        <div>
          <div class="stats-label">
            当前图库已收录
          </div>
          <div class="stats-value">
            <NNumberAnimation
              :from="0"
              :to="totalImages"
              :active="true"
              :precision="0"
              show-separator
            />
            <span class="unit">张</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mascot-heading">
      <span class="hero-eyebrow">MASCOTS</span>
      <h3>本站看板娘</h3>
      <p>一个负责把前台和 bot 做得顺手可爱，一个负责把后台和系统撑稳。页面不该只介绍功能，也该让你看见站点背后的性格。</p>
    </div>

    <div class="mascot-list">
      <article class="mascot-entry">
        <MascotHoloCard name="雪涼" role="前端体验 · Bot" roman="YUKI RYOU" :front="xueliangFront" :back="xueliangBack" />
        <section class="mascot-story">
          <h4>认识雪涼</h4>
          <div class="info-content">
            <p>嗨呀，这里是雪涼。</p>
            <p>虽然看起来有点软绵绵的，但负责的事情可不少哦。平时你在这个面板上看到的页面、按钮、动画，还有和 bot 聊天时的那些小细节，基本都是我在一边喝着热牛奶一边一点一点搭起来的。</p>
            <p>我的工作，就是尽量让你「看得舒服、点得顺手、用得开心」，哪怕只是一个小提示、一行文案，也希望能让你感觉到：嗯，这里有人在认真对待你。</p>
            <p>如果哪天你觉得界面哪里怪怪的、bot 说话有点笨笨的……那大概就是我还没调好，请多多包涵，也欢迎悄悄告诉雪涼，我会乖乖记下来慢慢改好。</p>
            <p>至于后面那些看不见的东西嘛，就交给铃奈啦。我们两个从很早之前就一直一起折腾这些东西——我负责把画面和 bot 弄得可爱一点，她负责在后台吐槽「又加奇怪需求」，然后默默把系统撑住。</p>
            <p>虽然铃奈说话有时候有点凶凶的，其实人很可靠，也一直在背后帮我收拾烂摊子……这句话不要让她看到就好。</p>
          </div>
        </section>
      </article>
      <article class="mascot-entry">
        <MascotHoloCard name="铃木铃奈" role="后端系统 · 架构" roman="SUZUKI" :front="suzukiFront" :back="suzukiBack" />
        <section class="mascot-story">
          <h4>认识铃木铃奈</h4>
          <div class="info-content">
            <p>我是铃木铃奈。</p>
            <p>简单说，我负责的是你看不到、但整个站点离不开的那一层——那些请求怎么走、数据怎么存、权限怎么管，都是从我这里过一遍。你在前台点的每一个动作，最后都会敲到我这边的门。</p>
            <p>雪涼会把页面做得漂亮、bot 哄你开心，而我负责让这一切稳地运行下去：别乱掉、别崩、别丢东西。只要系统不出问题，你大概就不会想起我——这正是我最满意的状态。</p>
            <p>至于和雪涼的关系？嗯……勉强算是一起工作很久的搭档吧。她总是先把东西画得甜甜的、然后一脸无辜地说「铃奈，这里后台帮一下就好」，听起来好像很轻松，实际上每次都是一堆坑。</p>
            <p>但话说回来，有她在前面折腾界面，有我在后面盯着系统，我们两个配合起来还算不错。只要你用得顺利、数据安安全全，那就说明——前台那边她没有闹太大乱子，而后台这边我也没失误。</p>
            <p>……总之，不用太在意细节，有问题就交给我们，系统不会让你掉链子的。</p>
          </div>
        </section>
      </article>
    </div>
    <p class="mascot-hint">
      点击卡面翻面 · 移动鼠标或横向拖动查看流光
    </p>

    <!-- ✨ 快捷入口区域 -->
    <div class="quick-links-section">
      <div class="section-title">
        <span class="line" />
        <span class="text">快捷入口</span>
        <span class="line" />
      </div>

      <div class="quick-links-grid">
        <div class="glass-card quick-link-card" @click="goTo('/dashboard/api-keys')">
          <div class="link-icon" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #d97706;">
            <NIcon size="24">
              <KeyOutline />
            </NIcon>
          </div>
          <div class="link-content">
            <div class="link-title">
              API Key 管理
            </div>
            <div class="link-desc">
              创建和管理你的 API Key
            </div>
          </div>
        </div>

        <div class="glass-card quick-link-card" @click="goTo('/dashboard/collections')">
          <div class="link-icon" style="background: linear-gradient(135deg, #fce7f3 0%, #fce7f3 100%); color: var(--ui-primary);">
            <NIcon size="24">
              <HeartCircleOutline />
            </NIcon>
          </div>
          <div class="link-content">
            <div class="link-title">
              我的收藏
            </div>
            <div class="link-desc">
              管理你的收藏夹和图片
            </div>
          </div>
        </div>

        <div class="glass-card quick-link-card" @click="goTo('/dashboard/square')">
          <div class="link-icon" style="background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); color: #dc2626;">
            <NIcon size="24">
              <RocketOutline />
            </NIcon>
          </div>
          <div class="link-content">
            <div class="link-title">
              收藏夹广场
            </div>
            <div class="link-desc">
              发现其他用户的精彩收藏
            </div>
          </div>
        </div>

        <div class="glass-card quick-link-card" @click="goTo('/dashboard/docs')">
          <div class="link-icon" style="background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%); color: #0284c7;">
            <NIcon size="24">
              <DocumentTextOutline />
            </NIcon>
          </div>
          <div class="link-content">
            <div class="link-title">
              API 文档
            </div>
            <div class="link-desc">
              查看完整的使用指南
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card intro-card">
      <div class="card-header">
        <NIcon size="20" color="#f586a9">
          <HeartOutline />
        </NIcon>
        <span class="card-title">建站初衷</span>
      </div>

      <div class="card-content">
        <p class="intro-text">
          嗨，这里是负责前端和 bot 的站娘 · <strong>雪涼</strong>。欢迎来到亦可 YK（原雪涼云）！这里从 Pixiv 图片 API 起步，逐渐有了音乐、AI 绘画和 iOS 客户端，让你能轻松探索、创作、收藏和分享喜欢的内容。
        </p>

        <p class="intro-text">
          为什么要做这个站点？说实话，一开始只是因为自己写 bot、做小工具时，总觉得缺一个稳定、好用、还能自己定制的图片 API。后来想着既然都要做了，不如顺便加点收藏夹、分享广场这些功能，让它不只是个冷冰冰的接口，而是一个真正能让人用得舒服的地方。
        </p>

        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-dot" />
            <div class="feature-text">
              <strong>API Key 管理：</strong>
              注册并验证邮箱后，你可以在面板里创建和管理自己的 API Key，清楚地看到调用统计、配额使用情况和最近的请求日志。每个 Key 都有独立的积分系统，方便你精准控制每个项目的用量。
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-dot" />
            <div class="feature-text">
              <strong>个人收藏夹：</strong>
              看到喜欢的图片，一键收藏到自己的收藏夹。支持创建多个收藏夹、设置公开/私有、添加描述标签，还能通过分享链接把你精心整理的收藏夹展示给朋友。
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-dot" />
            <div class="feature-text">
              <strong>收藏夹广场：</strong>
              将你的公开收藏夹分享到广场，让其他用户发现你的审美和品味。你也可以在广场逛逛，给喜欢的收藏夹点赞、收藏，说不定能找到同好呢。
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-dot" />
            <div class="feature-text">
              <strong>稳定的 API 服务：</strong>
              如果你有自己的 bot、定时任务或小玩具，可以直接接入这里的 API。我们提供了详细的文档和使用指南，支持随机图片、标签筛选、R18 过滤等常用功能。
            </div>
          </div>
        </div>

        <p class="intro-text">
          这个站点的核心理念很简单——<strong>好用、稳定、有温度</strong>。我希望你在用它的时候，不只是在调接口、看数据，而是真的能感受到「这里有人在认真做这件事」。每一个按钮的位置、每一条提示文案、每一个小动画，都是我们希望你用得顺心的证明。
        </p>

        <p class="intro-text footer-text">
          至于更底层的数据库、限流、性能优化这些琐事，就交给 <strong>铃奈姐</strong> 去和服务器搏斗了。我会尽量把你看到的这一层做得好懂、好用、不要太吓人。如果在使用过程中觉得哪里不顺手，欢迎当成是对雪涼的温柔吐槽，我会记在小本本上，慢慢把它改得更顺眼一点。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 1100px; /* 限制最大宽度，阅读体验更好 */
  margin: 0 auto;
  width: 100%;
}

/* 顶部标题 */
.page-header { padding: 0 4px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.page-subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }

/* 通用毛玻璃卡片 -> 液态玻璃 */
.glass-card {
  border-radius: var(--ui-radius-xl) !important;
  transform: translateZ(0);
}

.about-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 28px;
  align-items: center;
  padding: 30px 34px;
  background:
    radial-gradient(circle at 12% 20%, rgba(106, 168, 255, 0.14), transparent 32%),
    radial-gradient(circle at 88% 16%, rgba(245, 134, 169, 0.18), transparent 30%),
    rgba(255, 255, 255, 0.86) !important;
  border: 1px solid rgba(255,255,255,0.86);
  overflow: hidden;
}

.about-hero-copy { min-width: 0; }

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(245, 134, 169, 0.12);
  color: var(--ui-primary-hover);
  font-size: 12px;
  font-weight: 800;
}

.about-hero h3,
.mascot-heading h3 {
  margin: 12px 0 0;
  color: var(--ui-text);
  font-size: 30px;
  line-height: 1.25;
  font-weight: 850;
}

.about-hero p,
.mascot-heading p {
  margin: 12px 0 0;
  max-width: 66ch;
  color: var(--ui-text-muted);
  font-size: 15px;
  line-height: 1.8;
}

.hero-stat-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 40px rgba(31, 41, 55, 0.08);
}

.stat-icon {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ui-primary-hover);
  background: var(--ui-primary-soft);
}

.mascot-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 6px;
}

.stats-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 2px;
  font-weight: 500;
}

.stats-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  line-height: 1.1;
  display: flex;
  align-items: baseline;
}

.stats-value .unit {
  font-size: 14px;
  font-weight: normal;
  color: #6b7280;
  margin-left: 6px;
}

/* === ✨ 快捷入口区域 === */
.quick-links-section {
  margin: 6px 0 0;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
  opacity: 0.8;
}
.section-title .line {
  width: 50px;
  height: 1px;
  background: #cbd5e1;
}
.section-title .text {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 2px;
}

.quick-links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.quick-link-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid rgba(255, 255, 255, 0.76);
  background: rgba(255, 255, 255, 0.82) !important;
}

.quick-link-card:hover {
  transform: translateY(-4px) translateZ(0);
  box-shadow:
    0 12px 30px rgba(245, 134, 169, 0.15),
    inset -1px 0 2px rgba(255, 255, 255, 0.6);
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 240, 245, 0.25) 50%,
    rgba(240, 250, 255, 0.35) 100%
  ) !important;
}

.link-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s;
}

.quick-link-card:hover .link-icon {
  transform: scale(1.1) rotate(-5deg);
}

.link-content {
  flex: 1;
}

.link-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.link-desc {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

@media (max-width: 640px) {
  .quick-links-grid {
    grid-template-columns: 1fr;
  }
}

/* === 1. 本站介绍 === */
.intro-card { padding: 24px 32px; }
.card-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 16px; font-size: 16px; font-weight: 700; color: #374151;
}
.intro-text { font-size: 14px; color: #4b5563; line-height: 1.8; margin-bottom: 16px; }
.intro-text strong { color: var(--ui-primary); font-weight: 600; }
.footer-text { margin-top: 24px; font-size: 13px; color: #6b7280; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 16px; }

/* 特性列表 */
.feature-list { display: flex; flex-direction: column; gap: 12px; margin: 20px 0; padding-left: 8px; }
.feature-item { display: flex; gap: 12px; align-items: flex-start; }
.feature-dot {
  width: 8px; height: 8px; background: linear-gradient(180deg, #f97316, #fb7185, #a855f7);
  border-radius: 50%; margin-top: 7px; flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(168, 85, 247, 0.3);
}
.feature-text { font-size: 14px; color: #4b5563; line-height: 1.7; }
.feature-text strong { color: #1f2937; margin-right: 4px; }

/* 看板娘闪卡：保留原页面简介，卡背仅显示 Q 版角色。 */
.mascot-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 56px; width: 100%; max-width: 760px; margin: 30px auto 0; align-items: start; }
.mascot-entry { min-width: 0; }
.mascot-story { margin-top: 22px; color: var(--ui-text-muted); font-size: 13px; }
.mascot-story h4 { margin: 0; padding: 8px 0; font-size: 16px; font-weight: 600; color: var(--ui-text); }
.info-content { font-size: 13px; line-height: 1.9; padding-top: 12px; }
.info-content p { margin: 0 0 12px; }
.mascot-hint { text-align: center; font-size: 12px; color: var(--ui-text-muted); margin: 20px 0 30px; }

@media (max-width: 900px) {
  .about-hero {
    grid-template-columns: 1fr;
  }

  .hero-stat-panel {
    width: fit-content;
  }

  .mascot-list {
    grid-template-columns: 1fr;
    max-width: 345px;
    gap: 30px;
  }
}

@media (max-width: 640px) {
  .about-hero {
    padding: 24px 20px;
  }

  .about-hero h3,
  .mascot-heading h3 {
    font-size: 24px;
  }

}
</style>
