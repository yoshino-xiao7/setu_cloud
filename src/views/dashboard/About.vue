<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NIcon, NTag, NNumberAnimation, NButton } from 'naive-ui'
import {
  HeartOutline,
  ChevronDown,
  ImagesOutline,
  KeyOutline,
  DocumentTextOutline,
  RocketOutline,
  HeartCircleOutline
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'

const router = useRouter()

// 确保图片路径正确
import xueliangImg from '@/assets/mascot-xueliang.png'
import renaImg from '@/assets/mascot-rena.png'

const activeId = ref<'xueliang' | 'rena' | null>(null)
const totalImages = ref(0) // 收录总数

const toggle = (id: 'xueliang' | 'rena') => {
  activeId.value = activeId.value === id ? null : id
}

// 获取统计数据
onMounted(async () => {
  try {
    // ✅ 自动判断环境：
    // 如果是本地开发(localhost)，就用 localhost:9898
    // 如果是线上(域名访问)，就用 api.yukiryou.icu
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    // 你可以根据实际情况修改这里的线上地址
    const baseUrl = isDev
      ? 'http://localhost:9898'
      : 'https://api.yukiryou.icu'

    const response = await fetch(`${baseUrl}/status/image-count`)

    if (response.ok) {
      const data = await response.json()
      // 兼容 { count: 16905 } 和纯数字 16905
      if (typeof data === 'number') {
        totalImages.value = data
      } else if (data && typeof data.count === 'number') {
        totalImages.value = data.count
      }
    }
  } catch (e) {
    console.error('获取图库统计失败:', e)
  }
})
</script>

<template>
  <div class="about-page">

    <div class="page-header">
      <h2 class="page-title">关于本站</h2>
      <p class="page-subtitle">了解这里的初衷，以及背后的看板娘们</p>
    </div>

    <div class="glass-card stats-card">
      <div class="stats-icon-box">
        <n-icon size="32">
          <ImagesOutline />
        </n-icon>
      </div>
      <div class="stats-content">
        <div class="stats-label">当前图库已收录</div>
        <div class="stats-value">
          <n-number-animation
            ref="numberAnimationInstRef"
            :from="0"
            :to="totalImages"
            :active="true"
            :precision="0"
            show-separator
          />
          <span class="unit">张</span>
        </div>
      </div>
      <div class="stats-decoration"></div>
    </div>

    <!-- ✨ 快捷入口区域 -->
    <div class="quick-links-section">
      <div class="section-title">
        <span class="line"></span>
        <span class="text">快捷入口</span>
        <span class="line"></span>
      </div>
      
      <div class="quick-links-grid">
        <div class="glass-card quick-link-card" @click="router.push('/dashboard/api-keys')">
          <div class="link-icon" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #d97706;">
            <n-icon size="24"><KeyOutline /></n-icon>
          </div>
          <div class="link-content">
            <div class="link-title">API Key 管理</div>
            <div class="link-desc">创建和管理你的 API Key</div>
          </div>
        </div>

        <div class="glass-card quick-link-card" @click="router.push('/dashboard/collections')">
          <div class="link-icon" style="background: linear-gradient(135deg, #ddd6fe 0%, #e9d5ff 100%); color: #7c3aed;">
            <n-icon size="24"><HeartCircleOutline /></n-icon>
          </div>
          <div class="link-content">
            <div class="link-title">我的收藏</div>
            <div class="link-desc">管理你的收藏夹和图片</div>
          </div>
        </div>

        <div class="glass-card quick-link-card" @click="router.push('/dashboard/square')">
          <div class="link-icon" style="background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); color: #dc2626;">
            <n-icon size="24"><RocketOutline /></n-icon>
          </div>
          <div class="link-content">
            <div class="link-title">收藏夹广场</div>
            <div class="link-desc">发现其他用户的精彩收藏</div>
          </div>
        </div>

        <div class="glass-card quick-link-card" @click="router.push('/dashboard/docs')">
          <div class="link-icon" style="background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%); color: #0284c7;">
            <n-icon size="24"><DocumentTextOutline /></n-icon>
          </div>
          <div class="link-content">
            <div class="link-title">API 文档</div>
            <div class="link-desc">查看完整的使用指南</div>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card intro-card">
      <div class="card-header">
        <n-icon size="20" color="#8b5cf6"><HeartOutline /></n-icon>
        <span class="card-title">建站初衷</span>
      </div>

      <div class="card-content">
        <p class="intro-text">
          嗨，这里是负责前端和 bot 的站娘 · <strong>雪涼</strong>。欢迎来到这个小控制台！这里不仅是一个 Pixiv 图片 API 服务，更是一个让你能轻松管理、收藏和分享喜欢作品的地方。
        </p>

        <p class="intro-text">
          为什么要做这个站点？说实话，一开始只是因为自己写 bot、做小工具时，总觉得缺一个稳定、好用、还能自己定制的图片 API。后来想着既然都要做了，不如顺便加点收藏夹、分享广场这些功能，让它不只是个冷冰冰的接口，而是一个真正能让人用得舒服的地方。
        </p>

        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-dot"></div>
            <div class="feature-text">
              <strong>API Key 管理：</strong>
              注册并验证邮箱后，你可以在面板里创建和管理自己的 API Key，清楚地看到调用统计、配额使用情况和最近的请求日志。每个 Key 都有独立的积分系统，方便你精准控制每个项目的用量。
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-dot"></div>
            <div class="feature-text">
              <strong>个人收藏夹：</strong>
              看到喜欢的图片，一键收藏到自己的收藏夹。支持创建多个收藏夹、设置公开/私有、添加描述标签，还能通过分享链接把你精心整理的收藏夹展示给朋友。
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-dot"></div>
            <div class="feature-text">
              <strong>收藏夹广场：</strong>
              将你的公开收藏夹分享到广场，让其他用户发现你的审美和品味。你也可以在广场逛逛，给喜欢的收藏夹点赞、收藏，说不定能找到同好呢。
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-dot"></div>
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
          至于更底层的数据库、限流、性能优化这些琐事，就交给 <strong>玲奈姐</strong> 去和服务器搏斗了。我会尽量把你看到的这一层做得好懂、好用、不要太吓人。如果在使用过程中觉得哪里不顺手，欢迎当成是对雪涼的温柔吐槽，我会记在小本本上，慢慢把它改得更顺眼一点。
        </p>
      </div>
    </div>

    <div class="mascot-section-title">
      <span class="line"></span>
      <span class="text">本站看板娘</span>
      <span class="line"></span>
    </div>

    <div class="mascot-list">
      <div
        class="glass-card mascot-card theme-blue"
        :class="{ 'is-active': activeId === 'xueliang' }"
        @click="toggle('xueliang')"
      >
        <div class="mascot-visual">
          <div class="bg-gradient"></div>
          <img :src="xueliangImg" alt="雪涼" class="mascot-img" />
        </div>

        <div class="mascot-info">
          <div class="info-header">
            <div class="header-left">
              <div class="name-row">
                <span class="name">雪涼</span>
                <span class="en-name">Yuki Ryou</span>
              </div>
              <div class="tags">
                <n-tag size="small" :bordered="false" type="info" round class="custom-tag">前端娘</n-tag>
                <n-tag size="small" :bordered="false" type="primary" round class="custom-tag">Bot娘</n-tag>
              </div>
            </div>
            <n-icon class="arrow-icon" :class="{ 'rotate': activeId === 'xueliang' }">
              <ChevronDown />
            </n-icon>
          </div>

          <div class="info-summary" v-show="activeId !== 'xueliang'">
            嗨呀，这里是雪涼。虽然看起来有点软绵绵的，但负责的事情可不少哦。
          </div>

          <div class="info-content-wrapper" :style="{ maxHeight: activeId === 'xueliang' ? '800px' : '0px' }">
            <div class="info-content">
              <p>嗨呀，这里是雪涼。</p>
              <p>虽然看起来有点软绵绵的，但负责的事情可不少哦。平时你在这个面板上看到的页面、按钮、动画，还有和 bot 聊天时的那些小细节，基本都是我在一边喝着热牛奶一边一点一点搭起来的。</p>
              <p>我的工作，就是尽量让你「看得舒服、点得顺手、用得开心」，哪怕只是一个小提示、一行文案，也希望能让你感觉到：嗯，这里有人在认真对待你。</p>
              <p>如果哪天你觉得界面哪里怪怪的、bot 说话有点笨笨的……那大概就是我还没调好，请多多包涵，也欢迎悄悄告诉雪涼，我会乖乖记下来慢慢改好。</p>
              <p>至于后面那些看不见的东西嘛，就交给玲奈啦。我们两个从很早之前就一直一起折腾这些东西——我负责把画面和 bot 弄得可爱一点，她负责在后台吐槽「又加奇怪需求」，然后默默把系统撑住。</p>
              <p>虽然玲奈说话有时候有点凶凶的，其实人很可靠，也一直在背后帮我收拾烂摊子……这句话不要让她看到就好。</p>
            </div>
          </div>
        </div>
      </div>

      <div
        class="glass-card mascot-card theme-red"
        :class="{ 'is-active': activeId === 'rena' }"
        @click="toggle('rena')"
      >
        <div class="mascot-visual">
          <div class="bg-gradient"></div>
          <img :src="renaImg" alt="鈴木 玲奈" class="mascot-img" />
        </div>

        <div class="mascot-info">
          <div class="info-header">
            <div class="header-left">
              <div class="name-row">
                <span class="name">鈴木 玲奈</span>
                <span class="en-name">Suzuki Rena</span>
              </div>
              <div class="tags">
                <n-tag size="small" :bordered="false" type="error" round class="custom-tag">后端娘</n-tag>
                <n-tag
                  size="small"
                  :bordered="false"
                  :color="{ color: '#fef3c7', textColor: '#b45309', borderColor: '#fef3c7' }"
                  round
                  class="custom-tag"
                >
                  系统架构
                </n-tag>
              </div>
            </div>
            <n-icon class="arrow-icon" :class="{ 'rotate': activeId === 'rena' }">
              <ChevronDown />
            </n-icon>
          </div>

          <div class="info-summary" v-show="activeId !== 'rena'">
            我是鈴木 玲奈。简单说，我负责的是你看不到、但整个站点离不开的那一层。
          </div>

          <div class="info-content-wrapper" :style="{ maxHeight: activeId === 'rena' ? '800px' : '0px' }">
            <div class="info-content">
              <p>我是鈴木 玲奈。</p>
              <p>简单说，我负责的是你看不到、但整个站点离不开的那一层——那些请求怎么走、数据怎么存、权限怎么管，都是从我这里过一遍。你在前台点的每一个动作，最后都会敲到我这边的门。</p>
              <p>雪涼会把页面做得漂亮、bot 哄你开心，而我负责让这一切稳地运行下去：别乱掉、别崩、别丢东西。只要系统不出问题，你大概就不会想起我——这正是我最满意的状态。</p>
              <p>至于和雪涼的关系？嗯……勉强算是一起工作很久的搭档吧。她总是先把东西画得甜甜的、然后一脸无辜地说「玲奈，这里后台帮一下就好」，听起来好像很轻松，实际上每次都是一堆坑。</p>
              <p>但话说回来，有她在前面折腾界面，有我在后面盯着系统，我们两个配合起来还算不错。只要你用得顺利、数据安安全全，那就说明——前台那边她没有闹太大乱子，而后台这边我也没失误。</p>
              <p>……总之，不用太在意细节，有问题就交给我们，系统不会让你掉链子的。</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px; /* 限制最大宽度，阅读体验更好 */
  margin: 0 auto;
  width: 100%;
}

/* 顶部标题 */
.page-header { padding: 0 4px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.page-subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }

/* 通用毛玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
}

/* === ✅ 新增：统计卡片样式 === */
.stats-card {
  display: flex;
  align-items: center;
  padding: 24px 32px;
  gap: 24px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s;
}
.stats-card:hover {
  transform: translateY(-2px);
}

.stats-icon-box {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%);
  color: #7c3aed;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(124, 58, 237, 0.15);
  flex-shrink: 0;
}

.stats-content {
  display: flex;
  flex-direction: column;
  z-index: 1;
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
  color: #9ca3af;
  margin-left: 6px;
}

/* 装饰背景泡泡 */
.stats-decoration {
  position: absolute;
  top: -50%;
  right: -5%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, rgba(255, 255, 255, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

/* === ✨ 快捷入口区域 === */
.quick-links-section {
  margin: 16px 0;
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
  padding: 20px 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.quick-link-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.85);
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
.intro-text strong { color: #8b5cf6; font-weight: 600; }
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


/* === 2. 看板娘区域 (垂直列表) === */
.mascot-section-title {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  margin-top: 16px; opacity: 0.8;
}
.mascot-section-title .line { width: 50px; height: 1px; background: #cbd5e1; }
.mascot-section-title .text { font-size: 14px; font-weight: 600; color: #64748b; letter-spacing: 2px; }

/* 垂直列表容器 */
.mascot-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片容器：左图右文 */
.mascot-card {
  display: flex;
  flex-direction: row;
  overflow: hidden; cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid rgba(255, 255, 255, 0.6);
  min-height: 280px;
}
.mascot-card:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); }
.mascot-card.is-active {
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 20px 50px rgba(0,0,0,0.12);
  border-color: rgba(255, 255, 255, 0.9);
}

/* 左侧：立绘展示区 */
.mascot-visual {
  width: 240px;
  position: relative;
  overflow: hidden;
  display: flex; justify-content: center; align-items: flex-end;
  flex-shrink: 0;
}

.bg-gradient { position: absolute; inset: 0; z-index: 0; opacity: 0.8; }
.theme-blue .bg-gradient { background: linear-gradient(to top, #eef2ff 0%, #faf5ff 100%); }
.theme-red .bg-gradient { background: linear-gradient(to top, #fef2f2 0%, #fffbeb 100%); }

.mascot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  z-index: 1;
  transition: transform 0.4s ease;
  filter: drop-shadow(4px 0 10px rgba(0,0,0,0.1));
}
.mascot-card:hover .mascot-img { transform: scale(1.05) rotate(1deg); }


/* 右侧：信息区 */
.mascot-info {
  flex: 1;
  padding: 24px 32px;
  display: flex; flex-direction: column; justify-content: center;
  border-left: 1px solid rgba(255,255,255,0.5);
}

.info-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 8px;
}

.name-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.name { font-size: 22px; font-weight: 700; color: #1f2937; }
.en-name { font-size: 14px; font-weight: 400; color: #9ca3af; }

.tags { display: flex; gap: 6px; }
.custom-tag { font-weight: 600; padding: 0 10px; }

.arrow-icon { color: #9ca3af; transition: transform 0.3s; margin-top: 4px; }
.arrow-icon.rotate { transform: rotate(180deg); color: #8b5cf6; }

/* 简介摘要 */
.info-summary {
  font-size: 14px; color: #6b7280; margin-top: 10px;
  line-height: 1.6;
}

/* 详细内容展开 */
.info-content-wrapper {
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.info-content {
  padding-top: 16px;
  font-size: 14px; color: #4b5563; line-height: 1.8;
  border-top: 1px dashed rgba(0,0,0,0.1);
  margin-top: 16px;
}
.info-content p { margin-bottom: 12px; }

/* 📱 手机端适配：变为垂直卡片，上图下文 */
@media (max-width: 640px) {
  .mascot-card {
    flex-direction: column;
  }
  .mascot-visual {
    width: 100%;
    height: 300px;
  }
  .mascot-info {
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.5);
    padding: 20px;
  }
}
</style>