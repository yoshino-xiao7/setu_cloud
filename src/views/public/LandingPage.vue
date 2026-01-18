<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoaded = ref(false)
const bgLoaded = ref(false)

// 控制各元素的入场动画
const showNav = ref(false)
const showTitle = ref(false)
const showSubtitle = ref(false)
const showButton = ref(false)

// 项目卡片数据 - 每个模块调用一次获取不同图片
const projects = [
  {
    title: '图片 API',
    desc: '随机获取高质量图片，支持关键词搜索、标签筛选等多种调用方式',
    link: '/dashboard/docs',
    bgColor: 'linear-gradient(135deg, #89CFF0 0%, #a8d8ea 100%)',
    bgImage: `https://img.yukiryou.icu/pic?img=ua&_=${Date.now()}_1`
  },
  {
    title: '收藏夹广场',
    desc: '发现更多精彩内容，浏览其他用户公开分享的收藏夹',
    link: '/dashboard/square',
    bgColor: 'linear-gradient(135deg, #9B7EBD 0%, #b8a9c9 100%)',
    bgImage: `https://img.yukiryou.icu/pic?img=ua&_=${Date.now()}_2`
  },
  {
    title: '音乐播放器',
    desc: '内置网易云音乐无损播放，边听边看，双重享受',
    link: '/dashboard/music',
    bgColor: 'linear-gradient(135deg, #E07A5F 0%, #e9967a 100%)',
    bgImage: `https://img.yukiryou.icu/pic?img=ua&_=${Date.now()}_3`
  },
  {
    title: '开发文档',
    desc: '详细的 API 接口说明，快速上手接入指南',
    link: '/dashboard/docs',
    bgColor: 'linear-gradient(135deg, #F2CC8F 0%, #f5d89a 100%)',
    bgImage: `https://img.yukiryou.icu/pic?img=ua&_=${Date.now()}_4`
  }
]

onMounted(() => {
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
</script>

<template>
  <div class="landing-page" :class="{ loaded: isLoaded }">
    <!-- 全屏 Hero -->
    <section class="hero">
      <!-- 背景图 -->
      <div class="hero-bg" :class="{ 'bg-loaded': bgLoaded }">
        <img 
          src="https://img.yukiryou.icu/pic?img=ua" 
          alt="banner" 
          @load="bgLoaded = true"
        />
        <div class="hero-overlay"></div>
      </div>

      <!-- 顶部导航 -->
      <nav class="top-nav" :class="{ show: showNav }">
        <div class="nav-brand">雪涼云</div>
        <div class="nav-buttons">
          <button class="btn-nav-login" @click="router.push('/login')">登录</button>
          <button class="btn-nav-register" @click="router.push('/register')">注册</button>
        </div>
      </nav>

      <!-- Hero 内容 -->
      <div class="hero-content">
        <h1 class="hero-title" :class="{ show: showTitle }">雪涼云</h1>
        <p class="hero-subtitle" :class="{ show: showSubtitle }">
          高质量图片 API 服务，为开发者而生
        </p>
        <div class="hero-actions" :class="{ show: showButton }">
          <a class="btn-arrow" @click="scrollToProjects">
            <span>开始探索</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- 项目卡片区域 -->
    <section id="projects" class="projects-section">
      <div class="projects-grid">
        <div 
          v-for="(project, index) in projects" 
          :key="index" 
          class="project-tile"
          :style="{ 
            background: project.bgColor,
            animationDelay: `${index * 0.15}s` 
          }"
          @click="router.push(project.link)"
        >
          <!-- 背景图片 -->
          <div v-if="project.bgImage" class="tile-bg-image" :style="{ background: project.bgColor }">
            <img :src="project.bgImage" alt="" />
          </div>
          
          <!-- 文字内容 -->
          <div class="tile-content">
            <h3 class="tile-title">{{ project.title }}</h3>
            <p class="tile-desc">{{ project.desc }}</p>
          </div>
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
  background: #0a0a0f;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* ========== Hero Section ========== */
.hero {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 背景图入场动画 */
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  transform: scale(1.1);
  opacity: 0;
  transition: transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), 
              opacity 1s ease;
}

.hero-bg.bg-loaded {
  transform: scale(1);
  opacity: 1;
}

.hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.4) 0%,
    rgba(0, 0, 0, 0.1) 40%,
    rgba(0, 0, 0, 0.6) 100%
  );
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
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.nav-buttons {
  display: flex;
  gap: 12px;
}

.btn-nav-login {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-nav-login:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.btn-nav-register {
  padding: 10px 20px;
  background: linear-gradient(135deg, #f586a9, #ec4899);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(245, 134, 169, 0.3);
}

.btn-nav-register:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 134, 169, 0.4);
}

/* ========== Hero Content 入场动画 ========== */
.hero-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  z-index: 5;
  padding: 0 20px;
}

.hero-title {
  font-size: 100px;
  font-weight: 900;
  letter-spacing: -3px;
  margin: 0;
  text-shadow: 0 4px 40px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transform: translateY(60px) scale(0.9);
  transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-title.show {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.hero-subtitle {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.75);
  margin: 20px 0 0;
  font-weight: 400;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-subtitle.show {
  opacity: 1;
  transform: translateY(0);
}

.hero-actions {
  margin-top: 50px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-actions.show {
  opacity: 1;
  transform: translateY(0);
}

.btn-arrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 100px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.btn-arrow:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
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
  padding: 0;
  background: #fff;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
}

/* 大型彩色瓷砖卡片 */
.project-tile {
  position: relative;
  min-height: 400px;
  cursor: pointer;
  overflow: hidden;
  animation: tileFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes tileFadeIn {
  from { 
    opacity: 0;
  }
  to { 
    opacity: 1;
  }
}

/* 背景图片 - 全覆盖 */
.tile-bg-image {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.tile-bg-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  transition: transform 0.5s ease, filter 0.4s ease;
  filter: blur(3px);
}

.project-tile:hover .tile-bg-image img {
  transform: scale(1.03);
  filter: blur(0);
}

/* 文字内容 - 左下角 */
.tile-content {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 5;
  padding: 36px;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
  width: 100%;
  box-sizing: border-box;
}

.tile-title {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.tile-desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  margin: 0;
  max-width: 320px;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
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
  background: linear-gradient(135deg, #f586a9, #ec4899);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 30px rgba(245, 134, 169, 0.35);
}

.btn-register svg {
  width: 18px;
  height: 18px;
}

.btn-register:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(245, 134, 169, 0.5);
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
  background: #0a0a0f;
  padding: 30px 40px;
  text-align: center;
}

.footer-copyright {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 12px;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.footer a {
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  font-size: 12px;
  transition: color 0.2s ease;
}

.footer a:hover {
  color: #f586a9;
}

/* ========== Responsive ========== */
@media (max-width: 768px) {
  .hero-title {
    font-size: 56px;
    letter-spacing: -2px;
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
    min-height: 200px;
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
}
</style>
