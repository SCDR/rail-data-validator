# ARCHITECTURE

## 1. 分层概览

| 层级 | 技术 / 位置 | 作用 |
|------|-------------|------|
| 桌面包装 | Tauri 2.x (`src-tauri/`) | 提供原生窗口与系统能力（文件、对话框、上传、SQLite 等插件）。|
| 前端应用 | Umi Max + Ant Design Pro (`src/`) | 页面路由、运行时布局、权限、国际化、UI。|
| 业务功能 | `src/pages/*` | 数据采集、验证、历史、输出等模块目录。|
| 验证引擎 | `src/components/Validation/` | 规则定义与执行：列规则 + 行规则；统计错误。|
| 配置支持 | `config/*` | 路由、主题默认值、OpenAPI、代理、构建相关。|
