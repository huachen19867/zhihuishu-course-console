# 智慧树课程控制台

Windows 本地课程辅助工具，通过 Playwright 连接独立 Edge，无需扩展。原生控制台提供视频照看、单元作业的启动、停止和状态展示。视频保持1.5倍速静音，确认播放推进和完成标记后切换。模型可能答错，提交后未必可以修改，使用前确认用户授权与课程规则。

**用户的 Agent 必须先读 [给 Agent 的使用说明书](AGENT_GUIDE.md)，主动打开并向用户展示控制台，不能只启动隐藏后台。国内 Agent 不需要安装 Codex，可使用文件交接模式或兼容 API。**

## 安装与启动

需要 Windows、Edge、Node.js 22或更新版本。在项目目录执行：

```powershell
npm ci --ignore-scripts --no-audit --no-fund
Copy-Item config.example.json config.local.json
```

编辑本地配置的 courseName 与 courseUrl，填写本人课程名称和完整视频页面链接。cdpUrl 默认 http://127.0.0.1:9222；启动器读取其中的端口。可用 COURSE_CONFIG 环境变量指定配置文件绝对路径。本地配置已忽略。

双击 `启动与停止/控制台.cmd`，或运行 `powershell -NoProfile -STA -ExecutionPolicy Bypass -File .\control-panel.ps1`。视频点击启动后本人登录独立 Edge 并进入课程。单元作业需先在该 Edge 打开课程的作业列表，再点启动单元测试。单独打开 Edge 可运行 `powershell -NoProfile -ExecutionPolicy Bypass -File .\open-edge.ps1`。

保持电脑唤醒和浏览器打开。关闭控制台不会停止后台；停止自动操作不会关闭浏览器，也不保证暂停视频。停止按钮需等待当前操作或模型请求结束。推荐始终向用户展示控制台。

## 模型配置

视频和作业共用 model.cjs，可在 config.local.json 的 model 中配置 provider、name、reasoningEffort、cliPath、baseUrl、apiKeyEnv、timeoutMs，无需修改业务代码。

`agent-file` 适合已有国内 Agent 的用户，无需安装 Codex、购买额外 API 或交出账号。设置 `provider: "agent-file"` 与 `timeoutMs: 300000`。用户的 Agent 读取 runtime/solver/request.json（弹题）或 runtime/homework/solver/request.json（作业），按其中 prompt、schema 分析，再在相同目录写 response.json，格式为 `{"requestId":"复制本次请求ID","result":{...按schema填写...}}`。推荐先写临时文件再原子重命名。请求ID必须匹配；无人响应时超时停止，文件模式本身不会唤醒或远程联系 Agent。

`openai-compatible` 使用国内或其他兼容 Chat Completions 的 API，示例 model：

```json
{
  "provider": "openai-compatible",
  "name": "填写服务提供方支持的模型名称",
  "baseUrl": "https://api.openai.com/v1",
  "apiKeyEnv": "OPENAI_API_KEY",
  "timeoutMs": 90000
}
```

baseUrl 可替换为国内服务商提供的完整 API 根地址。密钥只放在 apiKeyEnv 指定的环境变量中，在控制台启动前设置。不要写进配置、源码或Git。服务必须支持 response_format 的 json_object 模式；不保证所有服务兼容。reasoningEffort 在API模式下不发送。模型返回后校验JSON、答案与选项；无效或超时停止，不猜题提交。

`codex-cli` 可选，使用本人登录的 [Codex CLI](https://github.com/openai/codex)。安装并 codex login 后，程序按 cliPath、CODEX_CLI_PATH、PATH 顺序寻找 CLI。name 留空使用默认模型，或填写账号实际可用的模型名称；reasoningEffort 默认 low，不支持时设为空字符串。默认使用官方 provider，baseUrl 留空；确需独立 Responses provider 时可填写根地址，这一模式仍使用 Codex 登录认证。CLI 调用忽略用户自定义配置，不修改全局配置，不固定个人版本目录。

每份作业集中请求一次，播放和点击由本地程序完成，已有弹题答案缓存复用。作业置信度低于0.8暂停；模型自报置信度不能保证正确率。仅处理标题包含单元测试的作业，不操作期末或线下考试。切换课程前应保留旧runtime备份并建立干净runtime，避免混入旧状态和成绩。

## 人机验证与故障

检测到可见验证组件或iframe后暂停点击，每五秒本地检查，连续两次消失后继续。需要本人验证，不识别或刷新规避。未知样式和操作瞬间出现的验证可能漏检并超时；人工处理后可重启，接续同一单元已保存答案。普通题干空白可兼容初始化并刷新；闭合shadow DOM题干通过CDP读取正常内容，不读取隐藏答案。

## 文件与验证

control-panel.ps1负责界面；start-watcher.ps1、start-homework.ps1与launcher.cjs负责后台启动，open-edge.ps1负责独立浏览器。watch-course.cjs、playback.cjs、detector.js负责视频；homework负责作业；config.cjs、read-config.ps1和model.cjs负责配置与模型。

runtime/status.json与runtime/homework/status.json分别记录状态；runtime/homework/results.json记录实际成绩。edge-control-profile保存登录资料。运行数据、个人配置、截图、归档和本地快捷方式不公开。

npm test 在独立无界面Edge中检查弹题、播放、验证和模型适配，不操作个人课程或调用付费模型。控制台可用 -SmokeTest 检查构建和状态。网站改版与真实验证仍有适配风险。技术经验见 [TECHNICAL_LOG.md](TECHNICAL_LOG.md)。复用 [Playwright](https://github.com/microsoft/playwright) 和 [Edge DevTools Protocol](https://learn.microsoft.com/en-us/microsoft-edge/devtools/protocol/)，尚未覆盖所有课程页面。
