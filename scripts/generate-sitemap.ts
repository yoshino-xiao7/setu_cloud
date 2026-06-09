/**
 * 构建时自动生成 sitemap.xml
 * 包含所有公开页面（静态路由 + 动态公开收藏夹/用户主页）
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

// 网站基础 URL
const SITE_URL = 'https://cloud.yukiryou.icu';
const API_BASE_URL = 'https://api.yukiryou.icu';

// 公开页面列表（静态路由）
const publicPages = [
    { path: '/', priority: 1.0, changefreq: 'daily' },
    { path: '/login', priority: 0.6, changefreq: 'monthly' },
    { path: '/register', priority: 0.6, changefreq: 'monthly' },
    { path: '/status', priority: 0.7, changefreq: 'weekly' },
    { path: '/forgot-password', priority: 0.3, changefreq: 'yearly' },
];

// 生成当前日期
const today = new Date().toISOString().split('T')[0];

interface DynamicPage {
    path: string;
    priority: number;
    changefreq: string;
}

/**
 * 从 API 获取公开收藏夹和用户主页的动态页面
 * 如果 API 不可用，优雅降级为仅静态页面
 */
async function fetchDynamicPages(): Promise<DynamicPage[]> {
    const pages: DynamicPage[] = [];

    try {
        // 获取公开收藏夹列表
        const res = await fetch(
            `${API_BASE_URL}/square/collections?page=1&size=200`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!res.ok) {
            console.warn(`⚠️  API returned ${res.status}, skipping dynamic pages`);
            return pages;
        }

        const json = await res.json() as any;
        const data = json.data || json;
        const list: any[] = data.list || data.items || data.records || [];

        const userIds = new Set<number>();

        for (const item of list) {
            // 公开收藏夹页面
            if (item.id) {
                pages.push({
                    path: `/c/${item.id}`,
                    priority: 0.8,
                    changefreq: 'weekly',
                });
            }
            // 收集唯一用户 ID
            if (item.userId) {
                userIds.add(item.userId);
            }
        }

        // 用户主页
        for (const uid of userIds) {
            pages.push({
                path: `/user/${uid}`,
                priority: 0.7,
                changefreq: 'weekly',
            });
        }

        console.log(`✅ Fetched ${pages.length} dynamic pages (${list.length} collections, ${userIds.size} users)`);
    } catch (e: any) {
        console.warn(`⚠️  Could not fetch dynamic pages: ${e.message}`);
    }

    return pages;
}

// 生成 sitemap XML
function generateSitemap(allPages: DynamicPage[]): string {
    const urls = allPages.map(page => `
  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// 主函数
async function main() {
    // 合并静态页面和动态页面
    const staticPages: DynamicPage[] = publicPages;
    const dynamicPages = await fetchDynamicPages();
    const allPages = [...staticPages, ...dynamicPages];

    // 生成 sitemap
    const sitemap = generateSitemap(allPages);

    // 写入文件
    const outputPath = resolve(process.cwd(), 'dist', 'sitemap.xml');
    const publicPath = resolve(process.cwd(), 'public', 'sitemap.xml');

    try {
        writeFileSync(outputPath, sitemap, 'utf-8');
        console.log(`✅ Sitemap generated: ${outputPath} (${allPages.length} URLs)`);
    } catch {
        // dist 目录可能还不存在
    }

    // ✅ 同步更新 public 目录的静态回退文件，避免下次构建时 Vite 复制过期版本
    try {
        writeFileSync(publicPath, sitemap, 'utf-8');
    } catch {
        // public 目录写入失败不影响构建
    }
}

main();
