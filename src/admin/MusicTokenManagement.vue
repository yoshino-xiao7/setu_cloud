<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import {
  NDataTable,
  NButton,
  NIcon,
  NTag,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSwitch,
  NSpace,
  NPopconfirm,
  useMessage,
  type DataTableColumns
} from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  TrashOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline
} from '@vicons/ionicons5'
import { adminMusicApi, type NeteaseToken } from '@/api/music'

const message = useMessage()

// =======================
// 数据和状态
// =======================
const loading = ref(false)
const tokens = ref<NeteaseToken[]>([])

// 添加/编辑弹窗
const showModal = ref(false)
const modalTitle = ref('添加 Token')
const editingId = ref<number | null>(null)
const submitting = ref(false)

// 表单数据
const formData = ref({
  cookie: '',
  nickname: '',
  status: 1 as 0 | 1
})

// =======================
// 辅助函数
// =======================
const unwrap = (res: any) => {
  if (res && res.data && res.data.data !== undefined) return res.data.data
  if (res && res.data !== undefined) return res.data
  return res
}

// 脱敏显示 Cookie
const maskCookie = (cookie: string) => {
  if (!cookie) return '-'
  if (cookie.length <= 20) return cookie
  return cookie.substring(0, 20) + '...'
}

// =======================
// 数据加载
// =======================
const fetchTokens = async () => {
  loading.value = true
  try {
    const res = await adminMusicApi.getTokens()
    const data = unwrap(res)
    tokens.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    message.error(e?.response?.data?.message || '加载失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

// =======================
// 添加 Token
// =======================
const openAddModal = () => {
  modalTitle.value = '添加网易云音乐 Token'
  editingId.value = null
  formData.value = {
    cookie: '',
    nickname: '',
    status: 1
  }
  showModal.value = true
}

// =======================
// 编辑 Token
// =======================
const openEditModal = (token: NeteaseToken) => {
  modalTitle.value = '编辑 Token'
  editingId.value = token.id
  formData.value = {
    cookie: token.cookie,
    nickname: token.nickname,
    status: token.status
  }
  showModal.value = true
}

// =======================
// 提交表单
// =======================
const handleSubmit = async () => {
  if (!formData.value.cookie.trim()) {
    message.warning('请填写 Cookie')
    return
  }

  submitting.value = true
  try {
    if (editingId.value) {
      // 编辑
      await adminMusicApi.updateToken(editingId.value, formData.value)
      message.success('Token 更新成功')
    } else {
      // 添加
      await adminMusicApi.addToken({
        cookie: formData.value.cookie,
        nickname: formData.value.nickname || '未命名账号'
      })
      message.success('Token 添加成功')
    }
    
    showModal.value = false
    await fetchTokens()
  } catch (e: any) {
    message.error(e?.response?.data?.message || '操作失败')
    console.error(e)
  } finally {
    submitting.value = false
  }
}

// =======================
// 删除 Token
// =======================
const handleDelete = async (id: number, nickname: string) => {
  try {
    await adminMusicApi.deleteToken(id)
    message.success(`Token「${nickname}」删除成功`)
    await fetchTokens()
  } catch (e: any) {
    message.error(e?.response?.data?.message || '删除失败')
    console.error(e)
  }
}

// =======================
// 快速切换状态
// =======================
const handleToggleStatus = async (token: NeteaseToken) => {
  const newStatus = token.status === 1 ? 0 : 1
  try {
    await adminMusicApi.updateToken(token.id, { status: newStatus })
    message.success('状态已更新')
    await fetchTokens()
  } catch (e: any) {
    message.error(e?.response?.data?.message || '状态更新失败')
    console.error(e)
  }
}

// =======================
// 表格列配置
// =======================
const columns: DataTableColumns<NeteaseToken> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '昵称', key: 'nickname', width: 150 },
  {
    title: 'Cookie',
    key: 'cookie',
    width: 200,
    render: (row) => maskCookie(row.cookie)
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => {
      return h(
        NTag,
        {
          type: row.status === 1 ? 'success' : 'default',
          size: 'small',
          round: true
        },
        { default: () => (row.status === 1 ? '启用' : '禁用') }
      )
    }
  },
  {
    title: '快速切换',
    key: 'toggle',
    width: 100,
    render: (row) => {
      return h(NSwitch, {
        value: row.status === 1,
        'onUpdate:value': () => handleToggleStatus(row)
      })
    }
  },
  { title: '创建时间', key: 'createdAt', width: 180 },
  { title: '更新时间', key: 'updatedAt', width: 180 },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row) => {
      return h(
        NSpace,
        { size: 'small' },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                secondary: true,
                type: 'primary',
                onClick: () => openEditModal(row)
              },
              {
                icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
                default: () => '编辑'
              }
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDelete(row.id, row.nickname)
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    {
                      size: 'small',
                      secondary: true,
                      type: 'error'
                    },
                    {
                      icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
                      default: () => '删除'
                    }
                  ),
                default: () => `确定要删除 Token「${row.nickname}」吗？此操作不可恢复！`
              }
            )
          ]
        }
      )
    }
  }
]

// =======================
// 生命周期
// =======================
onMounted(() => {
  fetchTokens()
})
</script>

<template>
  <div class="page-container">
    <!-- 头部 -->
    <div class="header-section">
      <div>
        <h2 class="title">网易云音乐 Token 管理</h2>
        <p class="subtitle">管理网易云音乐 Cookie，用于代理音乐服务</p>
      </div>
      <n-button type="primary" size="large" @click="openAddModal">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        添加 Token
      </n-button>
    </div>

    <!-- Token 列表 -->
    <n-data-table
      :columns="columns"
      :data="tokens"
      :loading="loading"
      :bordered="false"
      :scroll-x="1200"
      class="data-table"
    />

    <!-- 添加/编辑弹窗 -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="modalTitle"
      :style="{ width: '600px', maxWidth: '92vw' }"
      :mask-closable="false"
    >
      <n-form label-placement="top" label-width="80">
        <n-form-item label="Cookie" required>
          <n-input
            v-model:value="formData.cookie"
            type="textarea"
            placeholder="请粘贴完整的网易云 Cookie&#10;示例：MUSIC_U=xxxxx; __csrf=yyyyy"
            :rows="6"
          />
        </n-form-item>

        <n-form-item label="昵称">
          <n-input
            v-model:value="formData.nickname"
            placeholder="如：主账号、备用账号"
          />
        </n-form-item>

        <n-form-item v-if="editingId" label="状态">
          <n-space align="center">
            <n-switch v-model:value="formData.status" :checked-value="1" :unchecked-value="0" />
            <span style="color: #666;">{{ formData.status === 1 ? '启用' : '禁用' }}</span>
          </n-space>
        </n-form-item>

        <!-- 帮助说明 -->
        <n-space vertical style="margin-top: 16px; padding: 12px; background: #f5f7fa; border-radius: 8px;">
          <div style="font-weight: 600; color: #333;">📖 如何获取网易云 Cookie？</div>
          <div style="color: #666; font-size: 13px; line-height: 1.6;">
            1. 登录网易云音乐网页版（music.163.com）<br>
            2. 按 F12 打开开发者工具<br>
            3. 切换到"网络"（Network）选项卡<br>
            4. 刷新页面，找到任意请求<br>
            5. 在请求头中找到 Cookie，复制完整内容
          </div>
        </n-space>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ editingId ? '保存' : '确定' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.data-table {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
</style>
