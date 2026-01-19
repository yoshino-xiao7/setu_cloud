<script setup lang="ts">
import { NIcon } from 'naive-ui'
import {
  ShieldCheckmarkOutline,
  LockClosedOutline,
  DocumentTextOutline,
  WarningOutline,
  InformationCircleOutline,
  KeyOutline,
  CloudOutline,
  MusicalNotesOutline,
  ImagesOutline
} from '@vicons/ionicons5'
</script>

<template>
  <div class="privacy-policy-page">
    <div class="policy-header glass-card">
      <div class="header-icon">
        <n-icon size="48" color="#f586a9"><ShieldCheckmarkOutline /></n-icon>
      </div>
      <h1>隐私政策与服务条款</h1>
      <p class="update-date">最后更新日期：2025年12月28日</p>
      <p class="subtitle">欢迎使用雪涼云服务。在使用我们的服务前，请仔细阅读以下条款。</p>
    </div>

    <div class="policy-content">
      <!-- 1. 服务说明 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><InformationCircleOutline /></n-icon>
          <h2>一、服务说明</h2>
        </div>
        <div class="section-content">
          <p>雪涼云是一个提供以下服务的平台：</p>
          <ul>
            <li><strong>图片 API 服务：</strong>提供二次元图片检索和调用服务</li>
            <li><strong>音乐播放功能：</strong>集成网易云音乐 API 的音乐搜索与播放服务</li>
            <li><strong>个人收藏管理：</strong>支持用户创建和管理图片收藏夹</li>
            <li><strong>API Key 管理：</strong>为开发者提供 API 密钥管理功能</li>
          </ul>
          <p class="notice">
            本服务仅供学习、研究和个人娱乐使用，请勿用于任何商业用途或违法违规行为。
          </p>
        </div>
      </section>

      <!-- 2. 版权声明 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><DocumentTextOutline /></n-icon>
          <h2>二、版权声明</h2>
        </div>
        <div class="section-content">
          <div class="copyright-item">
            <div class="copyright-icon">
              <n-icon size="32" color="#f586a9"><ImagesOutline /></n-icon>
            </div>
            <div>
              <h3>图片内容版权</h3>
              <p>
                本平台提供的二次元图片内容来源于 <strong>Pixiv</strong> 平台。
                所有图片的版权归原作者所有，本站仅提供 API 检索服务，不存储、不传播图片内容。
              </p>
              <p class="warning">
                ⚠️ 用户通过 API 获取的图片内容，其版权属于原创作者。请尊重创作者的知识产权，
                不得将图片用于商业用途或侵犯原作者权益的行为。
              </p>
            </div>
          </div>

          <div class="copyright-item">
            <div class="copyright-icon">
              <n-icon size="32" color="#f586a9"><MusicalNotesOutline /></n-icon>
            </div>
            <div>
              <h3>音乐内容版权</h3>
              <p>
                本平台的音乐播放功能基于 <strong>网易云音乐 API</strong> 实现。
                所有音乐内容的版权归网易云音乐及原版权方所有，本站不存储任何音乐文件。
              </p>
              <p class="warning">
                ⚠️ 音乐播放功能仅供个人学习和欣赏使用，禁止下载、录制、传播或商业化使用。
                请支持正版音乐，尊重音乐人的劳动成果。
              </p>
            </div>
          </div>

          <div class="copyright-item">
            <div class="copyright-icon">
              <n-icon size="32" color="#f586a9"><CloudOutline /></n-icon>
            </div>
            <div>
              <h3>平台代码版权</h3>
              <p>
                雪涼云平台的前端代码、UI 设计、业务逻辑等归平台所有。
                未经许可，不得复制、修改、分发或用于商业用途。
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. 个人数据处理 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><LockClosedOutline /></n-icon>
          <h2>三、个人数据处理说明</h2>
        </div>
        <div class="section-content">
          <h3>3.1 我们收集的数据</h3>
          <ul>
            <li><strong>账户信息：</strong>邮箱、昵称、头像（可选）</li>
            <li><strong>API 使用数据：</strong>API Key、调用次数、调用时间</li>
            <li><strong>积分记录：</strong>积分余额、积分获取/消费记录</li>
            <li><strong>收藏数据：</strong>收藏夹名称、收藏的图片信息</li>
            <li><strong>音乐数据：</strong>歌单信息、播放历史（最多保留50条）</li>
            <li><strong>技术数据：</strong>IP 地址、设备信息、访问日志</li>
          </ul>

          <h3>3.2 数据使用目的</h3>
          <ul>
            <li>提供和维护服务功能</li>
            <li>身份验证和账户安全</li>
            <li>API 调用统计和配额管理</li>
            <li>防止滥用和恶意行为</li>
            <li>改进服务质量和用户体验</li>
          </ul>

          <h3>3.3 数据安全措施</h3>
          <ul>
            <li>密码采用加密存储（bcrypt 哈希）</li>
            <li>API Key 采用不可逆加密</li>
            <li>HTTPS 加密传输</li>
            <li>定期安全审计和漏洞修复</li>
            <li>访问日志保留 30 天</li>
          </ul>

          <h3>3.4 数据共享与披露</h3>
          <p>我们不会向第三方出售、出租或共享您的个人数据，除非：</p>
          <ul>
            <li>获得您的明确同意</li>
            <li>法律法规要求或政府部门要求</li>
            <li>保护用户或公众的合法权益</li>
            <li>必要的技术服务提供商（如云服务商）</li>
          </ul>

          <h3>3.5 您的权利</h3>
          <p>您有权：</p>
          <ul>
            <li>查看、修改、删除您的个人信息</li>
            <li>导出您的数据</li>
            <li>注销账户（将删除所有相关数据）</li>
            <li>拒绝特定数据收集</li>
            <li>撤回同意</li>
          </ul>
        </div>
      </section>

      <!-- 4. API 使用限制 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><KeyOutline /></n-icon>
          <h2>四、API 使用限制</h2>
        </div>
        <div class="section-content">
          <h3>4.1 调用限制</h3>
          <ul>
            <li><strong>频率限制：</strong>每个 IP 每分钟最多调用 60 次</li>
            <li><strong>配额限制：</strong>每个 API Key 每日有调用次数上限</li>
            <li><strong>并发限制：</strong>单个 API Key 同时最多 5 个并发请求</li>
          </ul>

          <h3>4.2 禁止行为</h3>
          <ul>
            <li>❌ 使用自动化工具恶意刷接口</li>
            <li>❌ 批量注册账户或 API Key</li>
            <li>❌ 绕过频率限制或配额限制</li>
            <li>❌ 用于商业用途或盈利行为</li>
            <li>❌ 传播违法违规内容</li>
            <li>❌ 攻击、入侵或破坏服务</li>
            <li>❌ 分享或泄露 API Key</li>
          </ul>

          <h3>4.3 违规处理</h3>
          <p>如发现违规行为，我们将采取以下措施：</p>
          <ul>
            <li>🔒 临时或永久封禁 API Key</li>
            <li>🔒 限制或冻结账户</li>
            <li>🔒 IP 加入黑名单</li>
            <li>⚖️ 保留追究法律责任的权利</li>
          </ul>
        </div>
      </section>

      <!-- 5. 免责条款 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><WarningOutline /></n-icon>
          <h2>五、免责条款</h2>
        </div>
        <div class="section-content">
          <h3>5.1 服务可用性</h3>
          <ul>
            <li>本服务按"现状"提供，不保证 100% 可用</li>
            <li>可能因维护、升级、故障等原因临时中断</li>
            <li>第三方 API（Pixiv、网易云音乐）的可用性不由我们控制</li>
            <li>不保证 API 返回数据的准确性和完整性</li>
          </ul>

          <h3>5.2 内容免责</h3>
          <ul>
            <li>图片内容来源于第三方平台，我们不对内容负责</li>
            <li>音乐内容由网易云音乐提供，版权归原版权方所有</li>
            <li>用户生成内容（收藏夹、评论等）仅代表用户个人观点</li>
            <li>我们不对用户使用 API 获取的内容承担责任</li>
          </ul>

          <h3>5.3 法律责任限制</h3>
          <p>在法律允许的范围内，雪涼云及其运营者：</p>
          <ul>
            <li>不对因使用或无法使用本服务造成的损失承担责任</li>
            <li>不对数据丢失、泄露、错误承担责任</li>
            <li>不对第三方服务的中断或故障承担责任</li>
            <li>不对用户的违法违规行为承担连带责任</li>
          </ul>

          <h3>5.4 用户责任</h3>
          <p>用户应：</p>
          <ul>
            <li>对自己的账户和 API Key 安全负责</li>
            <li>对使用 API 获取的内容的合法性负责</li>
            <li>承担因违反服务条款造成的一切后果</li>
            <li>遵守相关法律法规和第三方平台的服务条款</li>
          </ul>
        </div>
      </section>

      <!-- 6. 服务变更与终止 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><DocumentTextOutline /></n-icon>
          <h2>六、服务变更与终止</h2>
        </div>
        <div class="section-content">
          <h3>6.1 服务变更</h3>
          <p>我们保留随时修改、暂停或终止部分或全部服务的权利，包括但不限于：</p>
          <ul>
            <li>调整 API 调用限制和配额</li>
            <li>变更功能和服务内容</li>
            <li>更新隐私政策和服务条款</li>
          </ul>
          <p class="notice">
            重大变更将提前 7 天通过站内公告或邮件通知用户。
          </p>

          <h3>6.2 服务终止</h3>
          <p>以下情况下，服务可能被终止：</p>
          <ul>
            <li>用户主动注销账户</li>
            <li>用户违反服务条款</li>
            <li>长期未登录（超过 1 年）</li>
            <li>服务整体下线</li>
          </ul>
          <p class="warning">
            ⚠️ 服务终止后，您的数据将在 30 天内被永久删除，请提前备份重要数据。
          </p>
        </div>
      </section>

      <!-- 7. Cookie 和追踪技术 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><InformationCircleOutline /></n-icon>
          <h2>七、Cookie 和追踪技术</h2>
        </div>
        <div class="section-content">
          <h3>7.1 Cookie 使用</h3>
          <p>我们使用 Cookie 和类似技术来：</p>
          <ul>
            <li>保持登录状态（Token 存储）</li>
            <li>记住用户偏好设置</li>
            <li>统计访问数据</li>
            <li>防止恶意行为</li>
          </ul>

          <h3>7.2 第三方服务</h3>
          <p>我们可能使用以下第三方服务：</p>
          <ul>
            <li>CDN 服务（加速资源加载）</li>
            <li>图片托管服务</li>
            <li>网易云音乐 API</li>
          </ul>
          <p>这些第三方服务可能会收集您的数据，请参阅其隐私政策。</p>
        </div>
      </section>

      <!-- 8. 未成年人保护 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><ShieldCheckmarkOutline /></n-icon>
          <h2>八、未成年人保护</h2>
        </div>
        <div class="section-content">
          <p>
            本服务面向成年用户（18 岁及以上）。如果您未满 18 岁，请在监护人的指导下使用本服务。
          </p>
          <p>我们不会故意收集未成年人的个人信息。如果您发现我们收集了未成年人的数据，请联系我们删除。</p>
          <p class="warning">
            ⚠️ 监护人应监督未成年人的网络行为，确保其安全使用互联网服务。
          </p>
        </div>
      </section>

      <!-- 9. 联系我们 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><InformationCircleOutline /></n-icon>
          <h2>九、联系我们</h2>
        </div>
        <div class="section-content">
          <p>如果您对本隐私政策或服务有任何疑问、意见或投诉，请通过以下方式联系我们：</p>
          <ul>
            <li><strong>邮箱：</strong> yuki@yukiryou.online</li>
            <li><strong>反馈：</strong> 请提交工单</li>
          </ul>
          <p>我们将在收到您的请求后 7 个工作日内回复。</p>
        </div>
      </section>

      <!-- 10. 其他条款 -->
      <section class="policy-section glass-card">
        <div class="section-header">
          <n-icon size="24" color="#f586a9"><DocumentTextOutline /></n-icon>
          <h2>十、其他条款</h2>
        </div>
        <div class="section-content">
          <h3>10.1 适用法律</h3>
          <p>
            本协议的签订、履行、解释及争议解决均适用中华人民共和国法律（不包括冲突法规则）。
          </p>

          <h3>10.2 争议解决</h3>
          <p>
            因本协议引起的或与本协议有关的任何争议，双方应友好协商解决。
            协商不成的，任何一方均可向本服务运营者所在地人民法院提起诉讼。
          </p>

          <h3>10.3 可分割性</h3>
          <p>
            如本协议的任何条款被认定为无效或不可执行，该条款应被视为可分割，
            不影响本协议其他条款的有效性和可执行性。
          </p>

          <h3>10.4 完整协议</h3>
          <p>
            本隐私政策与服务条款构成您与雪涼云之间的完整协议，
            取代之前的任何口头或书面协议。
          </p>
        </div>
      </section>

      <!-- 底部声明 -->
      <div class="policy-footer glass-card">
        <p class="footer-notice">
          📢 <strong>重要提示：</strong>继续使用雪涼云服务即表示您已阅读、理解并同意本隐私政策的所有条款。
        </p>
        <p class="footer-date">
          本隐私政策自 2025 年 12 月 28 日起生效。
        </p>
        <p class="footer-update">
          我们可能不时更新本政策，更新后的版本将在此页面公布。
          重大变更将通过站内公告或邮件方式通知用户。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.privacy-policy-page {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.glass-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  padding: 32px;
}

/* 页面标题 */
.policy-header {
  text-align: center;
  margin-bottom: 32px;
}

.header-icon {
  margin-bottom: 16px;
}

.policy-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #f586a9, #fca5c8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.update-date {
  font-size: 13px;
  color: #9ca3af;
  margin: 0 0 16px 0;
}

.subtitle {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

/* 内容区域 */
.policy-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 章节 */
.policy-section {
  padding: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(245, 134, 169, 0.2);
}

.section-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.section-content {
  color: #4b5563;
  line-height: 1.8;
}

.section-content p {
  margin: 0 0 16px 0;
}

.section-content h3 {
  font-size: 17px;
  font-weight: 600;
  color: #374151;
  margin: 24px 0 12px 0;
}

.section-content ul {
  margin: 12px 0;
  padding-left: 24px;
}

.section-content li {
  margin: 8px 0;
}

.section-content strong {
  color: #1f2937;
  font-weight: 600;
}

/* 提示框 */
.notice {
  background: rgba(59, 130, 246, 0.1);
  border-left: 4px solid #3b82f6;
  padding: 12px 16px;
  margin: 16px 0;
  border-radius: 8px;
  color: #1e40af;
  font-size: 14px;
}

.warning {
  background: rgba(245, 134, 169, 0.1);
  border-left: 4px solid #f586a9;
  padding: 12px 16px;
  margin: 16px 0;
  border-radius: 8px;
  color: #be185d;
  font-size: 14px;
}

/* 版权声明项 */
.copyright-item {
  display: flex;
  gap: 20px;
  margin: 24px 0;
  padding: 20px;
  background: rgba(245, 134, 169, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(245, 134, 169, 0.1);
}

.copyright-icon {
  flex-shrink: 0;
}

.copyright-item h3 {
  margin-top: 0 !important;
  color: #f586a9;
}

/* 底部声明 */
.policy-footer {
  text-align: center;
  margin-top: 32px;
  padding: 24px;
}

.footer-notice {
  font-size: 15px;
  color: #f586a9;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.footer-date {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.footer-update {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
  line-height: 1.6;
}

/* 响应式 */
@media (max-width: 768px) {
  .privacy-policy-page {
    padding: 16px;
  }

  .glass-card {
    padding: 20px;
  }

  .policy-header h1 {
    font-size: 26px;
  }

  .policy-section {
    padding: 20px;
  }

  .section-header h2 {
    font-size: 19px;
  }

  .section-content h3 {
    font-size: 16px;
  }

  .copyright-item {
    flex-direction: column;
    gap: 12px;
  }

  .section-content {
    font-size: 14px;
  }
}
</style>
