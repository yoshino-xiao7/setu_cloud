# Setu API - 收藏夹分享广场功能 API 文档

## 目录
- [一、广场收藏夹列表](#一广场收藏夹列表)
- [二、广场收藏夹详情](#二广场收藏夹详情)
- [三、分享收藏夹到广场](#三分享收藏夹到广场)
- [四、取消分享收藏夹](#四取消分享收藏夹)
- [五、点赞收藏夹](#五点赞收藏夹)
- [六、取消点赞](#六取消点赞)
- [七、收藏/关注收藏夹](#七收藏关注收藏夹)
- [八、取消收藏](#八取消收藏)
- [九、我收藏的广场收藏夹列表](#九我收藏的广场收藏夹列表)
- [十、获取收藏夹图片列表](#十获取收藏夹图片列表)
- [错误码说明](#错误码说明)
- [使用流程示例](#使用流程示例)

---

## 一、广场收藏夹列表

### 接口说明
获取分享到广场的公开收藏夹列表，支持分页、排序、关键词搜索和按作者筛选。

### 请求信息
- **URL**: `GET /square/collections`
- **登录要求**: 可选（带 token 可返回点赞/收藏状态）
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>  (可选)
  ```

### 请求参数
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | int | 否 | 1 | 页码 |
| size | int | 否 | 20 | 每页数量，最大100 |
| sort | string | 否 | new | 排序方式：`new`(最新)、`hot`(热门)、`like`(点赞数) |
| keyword | string | 否 | - | 搜索关键词，匹配收藏夹名称和描述 |
| ownerId | long | 否 | - | 按用户ID筛选，只看某人分享的收藏夹 |

### 请求示例
```bash
# 未登录查看广场列表（按最新排序）
GET /square/collections?page=1&size=20&sort=new

# 登录后查看热门收藏夹
GET /square/collections?page=1&size=20&sort=hot
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 搜索包含"动漫"的收藏夹
GET /square/collections?keyword=动漫&page=1&size=10

# 查看用户ID为123的所有分享收藏夹
GET /square/collections?ownerId=123&page=1&size=20
```

### 响应示例
```json
{
  "page": 1,
  "pageSize": 20,
  "total": 156,
  "list": [
    {
      "id": 42,
      "userId": 123,
      "name": "高质量二次元壁纸",
      "description": "精选4K动漫壁纸合集",
      "visibility": 1,
      "isDefault": false,
      "coverPid": 114514,
      "coverP": 0,
      "coverUrl": "https://i.pixiv.re/c/360x360_70/img-master/img/2024/01/15/00/00/00/114514_p0_master1200.jpg",
      "createdAt": "2025-01-15 14:30:00",
      "updatedAt": "2025-01-20 09:15:00",
      "shareViewCount": 1523,
      "shareLikeCount": 89,
      "shareFavCount": 34,
      "shareCreatedAt": "2025-01-16 10:00:00",
      "ownerNickname": "二次元爱好者",
      "ownerAvatarUrl": "https://example.com/avatars/user123.jpg",
      "itemCount": 245,
      "likedByMe": true,
      "favoritedByMe": false
    },
    {
      "id": 58,
      "userId": 456,
      "name": "风景摄影精选",
      "description": "世界各地美景",
      "visibility": 1,
      "isDefault": false,
      "coverPid": 998877,
      "coverP": 0,
      "coverUrl": "https://i.pixiv.re/c/360x360_70/img-master/img/2024/02/10/12/30/00/998877_p0_master1200.jpg",
      "createdAt": "2025-02-01 08:20:00",
      "updatedAt": "2025-02-10 16:45:00",
      "shareViewCount": 856,
      "shareLikeCount": 45,
      "shareFavCount": 12,
      "shareCreatedAt": "2025-02-02 11:30:00",
      "ownerNickname": "风景大师",
      "ownerAvatarUrl": null,
      "itemCount": 89,
      "likedByMe": false,
      "favoritedByMe": false
    }
  ]
}
```

### 字段说明
| 字段 | 类型 | 说明 |
|------|------|------|
| coverUrl | string | 封面预览图URL，为small尺寸（360x360），若无封面则为null |
| ownerNickname | string | 收藏夹作者昵称 |
| ownerAvatarUrl | string | 作者头像URL |
| itemCount | long | 收藏夹内图片数量 |
| shareViewCount | long | 浏览次数 |
| shareLikeCount | long | 点赞数 |
| shareFavCount | long | 被收藏次数 |
| likedByMe | boolean | 当前登录用户是否已点赞（未登录时为false） |
| favoritedByMe | boolean | 当前登录用户是否已收藏（未登录时为false） |

---

## 二、广场收藏夹详情

### 接口说明
查看广场上某个收藏夹的详细信息（不含图片列表，图片列表通过 `/collections/{id}/items` 获取）。

### 请求信息
- **URL**: `GET /square/collections/{id}`
- **登录要求**: 可选
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>  (可选)
  ```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | long | 收藏夹ID |

### 请求示例
```bash
GET /square/collections/42
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应示例
```json
{
  "id": 42,
  "userId": 123,
  "name": "高质量二次元壁纸",
  "description": "精选4K动漫壁纸合集",
  "visibility": 1,
  "isDefault": false,
  "coverPid": 114514,
  "coverP": 0,
  "createdAt": "2025-01-15 14:30:00",
  "updatedAt": "2025-01-20 09:15:00",
  "shareViewCount": 1524,
  "shareLikeCount": 89,
  "shareFavCount": 34,
  "shareCreatedAt": "2025-01-16 10:00:00"
}
```

### 副作用
- 每次调用此接口，`shareViewCount` 会自动 +1

---

## 三、分享收藏夹到广场

### 接口说明
将自己的公开收藏夹分享到广场。

### 请求信息
- **URL**: `POST /collections/{id}/share`
- **登录要求**: 必须
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | long | 收藏夹ID |

### 请求示例
```bash
POST /collections/42/share
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应示例
```json
"ok"
```

### 业务规则
- 必须是收藏夹所有者
- 收藏夹必须是公开的（`visibility = 1`）
- 重复分享不会报错（幂等）

### 错误响应
```json
{
  "timestamp": "2025-12-27T00:10:30.123Z",
  "status": 500,
  "error": "Internal Server Error",
  "message": "仅公开收藏夹可以分享",
  "path": "/collections/42/share"
}
```

---

## 四、取消分享收藏夹

### 接口说明
将自己的收藏夹从广场撤下。

### 请求信息
- **URL**: `DELETE /collections/{id}/share`
- **登录要求**: 必须
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | long | 收藏夹ID |

### 请求示例
```bash
DELETE /collections/42/share
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应示例
```json
"ok"
```

### 业务规则
- 必须是收藏夹所有者
- 取消后，该收藏夹不再出现在广场列表中
- 历史的点赞/收藏数据不会删除

---

## 五、点赞收藏夹

### 接口说明
给广场上的收藏夹点赞。

### 请求信息
- **URL**: `POST /square/collections/{id}/like`
- **登录要求**: 必须
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | long | 收藏夹ID |

### 请求示例
```bash
POST /square/collections/42/like
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应示例
```json
"ok"
```

### 业务规则
- 必须登录
- 不能给自己的收藏夹点赞
- 重复点赞幂等（不会重复增加计数）
- 点赞成功后 `shareLikeCount` 会 +1

### 错误响应
```json
{
  "timestamp": "2025-12-27T00:12:00.456Z",
  "status": 500,
  "error": "Internal Server Error",
  "message": "不能给自己的收藏夹点赞",
  "path": "/square/collections/42/like"
}
```

---

## 六、取消点赞

### 接口说明
取消对收藏夹的点赞。

### 请求信息
- **URL**: `DELETE /square/collections/{id}/like`
- **登录要求**: 必须
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | long | 收藏夹ID |

### 请求示例
```bash
DELETE /square/collections/42/like
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应示例
```json
"ok"
```

### 业务规则
- 取消成功后 `shareLikeCount` 会 -1（不会小于0）

---

## 七、收藏/关注收藏夹

### 接口说明
收藏广场上的收藏夹，收藏后可在"我的收藏"中查看。

### 请求信息
- **URL**: `POST /square/collections/{id}/favorite`
- **登录要求**: 必须
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | long | 收藏夹ID |

### 请求示例
```bash
POST /square/collections/42/favorite
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应示例
```json
"ok"
```

### 业务规则
- 必须登录
- 不能收藏自己的收藏夹
- 重复收藏幂等
- 收藏成功后 `shareFavCount` 会 +1

### 错误响应
```json
{
  "timestamp": "2025-12-27T00:13:00.789Z",
  "status": 500,
  "error": "Internal Server Error",
  "message": "不能收藏自己的收藏夹",
  "path": "/square/collections/42/favorite"
}
```

---

## 八、取消收藏

### 接口说明
取消对收藏夹的收藏。

### 请求信息
- **URL**: `DELETE /square/collections/{id}/favorite`
- **登录要求**: 必须
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | long | 收藏夹ID |

### 请求示例
```bash
DELETE /square/collections/42/favorite
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应示例
```json
"ok"
```

### 业务规则
- 取消成功后 `shareFavCount` 会 -1（不会小于0）

---

## 九、我收藏的广场收藏夹列表

### 接口说明
查看当前用户收藏的所有广场收藏夹。

### 请求信息
- **URL**: `GET /square/collections/favorites`
- **登录要求**: 必须
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```

### 请求参数
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | int | 否 | 1 | 页码 |
| size | int | 否 | 20 | 每页数量，最大100 |

### 请求示例
```bash
GET /square/collections/favorites?page=1&size=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应示例
```json
{
  "page": 1,
  "pageSize": 20,
  "total": 15,
  "list": [
    {
      "id": 58,
      "userId": 456,
      "name": "风景摄影精选",
      "description": "世界各地美景",
      "visibility": 1,
      "isDefault": false,
      "coverPid": 998877,
      "coverP": 0,
      "coverUrl": "https://i.pixiv.re/c/360x360_70/img-master/img/2024/02/10/12/30/00/998877_p0_master1200.jpg",
      "createdAt": "2025-02-01 08:20:00",
      "updatedAt": "2025-02-10 16:45:00",
      "shareViewCount": 856,
      "shareLikeCount": 45,
      "shareFavCount": 12,
      "shareCreatedAt": "2025-02-02 11:30:00",
      "ownerNickname": "风景大师",
      "ownerAvatarUrl": null,
      "itemCount": 89,
      "likedByMe": false,
      "favoritedByMe": true
    },
    {
      "id": 42,
      "userId": 123,
      "name": "高质量二次元壁纸",
      "description": "精选4K动漫壁纸合集",
      "visibility": 1,
      "isDefault": false,
      "coverPid": 114514,
      "coverP": 0,
      "coverUrl": "https://i.pixiv.re/c/360x360_70/img-master/img/2024/01/15/00/00/00/114514_p0_master1200.jpg",
      "createdAt": "2025-01-15 14:30:00",
      "updatedAt": "2025-01-20 09:15:00",
      "shareViewCount": 1523,
      "shareLikeCount": 89,
      "shareFavCount": 34,
      "shareCreatedAt": "2025-01-16 10:00:00",
      "ownerNickname": "二次元爱好者",
      "ownerAvatarUrl": "https://example.com/avatars/user123.jpg",
      "itemCount": 245,
      "likedByMe": true,
      "favoritedByMe": true
    }
  ]
}
```

### 字段说明
- `favoritedByMe` 在此接口中始终为 `true`（因为是"我收藏的"列表）
- 按收藏时间倒序排列（最近收藏的在前）
- 仅返回仍然公开且分享到广场的收藏夹

---

## 十、获取收藏夹图片列表

### 接口说明
获取某个收藏夹内的图片列表（无论是自己的还是广场上的）。

### 请求信息
- **URL**: `GET /collections/{id}/items`
- **登录要求**: 可选（私有收藏夹必须是所有者才能访问）
- **Headers**:
  ```
  Authorization: Bearer <JWT_TOKEN>  (可选)
  ```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | long | 收藏夹ID |

### 请求参数
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | int | 否 | 1 | 页码 |
| size | int | 否 | 24 | 每页数量 |

### 请求示例
```bash
GET /collections/42/items?page=1&size=24
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 响应示例
```json
{
  "page": 1,
  "size": 24,
  "total": 245,
  "items": [
    {
      "itemId": 1523,
      "pid": 114514,
      "p": 0,
      "addedAt": "2025-01-16 10:30:00",
      "image": {
        "id": 16850,
        "pid": 114514,
        "p": 0,
        "uid": 123456,
        "title": "美丽的风景",
        "author": "画师名",
        "r18": 0,
        "width": 1920,
        "height": 1080,
        "ext": "jpg",
        "aiType": 0,
        "uploadDate": 1705392000000,
        "urlOriginal": "https://i.pixiv.re/img-original/img/2024/01/16/00/00/00/114514_p0.jpg",
        "urlRegular": "https://i.pixiv.re/img-master/img/2024/01/16/00/00/00/114514_p0_master1200.jpg",
        "urlSmall": "https://i.pixiv.re/c/360x360_70/img-master/img/2024/01/16/00/00/00/114514_p0_master1200.jpg",
        "tags": ["风景", "自然", "4K"]
      }
    }
  ]
}
```

---

## 错误码说明

| HTTP 状态码 | 场景 | 示例 message |
|------------|------|--------------|
| 401 | 未登录或 token 无效 | "未登录或 Token 无效" |
| 403 | 无权限访问（如访问私有收藏夹） | "无权限访问该收藏夹（私有）" |
| 500 | 业务逻辑错误 | "不能给自己的收藏夹点赞" |
| 500 | 业务逻辑错误 | "不能收藏自己的收藏夹" |
| 500 | 业务逻辑错误 | "仅公开收藏夹可以分享" |

---

## 使用流程示例

### 1. 用户浏览广场
```bash
# 1. 未登录查看热门收藏夹
GET /square/collections?sort=hot&page=1&size=20

# 2. 用户登录后再次查看（可看到自己的点赞/收藏状态）
GET /square/collections?sort=hot&page=1&size=20
Authorization: Bearer <token>
```

### 2. 用户点赞和收藏
```bash
# 点赞收藏夹ID为42
POST /square/collections/42/like
Authorization: Bearer <token>

# 收藏收藏夹ID为42
POST /square/collections/42/favorite
Authorization: Bearer <token>
```

### 3. 查看收藏夹详情和图片
```bash
# 查看收藏夹详情
GET /square/collections/42

# 查看收藏夹图片列表
GET /collections/42/items?page=1&size=24
```

### 4. 查看自己收藏的收藏夹
```bash
GET /square/collections/favorites?page=1&size=20
Authorization: Bearer <token>
```

### 5. 用户分享自己的收藏夹
```bash
# 分享自己的收藏夹ID为100到广场
POST /collections/100/share
Authorization: Bearer <token>
```

---

## 数据库表设计说明

### 相关表结构

#### 1. user_collection (收藏夹主表)
```sql
ALTER TABLE `user_collection`
  ADD COLUMN `is_shared` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否分享到广场 0=否 1=是',
  ADD COLUMN `share_view_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '广场浏览次数',
  ADD COLUMN `share_like_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '广场点赞次数',
  ADD COLUMN `share_fav_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '被其他用户收藏次数',
  ADD COLUMN `share_created_at` timestamp NULL DEFAULT NULL COMMENT '第一次分享到广场的时间';
```

#### 2. user_collection_like (收藏夹点赞表)
```sql
CREATE TABLE `user_collection_like` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT '点赞用户ID',
  `collection_id` bigint(20) UNSIGNED NOT NULL COMMENT '被点赞的收藏夹ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_collection`(`user_id`, `collection_id`) USING BTREE
);
```

#### 3. user_collection_favorite (收藏夹收藏/关注表)
```sql
CREATE TABLE `user_collection_favorite` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT '收藏该收藏夹的用户ID',
  `collection_id` bigint(20) UNSIGNED NOT NULL COMMENT '被收藏的收藏夹ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_collection`(`user_id`, `collection_id`) USING BTREE
);
```

---

## 技术栈
- Java 17
- Spring Boot 3.3.0
- MyBatis
- MySQL 5.7+
- Redis
- JWT 身份认证

---

## 联系方式
如有问题或建议，欢迎提 Issue。
