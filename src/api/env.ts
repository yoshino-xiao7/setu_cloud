export const API_BASE_URL
  = import.meta.env.VITE_API_BASE_URL
    || (import.meta.env.DEV ? 'http://localhost:9898' : 'https://api.yukiryou.icu')

export const SITE_URL
  = import.meta.env.VITE_SITE_URL
    || (import.meta.env.DEV && typeof window !== 'undefined' ? window.location.origin : 'https://cloud.yukiryou.icu')

export const USE_API_MOCKS = import.meta.env.VITE_USE_API_MOCKS === 'true'

/** 图片 CDN 域名（Pixiv 代理） */
export const IMAGE_CDN_URL
  = import.meta.env.VITE_IMAGE_CDN_URL || 'https://i.yukiryou.icu'

/** 随机背景图服务 */
export const BG_IMAGE_URL
  = import.meta.env.VITE_BG_IMAGE_URL || 'https://img.yukiryou.icu/pic?img=ua'

/** 默认头像 */
export const DEFAULT_AVATAR_URL
  = import.meta.env.VITE_DEFAULT_AVATAR_URL || 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'

/** 阿里云验证码 SDK 地址 */
export const CAPTCHA_SDK_SRC
  = import.meta.env.VITE_CAPTCHA_SDK_SRC || 'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js'

/** 阿里云验证码 ESA 前缀 */
export const CAPTCHA_PREFIX
  = import.meta.env.VITE_CAPTCHA_PREFIX || 'esa-n7fxgvw9yk'

/** 阿里云验证码场景 ID */
export const CAPTCHA_SCENE_ID
  = import.meta.env.VITE_CAPTCHA_SCENE_ID || '1pnuejcr'
