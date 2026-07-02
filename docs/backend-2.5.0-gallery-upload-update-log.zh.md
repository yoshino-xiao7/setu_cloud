# 后端 2.5.0 图库投稿更新日志

## 摘要

后端 2.5.0 引入用户图库投稿链路，包含 OSS 直传、投稿状态跟踪和管理端审核。

## 核心变化

- 新增用户创建图库投稿批次。
- 新增 OSS 直传初始化和完成校验。
- 新增单图上传状态，支持中断后恢复或重试。
- 新增管理端投稿审核，审核后才进入公共图库。
- 公共图库记录扩展投稿来源元数据。

## 前端影响

前端上传页应先创建批次，再把文件直接上传到 OSS，随后上报每个条目的状态，并在所有必要文件上传完成后调用完成接口。管理端页面应支持审核批次，并展示清理或发布失败状态。

## 当前后续状态

后续后端已经增加可靠性改进、操作日志、不完整上传报告、重试流程和更完整的清理状态。实现细节请参考：

- `setu_api_full/docs/gallery-upload-frontend-integration.zh.md`
- `setu_api_full/docs/gallery-upload-integration-test.zh.md`
- `setu_api_full/docs/reliability-admin-workflow-frontend-integration.zh.md`
