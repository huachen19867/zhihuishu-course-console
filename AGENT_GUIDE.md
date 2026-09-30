# 给 Agent 的使用说明

这份说明供用户自己的 Agent 在 Windows 上接手本项目。先读本文件、`README.md` 和 `TECHNICAL_LOG.md`，再检查 `config.example.json` 与当前脚本的实际参数；不要猜配置字段，也不要把旧的个人运行记录当作新用户配置。

## 先让用户看见控制台

开始任何自动操作前，必须主动打开并向用户展示项目的原生 Windows 控制台。推荐打开 `启动与停止/控制台.cmd`；也可以在项目目录运行 `powershell -NoProfile -STA -ExecutionPolicy Bypass -File .\control-panel.ps1`。确认窗口已经显示，再向用户说明当前连接状态和将要启动的功能。不得只启动隐藏的后台进程，也不得把用户看不到状态的后台运行当作完成。

控制台负责启动和停止视频照看或单元作业处理，并展示运行状态。任务运行时保持控制台可见；停止时使用对应停止按钮，并确认状态已经改变。用户关闭控制台不一定会停止后台任务，因此需要停止时应明确点停止并查看状态。

## 环境与用户准备

项目在 Windows 上运行，使用 Node.js、Playwright 和 Edge 的本机 CDP 调试连接。用户应使用项目提供的 Edge 启动方式，在自己的浏览器窗口登录智慧树并打开目标课程。视频照看需要课程页面；单元作业处理需要用户先打开该课程的作业列表。确认 CDP 地址可连接、页面确实属于用户预期的课程后，才可从控制台启动。

登录和账号凭据由用户本人管理。若页面出现人机验证，停止自动点击并在控制台显示等待状态，让用户亲自完成验证；验证消失后按程序状态继续。不要尝试自动识别、绕过或通过刷新规避人机验证。无法确认验证已解除时应暂停并告知用户。

新用户应先复制 `config.example.json` 为本地 `config.local.json`，填写自己的课程名称，并确认 `cdpUrl` 与 Edge 实际调试地址相同。courseUrl 可由本人当前页面取得，也可留空让程序按课程名称寻找已打开的视频页；空链接时应在控制台显示等待登录/进入课程，而不是宣称已播放。也可用 `COURSE_CONFIG` 环境变量指定其他配置文件。不要复用其他用户或示例中的课程链接。运行中的本地配置、浏览器配置目录和 `runtime` 数据可能含个人信息，不应提交到公开仓库。

## 配置答题模型

由用户或其 Agent 根据可用账号、已安装工具和用户偏好配置 `model`。支持 `agent-file`、`openai-compatible` 与可选的 `codex-cli`；国内 Agent 不需要安装 Codex。不要假定所有用户都有同一种登录、模型名称或 API 服务。

已有自己的 Agent 时，可选择 `agent-file` 并将 `timeoutMs` 设置为 300000。视频弹题请求在 `runtime/solver/request.json`，作业请求在 `runtime/homework/solver/request.json`。Agent 在任务期间检查这两个文件，按 `prompt` 与 `schema` 使用自己的模型答题，将 `{"requestId":"本次请求ID","result":{...符合schema的答案...}}` 写入同目录 `response.json`。先写临时文件再重命名，避免读到半份 JSON；必须保留本次 requestId，不可回复旧请求。程序只等待文件，不会自动唤醒 Agent，用户的 Agent 必须保持任务活动或使用其自身的调度能力。模型超时和错误应明确报告，不能反复提高置信度来绕过暂停。

示例：弹题 schema 要求 answer 时，result 可为 `{"answer":"A"}`；作业 schema 要求 answers 时，result 为 `{"answers":[{"index":0,"choices":["完整选项文字"],"confidence":0.9}]}`，实际结构以当前 request.json 为准。文件交接模式只需配置 `"provider":"agent-file"`，不要求 API key 或额外订阅。

```json
{
  "courseUrl": "https://example.invalid/course",
  "courseName": "请填写课程名称",
  "cdpUrl": "http://127.0.0.1:9222",
  "model": {
    "provider": "codex-cli",
    "name": "请填写当前账号可用的模型名",
    "reasoningEffort": "low",
    "cliPath": "",
    "baseUrl": "",
    "apiKeyEnv": "OPENAI_API_KEY",
    "timeoutMs": 120000
  }
}
```

使用 `codex-cli` 时，优先让程序自动查找本机 `codex` 命令；只有自动查找失败且用户提供了实际安装路径时，才填写 `cliPath`。不要写死某个 Codex 版本的个人安装路径。`name` 必须是该用户当前账号或 CLI 实际可用的模型名，`reasoningEffort` 和 `timeoutMs` 可按题目复杂度、响应速度及用户额度调整。

使用 `openai-compatible` 时，将 `baseUrl` 设为服务提供方的 API 根地址，并在 `apiKeyEnv` 填环境变量的名称；密钥本身只由用户设置在本机环境变量中。不得把密钥写入 JSON、源码、命令行参数、日志或截图。确认所选服务支持兼容的 Chat Completions 接口，再用用户允许的模型名称配置 `name`。

答题结果必须符合程序要求的 JSON Schema，并根据题干和选项内容匹配答案。选项可能在重载后换序，因此不能只记选项字母或位置。`lowConfidenceAction` 默认 `best-effort`：不确定时给出最可能的答案，如实标注较低confidence，程序继续并记录题号；设为 `stop` 时低于0.8暂停。不要人为提高confidence。模型输出无法解析、没有匹配选项、请求超时或页面内容不完整时仍应停止并显示原因，不提交不完整答案。模型答案可能出错，完成后应如实报告网站成绩。

## 状态、停止与数据边界

用控制台和 `runtime` 中的状态文件判断任务是否运行、等待验证、完成或报错。停止后先确认状态，不要通过强杀所有 Edge 或 Node 进程来代替项目停止按钮。需要排错时只查看必要日志，并对账号信息、课程链接、题目记录及令牌做脱敏。

Windows控制台读取status.json时共享读写权限，避免与watcher的状态更新互锁。watcher状态写入对常见短暂占用有限重试；持久失败仍记为异常并保留日志。

新版视频入口可能是 wisdom-mooc.zhihuishu.com/study/index。保留真实课程参数在本地配置，确认匹配同一课程。倍速必须使用网站按钮的正常鼠标操作，不能只修改媒体playbackRate或用脚本click模拟按钮；后两种做法可能导致进度不同步或网站拒绝。目录支持折叠章节、子视频及finish-icon完成标记。视频结束但完成未更新时仅普通刷新一次并正常补播；人机验证仍等待用户本人，不刷新规避。

新版AI随堂题提交后，前端可能重渲染并移除旧关闭按钮。关闭前重读题目fingerprint；弹窗消失或题目变化时结束本轮，针对同题最多重试3次。异常关闭前运行verification检查；人机验证时暂停。严格匹配已知videoConfigTip01提示，点击“好的”后返回主循环；未知模态仍提示用户查看。

公开项目时仅发布通用代码、示例配置和说明。不得加入用户的真实课程 ID 或 URL、成绩、认证令牌、API 密钥、浏览器个人资料或运行时数据。对新课程或新版本页面应先让用户查看控制台和页面状态，再从小范围任务验证配置是否适用。
