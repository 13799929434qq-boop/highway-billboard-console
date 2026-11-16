# 高速公路广告牌经营管理系统 · React 登录页

## 运行

建议 Node.js 22.12+。在本目录执行 `npm install`、`npm run dev`，访问终端显示的本地地址。`npm run build` 生成 dist；`npm run preview` 预览构建产物。原有 login.html 已保留为 login-legacy.html，以避免与 /login 路由冲突；新工程入口是 index.html。

技术栈：React 19、TypeScript、Vite、Tailwind CSS 4、shadcn/ui 风格的本地 Radix 基础组件、React Router、Zustand、TanStack Query、Axios、React Hook Form、Zod、Lucide React。基础组件按设计图定制，保留 components.json，支持继续用 shadcn CLI 扩展。

## 目录

- src/features/auth：页面、品牌区、登录表单、帮助弹窗、认证接口、登录 Hook、偏好状态。
- src/components/ui：可复用的 Button / Input / Checkbox / Dialog。
- src/styles.css：Tailwind 主题、响应式布局与页面组件样式。
- public/assets/highway-background.png：独立公路场景素材。
- tests：无头浏览器测试，模拟服务仅存在于测试内。

## 后端接入约定（待与后端确认）

复制 .env.example 为 .env.local，配置 VITE_API_BASE_URL（例如 /api）。留空时提交不会发送认证请求，也不会伪造登录成功。配置 VITE_SUPPORT_EMAIL 可显示实际支持邮箱。Vite 环境配置修改后需重启。

| 接口             | 约定                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| GET /auth/csrf   | 返回 `{ "token": "...", "headerName": "X-CSRF-TOKEN" }`                                          |
| POST /auth/login | JSON：username、password、rememberMe；携带 CSRF 请求头；成功返回 2xx 并设置 HttpOnly 会话 Cookie |
| GET /auth/me     | 返回 `{ "id": "字符串", "displayName": "姓名", "roles": ["LEADER"] }`；未登录返回 401            |

POST 成功后必须通过 /auth/me 校验才跳转 /workbench。工作台已接入角色页面，业务接口约定见文末。页面不实现真实权限控制；服务端必须验证所有业务请求的身份与权限。

rememberMe 由后端决定会话持久性和有效期；前端只持久化勾选偏好，不保存用户名、密码或认证令牌。Axios 携带 Cookie，跨域时由后端配置精确 CORS Origin、凭据许可和适当 Cookie 属性，生产环境使用 HTTPS。Spring Security 默认表单登录不是本页的 JSON 接口，需按上述契约适配；本项目没有修改或新建后端。

忘记密码与使用帮助显示操作指引；联系我们支持配置邮箱；系统公告明确显示尚未接入。没有虚构联系方式或公告。无需自主注册入口。

## 验证

`npx playwright install chromium` 后运行 `npm test`。测试以独立端口 5197 启动服务，禁止复用其他项目服务，并使用请求拦截覆盖失败、加载、重复提交、会话认证、弹窗和多尺寸布局。测试成功会话不属于运行时功能。截图输出 test-results。四组测试及生产构建已通过。

## 视觉与素材

依据用户提供的确定设计图，保留左品牌、四项能力、右登录卡片、蓝色主按钮、底部城市桥梁装饰。记住登录状态是按交互需求新增的轻量选项。布局使用 Grid/Flex，文字和控件均为独立元素；背景才使用绝对定位。小屏切换上下结构。

背景使用内置图像工具编辑参考图，移除界面、Logo、品牌文字、功能图标与登录卡片，补全场景，保存为 public/assets/highway-background.png。提示词：Extract a clean standalone photographic background; remove all interface elements; reconstruct continuous natural blue sky and highway landscape; preserve original billboard, highway, vehicles, mountain sunset composition; no UI or added text. 生成素材与原照片局部细节存在差异，正式原始背景可直接替换同名资源。Logo 与底部装饰是独立 SVG，未使用整张页面截图。

实现参考：[Tailwind Vite 安装](https://tailwindcss.com/docs/installation/using-vite)、[shadcn Vite 配置](https://ui.shadcn.com/docs/installation/vite)。

## 业务工作台（2026-11-04）

已新增四类角色共 37 个业务页面，统一采用左侧菜单。开发环境登录页提供“查看业务演示”入口。

- 领导：/preview/leader/L01，经营总览、数量、合同执行、实收及应收报表和只读详情。
- 运营档案：/preview/operations/O01，组织档案、资产档案、三类证件及历史版本、变动草稿、变更历史。
- 合同财务：/preview/finance/F01，客户及黑名单、合同草稿、年度租金、生效校验、年度应收、实收、手工分配、欠款、支出、发票。
- 系统管理员：/preview/admin/A01，账号、预置角色范围草稿、字典及日志。

演示数据只保存在本机浏览器，可通过“重置演示”恢复。业务演示日期固定为 2026-11-03，保证原型和测试口径一致。样例 2026 年应收 20 万元、对应已收 11 万元、未收 9 万元；另有 4 万元到账待分配。将其分别分配 2 万元至两张账单后，对应已收 15 万元、未收 5 万元。

生产构建默认关闭演示路由；仅需发布演示环境时设置 VITE_ENABLE_DEMO=true 后重新构建。真实登录路径 /workbench 已替换占位页，按会话角色请求业务数据；后端未接入时显示加载失败及重试，不自动切换演示数据。

### 尚未接入或待明确的部分

这是可运行的前端业务版本，不是已上线的完整后端系统。附件当前只登记文件名；正式环境禁止把新选文件名当作上传成功。密码重置未接身份服务，不生成假凭据。数据范围配置目前保存草稿，演示角色权限仍按固定职责执行。移位、拆除及合同解除只保留草稿，审批、退款和冲销规则需核定。证件、合同和报表尚需真实数据联调及最终逐页验收。

### 新增接口约定（待后端确认）

- GET /management/snapshot?role=leader|operations|finance|admin：返回 model.ts 中 datasetSchema 定义的集合；金额为分单位整数字符串。后端应先按身份与数据范围裁剪。
- POST /management/actions：请求 {type, values}，携带 /auth/csrf 返回的 CSRF 头。后端须独立校验授权、日期、金额、引用、租期占用，使用事务及幂等控制处理分配和生效；前端校验不能替代后端。
- 生产业务日期、文件上传/下载、账号邀请/密码重置、范围授权以及正式导出接口仍待接入。

Excel 导出为 SpreadsheetML .xls，内容为当前筛选全部结果；浏览器打印 / PDF 为当前页。图表通过 ECharts 渲染。37 个页面的可访问性、角色路由边界、桌面与手机布局、金额分配守恒与持久化、超额及跨客户拦截、最后管理员保护和原有登录流程均有自动检查。

