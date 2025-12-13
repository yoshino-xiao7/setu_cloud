// src/utils/avatar.ts
const AVATAR_KEY_PREFIX = 'setu-avatar:'

function makeKey(email?: string | null) {
  return AVATAR_KEY_PREFIX + (email || 'guest')
}

// 生成一个随机 seed
function randomSeed(email?: string | null) {
  return (email || 'user') + '-' + Math.random().toString(36).slice(2)
}

// 基于 seed 生成头像 URL（这里用 dicebear 的示例头像，你也可以换别的）
function buildAvatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`
}

/**
 * 获取本地保存的头像，没有就返回 null
 */
export function getStoredAvatar(email?: string | null): string | null {
  try {
    const raw = localStorage.getItem(makeKey(email))
    return raw || null
  } catch {
    return null
  }
}

/**
 * 生成一个新的随机头像 URL（不自动保存）
 */
export function generateRandomAvatar(email?: string | null): string {
  const seed = randomSeed(email)
  return buildAvatarUrl(seed)
}

/**
 * 获取或生成默认头像：优先用本地缓存，没有就随机一个并存起来
 */
export function getOrCreateAvatar(email?: string | null): string {
  const stored = getStoredAvatar(email)
  if (stored) return stored

  const url = generateRandomAvatar(email)
  saveAvatar(email, url)
  return url
}

/**
 * 保存头像到本地（按邮箱区分）
 */
export function saveAvatar(email: string | null | undefined, url: string) {
  try {
    localStorage.setItem(makeKey(email), url)
  } catch {
    // 忽略本地存储失败
  }
}
