# astr-tui

AstrBot 的终端管理工作台，使用 Node.js、TypeScript、React 和 Ink，支持中英文界面。

本次适配以 2026-10-28 的 [AstrBot master `abf68307`](https://github.com/AstrBotDevs/AstrBot/commit/abf68307)（`4.29.3` 开发版）为基准。保留上游仍支持的旧版 Dashboard 接口，聊天历史分页与运行恢复接入 `/api/v1`；历史查询只在收到 HTTP 404 时回退旧接口。新版管理功能需要服务端提供对应接口，单个模块不可用时会显示错误，其余页面仍可使用。

## 从源码运行

需要 Node.js 20 或更新版本。

```bash
npm install
npm run build
node dist/cli/index.js --lang zh-CN --server http://localhost:6185
```

首次运行进入连接界面；输入框支持 Backspace 退格、Delete 向后删除、`Ctrl+U` 清空当前字段、`Ctrl+A` / `Ctrl+E` 跳到开头/末尾。新部署的 Dashboard 会要求确认密码后创建首个账户，已开启两步验证的账户会要求输入验证码或恢复码。已保存的登录过期时可重新登录：

```bash
node dist/cli/index.js login --server http://localhost:6185 --username astrbot
```

也可使用已发布的 npm 包：`npm install -g astr-tui`。源码中的新功能需要使用包含本次改动的构建。

服务器地址优先级：`--server` → `ASTR_TUI_SERVER` → `ASTRBOT_DASHBOARD_URL` → `DASHBOARD_URL` → 保存的配置 → `http://localhost:6185`。支持带反向代理前缀的地址，例如 `https://example.com/astrbot`。

## 功能和操作

`Tab` / `Shift+Tab` 切换主页面，方向键选择，`Enter` 执行或编辑，`Esc` 返回。窄终端的导航会跟随当前页面，中文和 Emoji 按终端显示宽度换行。编辑器外可用 `Ctrl+R` 刷新，`Ctrl+C` 退出。

- **聊天**：流式回复、思考过程、工具调用及结果、聊天运行恢复、历史分页、重命名、删除确认、停止回复。
- **状态与日志**：运行统计、模型使用情况、终端图表、实时日志及断线重连。
- **现有管理**：命令和工具开关、插件市场及配置、人格及文件夹、普通/系统配置、模型供应商和平台适配器。
- **管理页面**：定时任务、Skills、子代理、会话规则、知识库浏览和检索测试。

聊天输入框支持以下操作，其他消息按原样发送给 AstrBot。要向机器人发送同名命令，可多加一个斜杠：例如 `//help` 会将 `/help` 发给机器人。

| 操作 | 输入 |
| --- | --- |
| 查看帮助 | `/help` |
| 新建聊天 | `/new` |
| 重命名 | `/rename 新名称` |
| 删除聊天及历史 | `/delete` 后输入 `/delete confirm` |
| 停止回复 | `/stop` |
| 加载更早的历史 | `/older` |
| 刷新数据 | `/refresh` |
| 筛选/取消筛选聊天 | `/search 关键词` / `/search` |

切换聊天会断开本地订阅，服务端继续生成；返回时会尝试恢复仍在运行的回复。流意外中断时最多尝试恢复两次，不会重复发送用户消息。

进入「管理」后，左右键切换子页面，上下键选择，`r` 刷新当前页面：

| 子页面 | 操作 |
| --- | --- |
| 定时任务 | `a` 新建、`e` 编辑、`t` 启停、`x` 立即运行、`d` 删除；支持五段 cron 和一次性 ISO 日期时间 |
| Skills | `t` 启停、`d` 删除本地技能；插件和沙盒来源只读 |
| 子代理 | `Space` 开关、`a` 新建/编辑、`d` 移除、`s` 保存、`u` 丢弃草稿；切换主页面会保留草稿 |
| 会话规则 | `/` 搜索、`a` 新增/更新、`e` 编辑 JSON、`d` 删除 |
| 知识库 | `Enter` 浏览详情及文档、`/` 搜索文档、`f` 检索测试、`q` 返回 |

会话规则、知识库和文档列表使用 `n` / `p` 翻页；检索结果按页面提示浏览。删除操作需要再次确认。终端版覆盖常用管理流程，浏览器专用页面、媒体预览和完整 WebUI 编辑器仍使用 Dashboard。

## 认证存储

优先使用 `keytar` 连接系统密钥链；不可用时使用 `~/.astr-tui/tokens.json`。配置及文件令牌采用原子替换写入，POSIX 系统下新文件权限为 `0600`。令牌文件损坏会显示错误，不会直接覆盖原内容。

非交互登录可通过 `--password-stdin` 传入密码；两步验证使用 `login --code <验证码或恢复码>`。初次创建账户仍需要确认密码。

## 开发验证

```bash
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

测试包含接口契约、SSE 分块解析、本地真实 HTTP 传输、终端键盘交互及聊天切换时的并发保护。真实 AstrBot 实例的完整端到端验证需要可运行的服务端环境。
