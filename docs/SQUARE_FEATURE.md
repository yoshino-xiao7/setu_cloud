# 收藏夹广场功能说明

## 📁 新增文件

1. **CollectionSquare.vue** - 广场页面
   - 路径：`src/views/dashboard/CollectionSquare.vue`
   - 功能：展示所有公开分享到广场的收藏夹

2. **API 接口** - collections.ts 新增
   - `shareToSquare()` - 分享到广场
   - `unshareFromSquare()` - 取消分享
   - `getSquareCollections()` - 获取广场列表
   - `getSquareCollectionDetail()` - 获取广场详情
   - `likeSquareCollection()` - 点赞
   - `unlikeSquareCollection()` - 取消点赞
   - `favoriteSquareCollection()` - 收藏
   - `unfavoriteSquareCollection()` - 取消收藏

## 🔧 修改文件

1. **Favorites.vue** - 我的收藏夹页面
   - 添加"分享到广场"按钮
   - 添加"去广场逛逛"链接

2. **UserLayout.vue** - 用户布局导航
   - 添加"收藏夹广场"菜单项
   - 添加"我的收藏夹"菜单项

3. **router/index.ts** - 路由配置
   - 新增 `/dashboard/square` 路由

## 🎨 功能特点

### 广场页面特性
- ✅ 搜索功能（按名称/描述）
- ✅ 三种排序：热门、最新、点赞
- ✅ 分页加载
- ✅ 响应式设计（PC/移动端）
- ✅ 毛玻璃效果卡片
- ✅ 封面图展示
- ✅ 统计信息（浏览量、图片数、点赞数、收藏数）
- ✅ 点赞/收藏交互
- ✅ 点击卡片跳转详情

### 我的收藏夹新增功能
- ✅ 分享到广场（只有公开的非默认收藏夹可以分享）
- ✅ 取消分享
- ✅ 快速跳转到广场

## 🚀 使用流程

### 用户端操作流程
1. 在"我的收藏夹"页面创建公开收藏夹
2. 点击"分享到广场"按钮
3. 其他用户可以在"收藏夹广场"看到
4. 其他用户可以点赞、收藏该收藏夹
5. 点击卡片进入详情页查看完整内容

### 广场浏览流程
1. 进入"收藏夹广场"
2. 浏览推荐的收藏夹
3. 使用搜索框查找感兴趣的收藏夹
4. 切换排序方式（热门/最新/点赞）
5. 点赞喜欢的收藏夹
6. 收藏（关注）感兴趣的收藏夹
7. 点击卡片进入详情查看完整内容

## 📊 后端接口对应

| 功能 | 前端方法 | 后端接口 |
|------|---------|---------|
| 分享到广场 | `shareToSquare()` | `POST /collections/{id}/share` |
| 取消分享 | `unshareFromSquare()` | `DELETE /collections/{id}/share` |
| 广场列表 | `getSquareCollections()` | `GET /square/collections?page=1&size=20&sort=hot&keyword=xxx` |
| 广场详情 | `getSquareCollectionDetail()` | `GET /square/collections/{id}` |
| 点赞 | `likeSquareCollection()` | `POST /square/collections/{id}/like` |
| 取消点赞 | `unlikeSquareCollection()` | `DELETE /square/collections/{id}/like` |
| 收藏 | `favoriteSquareCollection()` | `POST /square/collections/{id}/favorite` |
| 取消收藏 | `unfavoriteSquareCollection()` | `DELETE /square/collections/{id}/favorite` |
| 收藏夹内容 | `getCollectionItems()` | `GET /collections/{id}/items?page=1&size=24` |

## 🎯 设计风格

- **配色**：保持 `#8b5cf6` 紫色主题
- **效果**：毛玻璃卡片（glass-card）
- **动画**：悬停上浮、图片缩放
- **布局**：响应式网格布局
- **图标**：使用 ionicons5 图标库

## 📱 响应式设计

### PC 端（>768px）
- 网格布局：自适应列数（min: 280px）
- 搜索框和排序并排显示
- 卡片悬停效果

### 移动端（≤768px）
- 单列布局
- 搜索框和排序垂直堆叠
- 优化触控交互

## 🔗 路由结构

```
/dashboard/collections  - 我的收藏夹
/dashboard/square       - 收藏夹广场（新增）
/c/:id                  - 公开收藏夹详情页
```

## ⚠️ 注意事项

1. **权限控制**
   - 只有公开的收藏夹才能分享到广场
   - 默认收藏夹不允许分享到广场

2. **状态管理**
   - `isSharedToSquare` 目前是前端管理的状态
   - 建议后端在收藏夹信息中返回 `isShared` 字段

3. **图片加载**
   - 使用 Pixiv 代理：`https://i.pixiv.re/img-master/img/...`
   - 设置 `referrerpolicy="no-referrer"` 避免防盗链

4. **浏览量统计**
   - 访问广场详情时自动 +1 浏览量（由后端实现）

## 🎉 完成状态

✅ API 接口封装
✅ 广场页面实现
✅ 收藏夹页面集成
✅ 路由配置
✅ 导航菜单更新
✅ 响应式设计
✅ 交互功能（点赞/收藏）

---

## 测试建议

1. 创建几个公开收藏夹并添加图片
2. 分享到广场
3. 切换到广场页面查看
4. 测试搜索、排序、分页
5. 测试点赞、收藏功能
6. 测试移动端响应式布局
