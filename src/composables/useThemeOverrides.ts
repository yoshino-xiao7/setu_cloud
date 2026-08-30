import type { GlobalThemeOverrides } from 'naive-ui'

/**
 * Naive UI 主题覆盖的唯一真源。
 *
 * 品牌粉三色（#f586a9 / #f8a2be / #f26d99）与 `src/styles/liquid-glass.css`
 * 中的 `--lg-accent*` / `--ui-primary*` token 必须保持一致。
 * UserLayout 与 AdminLayout 共用本配置，勿在布局内复制。
 */
export const brandColors = {
  primary: '#f586a9',
  primaryHover: '#f8a2be',
  primaryPressed: '#f26d99',
} as const

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: brandColors.primary,
    primaryColorHover: brandColors.primaryHover,
    primaryColorPressed: brandColors.primaryPressed,
  },
  Menu: {
    itemColorActive: 'rgba(245, 134, 169, 0.15)',
    itemColorActiveHover: 'rgba(245, 134, 169, 0.25)',
    itemTextColorActive: brandColors.primaryPressed,
    itemIconColorActive: brandColors.primaryPressed,
    itemIconColorHover: brandColors.primary,
    itemTextColorHover: brandColors.primary,
    borderRadius: '12px',
  },
  Drawer: { bodyPadding: '0' },
}

/** 返回全局共享的 Naive UI themeOverrides（模块级单例，双布局零差异） */
export function useThemeOverrides(): GlobalThemeOverrides {
  return themeOverrides
}
