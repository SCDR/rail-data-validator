# Trae AI 开发说明（data-validation-tauri）

本项目为 Umi Max + Ant Design Pro 前端，配合 Tauri 桌面壳。下面整理对 AI 编码代理最有用的工程知识与具体模式示例。

## 架构总览与关键目录
- 前端框架：`@umijs/max`（Ant Design Pro 布局与插件）
- 路由配置：`config/routes.ts`（含 `/data/collect`、`/data/validate` 等核心页面）
- 页面与数据流：
  - `src/pages/dataCollect/` 与 `src/pages/dataValidator/` 两套页面结构近似，均以表单状态 + 校验引擎驱动。
  - 表单通过 `Form.useForm()` 管理，步骤流由 `Steps` 控制，聚合统计用 `Statistic` 显示。
- 校验引擎：`src/components/Validation/`
  - `validator.ts` 提供 `DataValidator`（列/行规则注册、`validateRow`/`validateAll`、`getErrorStatistics`）。
  - `ruleConfig.ts` 提供 `RuleConfigurator.configureRailRules / configureHorizontalRules`，统一按列类型生成规则集。
- 运行时配置：
  - `src/app.tsx`（`getInitialState`、`layout`、`request` 等），`src/requestErrorConfig.ts`（统一错误拦截与表现）。
- PWA/离线：`src/service-worker.js`（Workbox 预缓存 + `networkFirst`），`src/global.tsx`（新版/离线提示与更新逻辑）。
- Tauri：`src-tauri/src/lib.rs`（最小化 builder，仅加载日志插件），`tauri.conf.json`（前端构建目录、devUrl、窗口配置）。当前未定义 `#[tauri::command]`。

## 开发、构建、测试、调试
- Web 开发：`npm start`（或 `pnpm start`），默认端口 `http://localhost:8000`。
- 生产预览：`npm run preview`（`max preview --port 8000`）。
- 前端构建：`npm run build`（产物在 `dist/`，Tauri 使用该目录）。
- Tauri 开发：`npx tauri dev`（依据 `tauri.conf.json` 触发 `pnpm dev` 并加载 `devUrl`）。
- Tauri 打包：`npx tauri build`（确保先完成前端构建）。
- 测试：`npm test`（Jest，环境注入见 `tests/setupTests.jsx`：`localStorage`、`Worker`、`matchMedia` 等 polyfill）。
- 代码检查：`npm run lint`、`npm run tsc`。
- 重要环境变量：`REACT_APP_ENV`（选择 `proxy.ts` 中不同代理）、`MOCK`（是否启用 mock）。

## 校验引擎使用示例（具体模式）
- 规则配置集中于 `RuleConfigurator`：
  ```ts
  import { DataValidator } from '@/components/Validation/validator';
  import { RuleConfigurator } from '@/components/Validation/ruleConfig';

  const validator = new DataValidator();
  RuleConfigurator.configureRailRules(validator, railsDistanceColumnTypes);
  const errors = validator.validateAll(gaugeData); // DataRow[]
  const stats = validator.getErrorStatistics(errors); // 按列聚合统计
  ```
- 页面典型调用（见 `src/pages/dataValidator/dataValidator.tsx`）：`validateRailData / validateHorizontalData / validateAll`，按列类型配置后分别进行数据集校验并更新统计。

## 项目特有约定与模式
- 列名与中文映射：页面中统一使用 `chMap` 映射（示例见 `dataValidator.tsx`），如 `ExtraCol1 -> '插入件1'`、`SlopeEndCol -> '坡尾'`；规则配置依据列类型（`ColumnType.number / text / hidden / custom`）。
- Rail 规则要点（`configureRailRules`）：
  - 数值范围 `RangeRule(-3, 6)`，类型 `TypeRule(number)`，和若干跨列规则：
  - 例如 `LessThanOrEqualRule(CheckIntervalCol, 48)`、`GreaterThanOrEqualRule(GuardDistanceCol, 91)`、`SumRangeRule(SwitchTipCol + SwitchHeelCol, [-3, 3])`。
- Horizontal 规则要点（`configureHorizontalRules`）：
  - 数值范围 `RangeRule(-9, 9)`，部分列要求为空 `RequiredEmptyRule`，以及 `TriangleDepressionRule`（按组合列校验下三角）。
- 错误统计：通过 `validator.getErrorStatistics(errors)` 获取每列错误计数，页面用 `Statistic`/`Tag` 显示。
- 请求拦截：`src/requestErrorConfig.ts`
  - 统一 `errorThrower`/`errorHandler`，支持 `opts.skipErrorHandler` 跳过全局处理。
  - 请求拦截器为所有 URL 追加 `?token=123`（示例逻辑）。
- PWA 缓存策略：`src/service-worker.js` 对 `/api/*` 与第三方资源采用 `networkFirst`；新版本通过 `postMessage('skip-waiting')` 触发更新并在 `global.tsx` 里提示。

## 集成点与通信
- 前端与后端：当前未发现 `window.__TAURI__.invoke` 或 `@tauri-apps/api/*` 调用；应用主要以前端校验与 UI 流程为主。
- 如需接入真实后端：参考 `src/app.tsx` 的 `request` 配置与 `src/services/ant-design-pro/api.ts` 的调用风格（`currentUser`、`login`、`rule` CRUD）。

## 关键文件速查
- `config/routes.ts`、`config/config.ts`（路由与 Umi 配置）
- `src/pages/dataCollect/*`、`src/pages/dataValidator/*`（核心页面与数据流）
- `src/components/Validation/{validator.ts, ruleConfig.ts}`（校验引擎）
- `src/app.tsx`、`src/requestErrorConfig.ts`（运行时与请求）
- `src/global.tsx`、`src/service-worker.js`（PWA 与更新提示）
- `src-tauri/src/lib.rs`、`tauri.conf.json`（Tauri 配置）