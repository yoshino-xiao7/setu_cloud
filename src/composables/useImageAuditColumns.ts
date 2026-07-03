import type { DataTableColumns } from 'naive-ui'
import type { ComputedRef, Ref } from 'vue'
import type { ImageAuditListDTO, ImageAuditScope, ImageAvailabilityStatus } from '@/api/admin'
import {
  CheckmarkCircleOutline,
  CloseCircleOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCheckbox,
  NIcon,
  NImage,
  NSpace,
  NTag,
} from 'naive-ui'
import { computed, h } from 'vue'
import { formatDateOnly } from '@/utils/dateFormat'

interface UseImageAuditColumnsOptions {
  allCurrentImagesSelected: ComputedRef<boolean>
  bulkAuditLoading: Ref<boolean>
  currentImagesIndeterminate: ComputedRef<boolean>
  getAvailabilityDetail: (row: ImageAuditListDTO) => string
  getAvailabilityMeta: (status?: ImageAvailabilityStatus | null) => {
    label: string
    type: 'default' | 'success' | 'warning' | 'error'
  }
  handlePass: (row: ImageAuditListDTO) => void
  handleRequestDelete: (pid: number, p: number) => void
  loading: Ref<boolean>
  openRejectModal: (row: ImageAuditListDTO) => void
  scope: Ref<ImageAuditScope>
  selectedImageIds: Ref<number[]>
  setImageSelected: (row: ImageAuditListDTO, checked: boolean) => void
  toggleCurrentImageSelection: (checked: boolean) => void
}

export function useImageAuditColumns(options: UseImageAuditColumnsOptions) {
  return computed<DataTableColumns<ImageAuditListDTO>>(() => [
    ...(options.scope.value !== 'ALL'
      ? [{
          title: () => h(NCheckbox, {
            checked: options.allCurrentImagesSelected.value,
            indeterminate: options.currentImagesIndeterminate.value,
            disabled: options.loading.value || options.bulkAuditLoading.value,
            onUpdateChecked: (checked: boolean) => options.toggleCurrentImageSelection(checked),
          }),
          key: 'selection',
          width: 48,
          render(row: ImageAuditListDTO) {
            return h(NCheckbox, {
              checked: options.selectedImageIds.value.includes(row.id),
              disabled: options.loading.value || options.bulkAuditLoading.value,
              onClick: (event: MouseEvent) => event.stopPropagation(),
              onUpdateChecked: (checked: boolean) => options.setImageSelected(row, checked),
            })
          },
        }]
      : []),
    {
      title: '缩略图',
      key: 'urlOriginal',
      width: 100,
      render(row) {
        return h(NImage, {
          width: 80,
          height: 80,
          src: row.urlOriginal,
          objectFit: 'cover',
          style: { borderRadius: '4px' },
          lazy: true,
          imgProps: {
            referrerpolicy: 'no-referrer',
            loading: 'lazy',
            decoding: 'async',
          },
          previewedImgProps: { style: { maxHeight: '90vh' } },
        })
      },
    },
    {
      title: '图片信息',
      key: 'info',
      width: 250,
      render(row) {
        return h(NSpace, { vertical: true, size: 4 }, {
          default: () => [
            h('div', `PID: ${row.pid}_p${row.p}`),
            h('div', { style: 'font-weight: 500' }, row.title),
            h('div', { style: 'color: #666; font-size: 12px' }, `作者: ${row.author}`),
            h('div', { style: 'color: #999; font-size: 12px' }, `${row.width}x${row.height} • ${row.ext.toUpperCase()}`),
            h(NButton, {
              size: 'tiny',
              text: true,
              type: 'primary',
              tag: 'a',
              href: row.urlOriginal,
              target: '_blank',
              style: 'margin-top: 4px; font-size: 12px;',
            }, { default: () => '查看原图链接' }),
          ],
        })
      },
    },
    {
      title: '类型',
      key: 'tags',
      width: 120,
      render(row) {
        return h(NSpace, { size: 4, vertical: true }, {
          default: () => [
            h(NTag, { type: row.r18 === 1 ? 'error' : 'success', size: 'small', bordered: false }, { default: () => row.r18 === 1 ? 'R18' : '全年龄' }),
            row.aiType === 2 ? h(NTag, { type: 'info', size: 'small', bordered: false }, { default: () => 'AI生成' }) : null,
          ],
        })
      },
    },
    {
      title: '可用性',
      key: 'availabilityStatus',
      width: 150,
      render(row) {
        const meta = options.getAvailabilityMeta(row.availabilityStatus)
        const detail = options.getAvailabilityDetail(row)
        return h(NSpace, { vertical: true, size: 4 }, {
          default: () => [
            h(NTag, { type: meta.type, size: 'small', bordered: false }, { default: () => meta.label }),
            detail ? h('div', { style: 'font-size: 12px; color: #94a3b8' }, detail) : null,
          ],
        })
      },
    },
    {
      title: '上次审核',
      key: 'lastAudit',
      width: 200,
      render(row) {
        if (!row.lastAuditTime)
          return h('span', { style: 'color: #ccc' }, '未审核')

        return h(NSpace, { vertical: true, size: 2 }, {
          default: () => [
            h(NTag, {
              type: row.lastAuditStatus === 1 ? 'success' : 'warning',
              size: 'small',
              bordered: false,
            }, {
              default: () => row.lastAuditStatus === 1 ? '正常' : '有问题',
            }),
            row.lastAuditRemark ? h('div', { style: 'font-size: 12px; color: #f59e0b; margin-top: 4px' }, `备注: ${row.lastAuditRemark}`) : null,
            h('div', { style: 'font-size: 12px; color: #999; margin-top: 4px' }, formatDateOnly(row.lastAuditTime)),
            h('div', { style: 'font-size: 12px; color: #ccc' }, row.lastAuditAdminEmail || ''),
          ],
        })
      },
    },
    {
      title: '上传时间',
      key: 'uploadDate',
      width: 120,
      render: row => formatDateOnly(row.uploadDate),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render(row) {
        if (options.scope.value === 'ALL') {
          return h(NButton, {
            size: 'tiny',
            type: 'error',
            tertiary: true,
            onClick: () => options.handleRequestDelete(row.pid, row.p),
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }), default: () => '申请删除' })
        }

        return h(NSpace, { size: 'small' }, {
          default: () => [
            h(NButton, {
              size: 'tiny',
              type: 'success',
              secondary: true,
              onClick: () => options.handlePass(row),
            }, { icon: () => h(NIcon, null, { default: () => h(CheckmarkCircleOutline) }), default: () => '正常' }),
            h(NButton, {
              size: 'tiny',
              type: 'warning',
              secondary: true,
              onClick: () => options.openRejectModal(row),
            }, { icon: () => h(NIcon, null, { default: () => h(CloseCircleOutline) }), default: () => '问题' }),
          ],
        })
      },
    },
  ])
}
