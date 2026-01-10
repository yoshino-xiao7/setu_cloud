# 前端请求签名指南

## 概述

登录后，后端会返回 `signSecret` 字段，前端需要保存此密钥，并在每个需要认证的请求中计算签名。

## 签名算法

```
message = timestamp + ":" + method + ":" + uri + ":"
signature = HMAC-SHA256(message, signSecret)
```

- **timestamp**: 当前时间戳（毫秒）
- **method**: HTTP 方法（GET/POST/PUT/DELETE）
- **uri**: 请求路径（如 `/user/profile`）

> **注意**: 签名不包含请求体(body)，结尾固定为冒号 `:`

## 请求头

```
X-Timestamp: 1704844800000
X-Signature: a1b2c3d4e5f6...（64位十六进制字符串）
```

## JavaScript/TypeScript 实现

### 1. 保存登录返回的 signSecret

```typescript
// 登录响应
interface LoginResponse {
  userId: number;
  signSecret: string;  // ✅ 保存到 localStorage 或内存
}

// 登录后保存
localStorage.setItem('signSecret', response.signSecret);
```

### 2. Axios 请求拦截器

```typescript
import CryptoJS from 'crypto-js';
import axios from 'axios';

axios.interceptors.request.use(async (config) => {
  const signSecret = localStorage.getItem('signSecret');
  
  // 没有密钥（未登录）跳过签名
  if (!signSecret) return config;
  
  // 生成时间戳
  const timestamp = Date.now().toString();
  
  // 获取请求方法和路径
  const method = (config.method || 'GET').toUpperCase();
  const uri = new URL(config.url || '', config.baseURL).pathname;
  
  // 计算签名（注意结尾有冒号）
  const message = `${timestamp}:${method}:${uri}:`;
  const signature = CryptoJS.HmacSHA256(message, signSecret).toString();
  
  // 添加请求头
  config.headers['X-Timestamp'] = timestamp;
  config.headers['X-Signature'] = signature;
  
  return config;
});
```

### 3. 安装依赖

```bash
npm install crypto-js
npm install -D @types/crypto-js
```

## Vue 3 完整示例

```typescript
// src/utils/request.ts
import axios from 'axios';
import CryptoJS from 'crypto-js';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,  // ✅ 携带 Cookie (SID)
});

// 请求拦截器 - 添加签名
request.interceptors.request.use((config) => {
  const signSecret = localStorage.getItem('signSecret');
  if (!signSecret) return config;
  
  const timestamp = Date.now().toString();
  const method = (config.method || 'GET').toUpperCase();
  const uri = new URL(config.url || '', config.baseURL).pathname;
  
  // 签名格式：timestamp:method:uri:（结尾固定冒号）
  const message = `${timestamp}:${method}:${uri}:`;
  const signature = CryptoJS.HmacSHA256(message, signSecret).toString();
  
  config.headers['X-Timestamp'] = timestamp;
  config.headers['X-Signature'] = signature;
  
  return config;
});

export default request;
```

## 注意事项

1. **signSecret 安全存储**：建议存在内存而非 localStorage（更安全但刷新丢失）
2. **时间同步**：客户端时间与服务器误差不能超过 5 分钟
3. **退出登录**：清除 signSecret
4. **URI格式**：只使用路径部分，不包含域名和查询参数
