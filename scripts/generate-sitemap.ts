/**
 * 构建时自动生成 sitemap.xml
 * 包含所有公开页面
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

// 网站基础 URL
const SITE_URL = 'https://cloud.yukiryou.icu';

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

// 生成 sitemap XML
function generateSitemap(): string {
    const urls = publicPages.map(page => `
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

// 写入文件
const sitemap = generateSitemap();
const outputPath = resolve(process.cwd(), 'dist', 'sitemap.xml');

try {
    writeFileSync(outputPath, sitemap, 'utf-8');
    console.log(`✅ Sitemap generated: ${outputPath}`);
} catch (error) {
    // dist 目录可能还不存在，尝试写入 public 目录
    const publicPath = resolve(process.cwd(), 'public', 'sitemap.xml');
    writeFileSync(publicPath, sitemap, 'utf-8');
    console.log(`✅ Sitemap generated: ${publicPath}`);
}
