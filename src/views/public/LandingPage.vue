<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useSeo } from '@/composables/useSeo'

const router = useRouter()
const auth = useAuthStore()
const isLoaded = ref(false)
const bgLoaded = ref(false)
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
const { isCompact } = useBreakpoint()

useSeo({
  title: '雪涼云 API',
  description: '简洁、稳定、免费、高速的图片与音乐 API 服务，为 bot、站点和开发者小工具准备。'
})

// 控制各元素的入场动画
const showNav = ref(false)
const showTitle = ref(false)
const showSubtitle = ref(false)
const showButton = ref(false)

// 项目卡片数据 - 每个模块调用一次获取不同图片
const projects = [
  {
    title: '图片 API',
    desc: '随机图、标签筛选、R18 过滤与多种返回格式，适合 bot、站点与小工具。',
    link: '/dashboard/docs',
    tone: 'blue',
    mark: 'IMG'
  },
  {
    title: '网易云音乐 API',
    desc: '歌曲搜索、详情、歌词、音乐 URL 与推荐能力，快速接入音乐玩法。',
    link: '/dashboard/music',
    tone: 'pink',
    mark: 'MUS'
  },
  {
    title: '开发文档',
    desc: '接口说明、请求示例、参数解释和实践指南，减少接入时的猜测。',
    link: '/dashboard/docs',
    tone: 'violet',
    mark: 'DOC'
  },
  {
    title: '收藏夹广场',
    desc: '沉淀喜欢的作品，浏览公开收藏，给灵感和数据都留一个入口。',
    link: '/dashboard/square',
    tone: 'mint',
    mark: 'COL'
  }
]

onMounted(() => {
  if (prefersReducedMotion || isCompact.value) {
    isLoaded.value = true
    showNav.value = true
    showTitle.value = true
    showSubtitle.value = true
    showButton.value = true
    return
  }

  // 模拟 lolicon.app 的入场动画序列
  setTimeout(() => isLoaded.value = true, 100)
  setTimeout(() => showNav.value = true, 300)
  setTimeout(() => showTitle.value = true, 600)
  setTimeout(() => showSubtitle.value = true, 900)
  setTimeout(() => showButton.value = true, 1200)
})

const scrollToProjects = () => {
  document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
}

const goStart = () => {
  router.push(auth.user ? '/dashboard' : '/register')
}

const goDocs = () => {
  router.push(auth.user ? '/dashboard/docs' : { path: '/login', query: { redirect: '/dashboard/docs' } })
}
</script>

<template>
  <div class="landing-page" :class="{ loaded: isLoaded }">
    <!-- Hero -->
    <section class="hero">
      <!-- 顶部导航 -->
      <nav class="top-nav" :class="{ show: showNav }">
        <div class="nav-brand">雪涼云</div>
        <div class="nav-buttons">
          <button class="btn-nav-login" @click="router.push('/login')">登录</button>
          <button class="btn-nav-register" @click="router.push('/register')">注册</button>
        </div>
      </nav>

      <!-- Hero 内容 -->
      <div class="hero-shell">
        <div class="hero-content">
          <div class="hero-kicker" :class="{ show: showTitle }">SETU CLOUD API</div>
          <h1 class="hero-title" :class="{ show: showTitle }">雪涼云 API</h1>
          <p class="hero-subtitle" :class="{ show: showSubtitle }">
            简洁、稳定、免费、高速的图片与音乐 API 服务，为 bot、站点和开发者小工具准备。
          </p>
          <div class="hero-actions" :class="{ show: showButton }">
            <button class="btn-primary" @click="goStart">开始使用</button>
            <button class="btn-ghost" @click="goDocs">查看文档</button>
            <a class="btn-arrow" @click="scrollToProjects" aria-label="浏览功能">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
              </svg>
            </a>
          </div>
        </div>

        <figure class="hero-visual" :class="{ 'is-loaded': bgLoaded }">
          <picture>
            <source srcset="/og-image.png" type="image/png" media="(min-width: 0px)" />
            <img
              src="/og-image.png"
              width="720"
              height="378"
              alt="雪涼云 API 视觉图"
              decoding="async"
              fetchpriority="high"
              @load="bgLoaded = true"
            />
          </picture>
        </figure>
      </div>
    </section>

    <!-- 项目卡片区域 -->
    <section id="projects" class="projects-section">
      <div class="section-copy">
        <span class="section-eyebrow">API MODULES</span>
        <h2>常用能力集中在一个轻量入口</h2>
      </div>
      <div class="projects-grid">
        <div 
          v-for="(project, index) in projects" 
          :key="index" 
          class="project-tile"
          :class="`tone-${project.tone}`"
          :style="{ animationDelay: `${index * 0.15}s` }"
          @click="router.push(project.link)"
        >
          <div class="tile-mark">{{ project.mark }}</div>
          <div class="tile-content">
            <h3 class="tile-title">{{ project.title }}</h3>
            <p class="tile-desc">{{ project.desc }}</p>
          </div>
          <span class="tile-link">进入</span>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p class="footer-copyright">© 2024 - 2026 <a href="https://space.bilibili.com/1042630900" target="_blank" rel="noopener">雪涼</a></p>
      <div class="footer-links">
        <a href="/sitemap.xml" target="_blank">网站地图</a>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">湘ICP备2025149178号-1</a>
        <a href="https://beian.mps.gov.cn/#/query/webSearch?code=43102302000181" target="_blank" rel="noopener">湘公网安备43102302000181号</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ========== Base ========== */
.landing-page {
  min-height: 100vh;
  background: #fff8fb;
  color: #202635;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* ========== Hero Section ========== */
.hero {
  position: relative;
  min-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 20%, rgba(106, 168, 255, 0.24), transparent 30%),
    radial-gradient(circle at 84% 16%, rgba(245, 134, 169, 0.26), transparent 34%),
    linear-gradient(135deg, #f5fbff 0%, #fff4fa 58%, #ffffff 100%);
}

/* ========== Navigation ========== */
.top-nav {
  position: relative;
  z-index: 10;
  padding: 24px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0;
  transform: translateY(-20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.top-nav.show {
  opacity: 1;
  transform: translateY(0);
}

.nav-brand {
  font-size: 20px;
  font-weight: 700;
  color: #f26d99;
}

.nav-buttons {
  display: flex;
  gap: 12px;
}

.btn-nav-login {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(245, 134, 169, 0.18);
  border-radius: 8px;
  color: #4b5563;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-nav-login:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(245, 134, 169, 0.32);
  color: #f26d99;
}

.btn-nav-register {
  padding: 10px 20px;
  background: linear-gradient(135deg, #f586a9, #ff9cc0);
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 
    0 4px 15px rgba(245, 134, 169, 0.2),
    inset 0 1px 1px rgba(255, 255, 255, 0.5);
  transform: translateZ(0); /* 开启硬件加速 */
}

.btn-nav-register:hover {
  transform: translateY(-2px) translateZ(0);
  box-shadow: 
    0 8px 25px rgba(245, 134, 169, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  background: linear-gradient(135deg, rgba(245, 134, 169, 0.9), rgba(236, 72, 153, 0.7));
}

/* ========== Hero Content 入场动画 ========== */
.hero-shell {
  flex: 1;
  position: relative;
  z-index: 5;
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  padding: 42px 0 86px;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(460px, 1.08fr);
  align-items: center;
  gap: 56px;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
  min-width: 0;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(245, 134, 169, 0.12);
  border: 1px solid rgba(245, 134, 169, 0.22);
  color: #f26d99;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: 18px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-kicker.show {
  opacity: 1;
  transform: translateY(0);
}

.hero-title {
  font-size: clamp(52px, 8vw, 104px);
  font-weight: 900;
  letter-spacing: 0;
  margin: 0;
  color: #182033;
  text-shadow: 0 12px 42px rgba(255, 255, 255, 0.72);
  opacity: 0;
  transform: translateY(60px) scale(0.9);
  transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-title.show {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.hero-subtitle {
  font-size: 19px;
  color: #5d6678;
  margin: 22px 0 0;
  font-weight: 500;
  max-width: 620px;
  line-height: 1.8;
  text-shadow: none;
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-subtitle.show {
  opacity: 1;
  transform: translateY(0);
}

.hero-visual {
  position: relative;
  margin: 0;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.72);
  box-shadow:
    0 28px 70px rgba(31, 41, 55, 0.16),
    0 12px 34px rgba(245, 134, 169, 0.16);
  opacity: 0;
  transform: translateY(28px) scale(0.98);
  transition: opacity 0.9s ease, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-visual.is-loaded {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.hero-visual picture,
.hero-visual img {
  display: block;
  width: 100%;
}

.hero-visual img {
  height: auto;
  aspect-ratio: 720 / 378;
  object-fit: cover;
  object-position: center;
}

.hero-visual::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 38px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-actions.show {
  opacity: 1;
  transform: translateY(0);
}

.btn-primary,
.btn-ghost,
.btn-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.22s ease;
  border: 1px solid transparent;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #f586a9, #ff9cc0);
  color: #fff;
  box-shadow: 0 16px 36px rgba(245, 134, 169, 0.28);
}

.btn-ghost,
.btn-arrow {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(245, 134, 169, 0.18);
  color: #4b5563;
  box-shadow: 0 10px 26px rgba(31, 41, 55, 0.06);
}

.btn-arrow {
  width: 46px;
  padding: 0;
  border-radius: 999px;
}

.btn-primary:hover,
.btn-ghost:hover,
.btn-arrow:hover {
  transform: translateY(-2px);
}

.btn-ghost:hover,
.btn-arrow:hover {
  color: #f26d99;
  border-color: rgba(245, 134, 169, 0.32);
  background: rgba(255, 255, 255, 0.94);
}

.btn-arrow svg {
  width: 20px;
  height: 20px;
  animation: arrowBounce 2s ease-in-out infinite;
}

@keyframes arrowBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}

/* ========== Projects Section ========== */
.projects-section {
  padding: 70px 24px 84px;
  background: linear-gradient(180deg, #fff 0%, #fff7fb 100%);
}

.section-copy {
  width: min(1120px, 100%);
  margin: 0 auto 28px;
}

.section-eyebrow {
  color: #f26d99;
  font-size: 12px;
  font-weight: 800;
}

.section-copy h2 {
  margin: 8px 0 0;
  color: #202635;
  font-size: 30px;
  line-height: 1.25;
}

.projects-grid {
  width: min(1120px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}

/* 大型彩色瓷砖卡片 */
.project-tile {
  position: relative;
  min-height: 220px;
  cursor: pointer;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 44px rgba(31, 41, 55, 0.08);
  animation: tileFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.project-tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 54px rgba(31, 41, 55, 0.12);
}

@keyframes tileFadeIn {
  from { 
    opacity: 0;
  }
  to { 
    opacity: 1;
  }
}

.project-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.8;
}

.project-tile.tone-blue::before { background: radial-gradient(circle at 88% 12%, rgba(106, 168, 255, 0.28), transparent 38%); }
.project-tile.tone-pink::before { background: radial-gradient(circle at 88% 12%, rgba(245, 134, 169, 0.3), transparent 38%); }
.project-tile.tone-violet::before { background: radial-gradient(circle at 88% 12%, rgba(139, 92, 246, 0.22), transparent 38%); }
.project-tile.tone-mint::before { background: radial-gradient(circle at 88% 12%, rgba(32, 191, 169, 0.24), transparent 38%); }

.tile-mark {
  position: absolute;
  top: 22px;
  right: 22px;
  z-index: 2;
  color: rgba(32, 38, 53, 0.08);
  font-size: 54px;
  line-height: 1;
  font-weight: 900;
}

.tile-content {
  position: relative;
  z-index: 5;
  padding: 30px;
  box-sizing: border-box;
}

.tile-title {
  font-size: 23px;
  font-weight: 800;
  color: #202635;
  margin: 0 0 12px;
}

.tile-desc {
  font-size: 15px;
  color: #667085;
  line-height: 1.6;
  margin: 0;
  max-width: 420px;
}

.tile-link {
  position: absolute;
  left: 30px;
  bottom: 26px;
  z-index: 6;
  color: #f26d99;
  font-size: 13px;
  font-weight: 800;
}

/* ========== CTA Section ========== */
.cta-section {
  background: linear-gradient(180deg, #12121a 0%, #0a0a0f 100%);
  padding: 100px 40px;
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.cta-title {
  font-size: 42px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 16px;
  letter-spacing: -1px;
}

.cta-desc {
  font-size: 17px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 40px;
  line-height: 1.6;
}

.cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
}

.btn-register {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, rgba(245, 134, 169, 0.8), rgba(236, 72, 153, 0.6));
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 
    0 8px 30px rgba(245, 134, 169, 0.25),
    inset 0 1px 2px rgba(255, 255, 255, 0.6);
  backdrop-filter: saturate(180%) brightness(1.1);
  -webkit-backdrop-filter: saturate(180%) brightness(1.1);
  transform: translateZ(0); /* 开启硬件加速 */
}

.btn-register svg {
  width: 18px;
  height: 18px;
}

.btn-register:hover {
  transform: translateY(-3px) translateZ(0);
  box-shadow: 
    0 15px 40px rgba(245, 134, 169, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.9);
  background: linear-gradient(135deg, rgba(245, 134, 169, 0.9), rgba(236, 72, 153, 0.7));
}

.btn-login {
  padding: 16px 24px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
}

.btn-login:hover {
  color: #fff;
}

/* ========== Footer ========== */
.footer {
  background:
    linear-gradient(180deg, #fff7fb 0%, #ffffff 100%);
  padding: 30px 40px;
  text-align: center;
  border-top: 1px solid rgba(245, 134, 169, 0.12);
}

.footer-copyright {
  font-size: 13px;
  color: #8a94a6;
  margin: 0 0 12px;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.footer a {
  color: #667085;
  text-decoration: none;
  font-size: 12px;
  transition: color 0.2s ease;
}

.footer a:hover {
  color: #f26d99;
}

/* ========== Responsive ========== */
@media (max-width: 768px) {
  .hero-title {
    font-size: 48px;
  }
  
  .hero-subtitle {
    font-size: 17px;
  }
  
  .top-nav {
    padding: 20px 24px;
  }
  
  .nav-links {
    gap: 20px;
  }
  
  .nav-links a {
    font-size: 13px;
  }
  
  .projects-grid {
    grid-template-columns: 1fr;
  }
  
  .project-tile {
    min-height: 210px;
  }
  
  .tile-content {
    padding: 24px;
  }
  
  .tile-title {
    font-size: 22px;
  }
  
  .tile-desc {
    font-size: 13px;
  }
  
  .cta-section {
    padding: 60px 24px;
  }
  
  .cta-title {
    font-size: 28px;
  }
  
  .cta-desc {
    font-size: 15px;
    margin-bottom: 30px;
  }
  
  .cta-buttons {
    flex-direction: column;
    gap: 12px;
  }
  
  .footer {
    padding: 40px 24px 24px;
  }
  
  .footer-content {
    flex-direction: column;
    align-items: center;
    gap: 24px;
    text-align: center;
  }
  
  .footer-brand {
    align-items: center;
  }
  
  .footer-links {
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
  }

  .hero-content {
    align-items: flex-start;
  }

  .hero-shell {
    width: min(100% - 32px, 1120px);
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 28px 0 64px;
  }

  .hero-visual {
    order: -1;
    border-radius: 18px;
  }

  .hero-actions {
    flex-wrap: wrap;
  }

  .btn-primary,
  .btn-ghost {
    flex: 1 1 150px;
  }
}

@media (max-width: 420px) {
  .hero-title {
    font-size: 42px;
  }

  .hero-actions {
    width: 100%;
  }

  .btn-primary,
  .btn-ghost {
    flex-basis: 100%;
  }
}

@media (prefers-reduced-motion: reduce), (max-width: 768px) {
  .top-nav,
  .hero-kicker,
  .hero-title,
  .hero-subtitle,
  .hero-actions,
  .hero-visual,
  .project-tile {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
